"""
Diagram crops for AI-imported questions.

The extraction call gives each question a rough figure box ("diagram_bbox": the page and a
box_2d on a 0-1000 grid) and marks figures that sit inside the text with image tags. Those
boxes come from a model that reads several pages while writing a long JSON answer, and they
are often off: the other column, a figure cut short, or a line of question text inside.

For every question this module:
  1. lists its figure slots: the main figure, each image tag in the question text, and each
     image tag inside an option;
  2. optionally asks Gemini again, one page at a time, for a tight box per slot;
  3. snaps every box to the ink on the page: trims margins, drops text cut by the box edge
     or standing apart from the drawing, takes in drawing strokes the box cut through, and
     completes a regular row/column of option figures when one of them was missed;
  4. crops, uploads and writes the URLs back. Image tags that cannot be filled are removed,
     so nobody sees a broken image.
"""
import asyncio
import io
import json
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
from PIL import Image

from utils.logger import get_logger
from ai_preview_importer.cloudinary_uploader import upload_image_to_cloudinary

logger = get_logger(__name__)

LOCATE_MODEL = "gemini-3.5-flash"
LOCATE_TIMEOUT_S = 45.0
RENDER_MAX_DIM = 2048
PAGE_CONCURRENCY = 6   # pages rendered, located and cropped at the same time
UPLOAD_CONCURRENCY = 8

IMAGE_TAG = re.compile(r'!\[([^\]]*)\]\(([^)\s]*)\)')

Box = Tuple[float, float, float, float]  # x0, y0, x1, y1 in pixels


def _is_url(target: str) -> bool:
    return target.startswith(('http://', 'https://', 'data:'))


def _option_text(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get('text') or '')
    return str(value or '')


def _unresolved_count(text: str) -> int:
    return sum(1 for m in IMAGE_TAG.finditer(text or '') if not _is_url(m.group(2)))


def _fill_tags(text: str, urls: Sequence[Optional[str]]) -> str:
    """Replace the unresolved image tags of `text`, in order, with `urls`; drop unfilled ones."""
    if not text:
        return text
    remaining = list(urls)

    def repl(match: re.Match) -> str:
        if _is_url(match.group(2)):
            return match.group(0)
        url = remaining.pop(0) if remaining else None
        return f"![image]({url})" if url else '\x00'

    out = IMAGE_TAG.sub(repl, text)
    out = re.sub(r'[ \t]*\x00[ \t]*', ' ', out)  # a dropped tag leaves one space, not two
    out = re.sub(r'[ \t]+\n', '\n', out)
    return re.sub(r'\n{3,}', '\n\n', out).strip()


def drop_unresolved_tags(question: Dict[str, Any]) -> None:
    """Remove image tags that point at nothing (e.g. an invented "image_4")."""
    for key in ('question', 'questionText', 'passageContent'):
        if isinstance(question.get(key), str) and _unresolved_count(question[key]):
            question[key] = _fill_tags(question[key], [])
    options = question.get('options')
    if isinstance(options, dict):
        for key, value in options.items():
            if isinstance(value, str) and _unresolved_count(value):
                options[key] = _fill_tags(value, [])
            elif isinstance(value, dict) and _unresolved_count(value.get('text') or ''):
                value['text'] = _fill_tags(value['text'], [])


# ── Page numbers ──────────────────────────────────────────────────────────────


def _bbox_items(raw: Any) -> List[Dict[str, Any]]:
    if isinstance(raw, dict):
        return [raw]
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    return []


def normalize_bbox_pages(questions: List[Dict[str, Any]], first_page: int, page_count: int) -> None:
    """
    Turn the page numbers of a batch's diagram boxes into 1-based document pages.

    A batch covers document pages first_page+1 .. first_page+page_count. The model is told to
    use the "--- PAGE N of M ---" labels (document pages), but sometimes counts from 1 within
    the batch. A number inside the batch's own range is taken as a document page; otherwise a
    number from 1..page_count is taken as batch-relative. A converted number lands inside the
    batch's range, so calling this again for the same batch changes nothing.
    """
    for q in questions:
        if not isinstance(q, dict):
            continue
        for item in _bbox_items(q.get('diagram_bbox')):
            try:
                page = int(item.get('page_number'))
            except (TypeError, ValueError):
                continue
            if not (first_page + 1 <= page <= first_page + page_count) and 1 <= page <= page_count:
                page += first_page
            item['page_number'] = page


def _clean_box(box: Any) -> Optional[List[float]]:
    """A box_2d [ymin, xmin, ymax, xmax] on the 0-1000 grid, or None when unusable."""
    if not isinstance(box, (list, tuple)) or len(box) != 4:
        return None
    try:
        y0, x0, y1, x1 = (min(1000.0, max(0.0, float(v))) for v in box)
    except (TypeError, ValueError):
        return None
    y0, y1 = min(y0, y1), max(y0, y1)
    x0, x1 = min(x0, x1), max(x0, x1)
    if y1 - y0 < 4 or x1 - x0 < 4:
        return None
    return [y0, x0, y1, x1]


def _bbox_hints(question: Dict[str, Any], total_pages: int) -> List[Tuple[int, List[float]]]:
    hints = []
    for item in _bbox_items(question.get('diagram_bbox')):
        try:
            page = int(item.get('page_number'))
        except (TypeError, ValueError):
            continue
        if not 1 <= page <= total_pages:
            continue
        raw = item.get('box_2d')
        boxes = raw if isinstance(raw, list) and raw and isinstance(raw[0], (list, tuple)) else [raw]
        for b in boxes:
            clean = _clean_box(b)
            if clean:
                hints.append((page, clean))
    return hints


# ── Slots ─────────────────────────────────────────────────────────────────────


@dataclass
class _Slot:
    kind: str                     # 'main' | 'text' | 'option'
    name: str                     # 'main', '1', '2', 'A', 'A2'
    option_key: Optional[str]
    page: int
    rough: List[List[float]]
    located: Optional[List[List[float]]] = None
    url: Optional[str] = None


@dataclass
class _Plan:
    question: Dict[str, Any]
    slots: List[_Slot] = field(default_factory=list)


def _plan_question(question: Dict[str, Any], total_pages: int) -> Optional[_Plan]:
    hints = _bbox_hints(question, total_pages)
    if not hints:
        return None
    page = hints[0][0]
    rough = [box for p, box in hints if p == page]
    plan = _Plan(question)

    for i in range(_unresolved_count(question.get('question') or '')):
        plan.slots.append(_Slot('text', str(i + 1), None, page, rough))
    options = question.get('options')
    if isinstance(options, dict):
        for key in sorted(options.keys()):
            for j in range(_unresolved_count(_option_text(options[key]))):
                name = str(key) if j == 0 else f"{key}{j + 1}"
                plan.slots.append(_Slot('option', name, str(key), page, rough))
    if not question.get('image') and not any(s.kind == 'text' for s in plan.slots):
        plan.slots.append(_Slot('main', 'main', None, page, rough))
    return plan if plan.slots else None


# ── Page rendering ────────────────────────────────────────────────────────────


def _render_source(source: Dict[str, Any]) -> Optional[Image.Image]:
    try:
        if source.get('type') == 'pdf':
            import fitz
            doc = fitz.open(stream=source['content'], filetype='pdf')
            try:
                page = doc[source['page_idx']]
                rect = page.rect
                scale = min(RENDER_MAX_DIM / rect.width, RENDER_MAX_DIM / rect.height, 300 / 72)
                pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                return Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
            finally:
                doc.close()
        from ai_preview_importer.pdf_vision_pipeline import convert_image_to_bytes
        return Image.open(io.BytesIO(convert_image_to_bytes(source['content']))).convert('RGB')
    except Exception as e:
        logger.error(f"Could not render page for diagram crops: {e}")
        return None


# ── Ink analysis ──────────────────────────────────────────────────────────────


def _box_area(b: Sequence[float]) -> float:
    return max(1.0, (b[2] - b[0]) * (b[3] - b[1]))


def _inter_area(a: Sequence[float], b: Sequence[float]) -> float:
    w = min(a[2], b[2]) - max(a[0], b[0])
    h = min(a[3], b[3]) - max(a[1], b[1])
    return w * h if w > 0 and h > 0 else 0.0


def _union(boxes: Sequence[Sequence[float]]) -> Box:
    return (min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes))


def _gap(a: Sequence[float], b: Sequence[float]) -> float:
    dx = max(0.0, b[0] - a[2], a[0] - b[2])
    dy = max(0.0, b[1] - a[3], a[1] - b[3])
    return max(dx, dy)


@dataclass(eq=False)
class _Cluster:
    members: np.ndarray
    box: Box
    substantial: bool


class PageInk:
    """
    Connected ink components of one page image, split into text-sized glyphs and drawing
    strokes, with the drawing strokes grouped into clusters (one drawing is usually one
    cluster). `ok` is False for photo-like pages, where this analysis is not trusted.
    """

    def __init__(self, image: Image.Image):
        gray = np.asarray(image.convert('L'), dtype=np.uint8)
        self.height, self.width = gray.shape
        self.char_h = max(10.0, self.height * 0.011)
        self.clusters: List[_Cluster] = []
        self.ok = False
        # Printed pages, scans and screenshots are mostly white. Phone photos (grey paper,
        # shadows, ruled lines) are not, and their ink would mislead the snapping.
        if float((gray > 215).mean()) < 0.72:
            return
        try:
            self._analyse(gray)
        except Exception as e:  # never lose a crop over the analysis: fall back to plain boxes
            logger.warning(f"Ink analysis failed, using plain crops: {e}")
            self.ok = False

    def _analyse(self, gray: np.ndarray) -> None:
        import cv2
        otsu, _ = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        ink = (gray < min(max(otsu, 110), 200)).astype(np.uint8)
        _, _, stats, _ = cv2.connectedComponentsWithStats(ink, connectivity=8)
        stats = stats[1:]
        stats = stats[stats[:, 4] >= 3]
        if len(stats) < 5:
            return
        x, y, w, h, area = (stats[:, i].astype(np.float64) for i in range(5))
        glyph = (h >= 4) & (h <= self.height * 0.05) & (w <= h * 3)
        if glyph.sum() >= 15:
            self.char_h = float(np.percentile(h[glyph], 70))
        ch = self.char_h
        density = area / np.maximum(w * h, 1.0)
        longest = np.maximum(w, h)
        # Column rules and page borders are layout, not figures.
        layout = (h > self.height * 0.3) | (w > self.width * 0.55)
        # Drawing strokes: taller than a text line, long and low (bonds, wires, axes, arrows
        # 3.5+ characters long; printed letters do not join up that far), or long and sparse.
        graphic = (
            (h >= 1.9 * ch)
            | ((w >= 3.5 * ch) & (h <= 1.6 * ch))
            | (w >= 5 * ch)
            | ((longest >= 2.2 * ch) & (density < 0.15))
        ) & ~layout
        self.box = np.stack([x, y, x + w, y + h], axis=1)
        self.graphic = graphic
        self.text = ~graphic & ~layout
        self.clusters = self._cluster_graphics()
        self.ok = True

    def _cluster_graphics(self) -> List[_Cluster]:
        idx = np.nonzero(self.graphic)[0]
        if len(idx) == 0:
            return []
        boxes = self.box[idx]
        gap = 1.2 * self.char_h
        parent = list(range(len(idx)))

        def find(a: int) -> int:
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a

        for i in range(len(idx)):
            dx = np.maximum(0, np.maximum(boxes[:, 0] - boxes[i, 2], boxes[i, 0] - boxes[:, 2]))
            dy = np.maximum(0, np.maximum(boxes[:, 1] - boxes[i, 3], boxes[i, 1] - boxes[:, 3]))
            for j in np.nonzero((dx <= gap) & (dy <= gap))[0]:
                ri, rj = find(i), find(int(j))
                if ri != rj:
                    parent[rj] = ri
        groups: Dict[int, List[int]] = {}
        for i in range(len(idx)):
            groups.setdefault(find(i), []).append(int(idx[i]))
        clusters = []
        for members in groups.values():
            m = np.array(members)
            b = self.box[m]
            bb = (float(b[:, 0].min()), float(b[:, 1].min()), float(b[:, 2].max()), float(b[:, 3].max()))
            w, h = bb[2] - bb[0], bb[3] - bb[1]
            substantial = max(w, h) >= 3 * self.char_h and min(w, h) >= 1.0 * self.char_h
            clusters.append(_Cluster(m, bb, substantial))
        return clusters

    # -- selection ---------------------------------------------------------

    def _clusters_in(self, box: Box) -> List[_Cluster]:
        barea = _box_area(box)
        out = []
        for c in self.clusters:
            inter = _inter_area(c.box, box)
            if inter > 0 and (inter / _box_area(c.box) >= 0.25 or inter / barea >= 0.25):
                out.append(c)
        return out

    def _siblings(self, chosen: List[_Cluster]) -> List[_Cluster]:
        """Complete a regular column or row of drawings (option graphs (1)-(4)) the box cut short."""
        subs = [c for c in chosen if c.substantial]
        if len(subs) < 2:
            return chosen
        out = list(chosen)
        for axis in (1, 0):  # 1: stacked vertically, 0: side by side
            other = 1 - axis
            seq = sorted(subs, key=lambda c: c.box[axis])
            aligned = all(
                min(a.box[other + 2], b.box[other + 2]) - max(a.box[other], b.box[other])
                >= 0.5 * min(a.box[other + 2] - a.box[other], b.box[other + 2] - b.box[other])
                and b.box[axis] >= a.box[axis + 2] - 0.2 * self.char_h
                for a, b in zip(seq, seq[1:])
            )
            if not aligned:
                continue
            pitches = [b.box[axis] - a.box[axis] for a, b in zip(seq, seq[1:])]
            if min(pitches) <= 0 or max(pitches) > 1.5 * min(pitches):
                continue
            pitch = sum(pitches) / len(pitches)
            size = sum(c.box[axis + 2] - c.box[axis] for c in seq) / len(seq)
            cross = sum(c.box[other + 2] - c.box[other] for c in seq) / len(seq)
            for _ in range(3):
                added = False
                for c in self.clusters:
                    if c in out or not c.substantial:
                        continue
                    c_size = c.box[axis + 2] - c.box[axis]
                    c_cross = c.box[other + 2] - c.box[other]
                    if not (0.5 * size <= c_size <= 2 * size and 0.5 * cross <= c_cross <= 2 * cross):
                        continue
                    for ref, sign in ((seq[-1], 1), (seq[0], -1)):
                        step = (c.box[axis] - ref.box[axis]) * sign
                        overlap = min(c.box[other + 2], ref.box[other + 2]) - max(c.box[other], ref.box[other])
                        if 0.6 * pitch <= step <= 1.4 * pitch and overlap >= 0.5 * min(c_cross, ref.box[other + 2] - ref.box[other]):
                            out.append(c)
                            seq = sorted(seq + [c], key=lambda k: k.box[axis])
                            added = True
                            break
                if not added:
                    break
            if len(out) > len(chosen):
                return out
        return out

    def _region(self, chosen: List[_Cluster], box: Box, strict: bool = False) -> Box:
        """
        Tight box around the chosen drawings plus the labels that belong to them: text mostly
        inside `box` or inside the drawing, and glyphs touching the strokes. `strict` is for a
        box that may be sloppy: text standing apart from the drawing is then dropped more readily.
        """
        ch = self.char_h
        members = np.concatenate([c.members for c in chosen])
        gb = self.box[members]
        core = (float(gb[:, 0].min()), float(gb[:, 1].min()), float(gb[:, 2].max()), float(gb[:, 3].max()))

        reach = _union([core, box])
        reach = (reach[0] - 2 * ch, reach[1] - 2 * ch, reach[2] + 2 * ch, reach[3] + 2 * ch)
        tb_all = self.box

        def text_within(r: Box) -> np.ndarray:
            return self.text & (tb_all[:, 2] > r[0]) & (tb_all[:, 0] < r[2]) & (tb_all[:, 3] > r[1]) & (tb_all[:, 1] < r[3])

        t_idx = np.nonzero(text_within(reach))[0]
        # Whole lines of text around the figure, to tell a sentence from a label.
        context = [int(i) for i in np.nonzero(text_within((reach[0] - 10 * ch, reach[1], reach[2] + 10 * ch, reach[3])))[0]]
        kept: List[int] = []
        if len(t_idx):
            tb = tb_all[t_idx]
            t_area = np.maximum((tb[:, 2] - tb[:, 0]) * (tb[:, 3] - tb[:, 1]), 1.0)

            def frac_inside(b: Box) -> np.ndarray:
                w = np.clip(np.minimum(tb[:, 2], b[2]) - np.maximum(tb[:, 0], b[0]), 0, None)
                h = np.clip(np.minimum(tb[:, 3], b[3]) - np.maximum(tb[:, 1], b[1]), 0, None)
                return (w * h) / t_area

            def gaps_to(boxes: np.ndarray) -> np.ndarray:
                dx = np.maximum(0, np.maximum(boxes[None, :, 0] - tb[:, None, 2], tb[:, None, 0] - boxes[None, :, 2]))
                dy = np.maximum(0, np.maximum(boxes[None, :, 1] - tb[:, None, 3], tb[:, None, 1] - boxes[None, :, 3]))
                return np.maximum(dx, dy).min(axis=1)

            in_core = frac_inside(core) >= 0.5
            attached = gaps_to(gb) <= 0.45 * ch
            keep = (frac_inside(box) >= 0.5) | in_core | attached
            pos = {int(g): k for k, g in enumerate(t_idx)}
            nearby = [int(i) for i in t_idx]
            # A short phrase touching a stroke is a label: keep it whole ("Major Product (P)").
            label = np.zeros(len(t_idx), dtype=bool)
            for run in self._runs(nearby, 0.8 * ch):
                if any(attached[pos[i]] for i in run):
                    r = _union([self.box[i] for i in run])
                    if r[2] - r[0] <= 12 * ch:
                        label[[pos[i] for i in run]] = True
            keep |= label
            # Atom labels are groups of touching glyphs ("=C=O", "COOH"): follow them to the
            # end, but never across a word space.
            for _ in range(12):
                grow = ~keep & (gaps_to(tb[keep]) <= 0.33 * ch) if keep.any() else None
                if grow is None or not grow.any():
                    break
                keep |= grow
            # A sentence beside the drawing that mostly lies outside the box and only runs in
            # across its edge is question text; a label the box merely clipped is not.
            for line in self._runs(context, 1.6 * ch):
                r = _union([self.box[i] for i in line])
                beside = r[2] <= core[0] or r[0] >= core[2]
                inside = max(0.0, min(r[2], box[2]) - max(r[0], box[0])) / max(1.0, r[2] - r[0])
                if beside and r[2] - r[0] >= 6 * ch and inside < 0.5:
                    for i in line:
                        k = pos.get(i)
                        if k is not None and not label[k] and not in_core[k]:
                            keep[k] = False
            # Short captions right under or over the drawing: "(X)", "(a)", "Fig. 2". Joined
            # across wide gaps, so a word from a sentence never passes for a caption.
            for run in self._runs([int(i) for i in t_idx[~keep]], 1.6 * ch):
                r = _union([self.box[i] for i in run])
                centre = (r[0] + r[2]) / 2
                below = 0 <= r[1] - core[3] <= 1.3 * ch
                above = 0 <= core[1] - r[3] <= 1.0 * ch
                if r[2] - r[0] <= 4 * ch and core[0] <= centre <= core[2] and (below or above):
                    keep |= np.isin(t_idx, run)
            kept = [int(i) for i in t_idx[keep]]
            kept = self._drop_detached_text(kept, context, core, strict)

        boxes = [tuple(b) for b in gb]
        boxes += [tuple(self.box[i]) for i in kept]
        region = _union(boxes)
        pad = max(4.0, round(0.35 * ch))
        return (max(0.0, region[0] - pad), max(0.0, region[1] - pad),
                min(float(self.width), region[2] + pad), min(float(self.height), region[3] + pad))

    def _runs(self, glyphs: List[int], max_gap: float) -> List[List[int]]:
        """Join glyphs into horizontal runs (words, phrases) across gaps up to `max_gap`."""
        runs: List[List[int]] = []
        extents: List[List[float]] = []
        for i in sorted(glyphs, key=lambda k: self.box[k][0]):
            b = self.box[i]
            for run, ext in zip(runs, extents):
                overlap = min(ext[3], b[3]) - max(ext[1], b[1])
                if overlap >= 0.5 * min(b[3] - b[1], ext[3] - ext[1]) and b[0] - ext[2] <= max_gap:
                    run.append(i)
                    ext[1], ext[2], ext[3] = min(ext[1], b[1]), max(ext[2], b[2]), max(ext[3], b[3])
                    break
            else:
                runs.append([i])
                extents.append([float(b[0]), float(b[1]), float(b[2]), float(b[3])])
        return runs

    def _drop_detached_text(self, kept: List[int], nearby: List[int], core: Box, strict: bool) -> List[int]:
        """
        Drop kept text that belongs to a line of question or option text above or below the drawing.

        Lines are built from all nearby glyphs, joined across word spaces (including the wide
        ones of justified text), so a stray glyph of a sentence is judged by the whole sentence,
        while separate labels ("a  b  c  d", "OH  NH2") and reaction conditions stay short.
        A long line, or one running past the drawing's sides, is text. With a `strict` (possibly
        sloppy) box, anything standing well apart above or below the drawing goes as well.
        """
        ch = self.char_h
        kept_set = set(kept)
        dropped: set = set()
        for run in self._runs(nearby, 1.6 * ch):
            mine = [i for i in run if i in kept_set]
            if not mine:
                continue
            ext = _union([self.box[i] for i in run])
            width = ext[2] - ext[0]
            above = ext[3] <= core[1] + 0.25 * ch
            below = ext[1] >= core[3] - 0.25 * ch
            if not (above or below):
                continue
            gap = (core[1] - ext[3]) if above else (ext[1] - core[3])
            overhang = max(core[0] - ext[0], ext[2] - core[2])
            if (strict and gap >= 1.5 * ch) or (
                width >= 5 * ch and (width >= 12 * ch or overhang >= 1.0 * ch or (strict and gap >= 0.9 * ch))
            ):
                dropped.update(mine)
        return [i for i in kept if i not in dropped]

    # -- public ------------------------------------------------------------

    def snap(self, box: Box, *, siblings: bool = False, strict: bool = False) -> Optional[Box]:
        """The figure inside `box`, snapped to its ink. None when the box holds no drawing."""
        chosen = self._clusters_in(box)
        if not any(c.substantial for c in chosen):
            return None
        if siblings:
            chosen = self._siblings(chosen)
        return self._region(chosen, box, strict)

    def find_in_band(self, box: Box) -> Optional[Box]:
        """
        The box missed every drawing (typically the wrong column). Look across the page at the
        same height; use a drawing only when exactly one fits. Its labels are searched in the
        box's height band, running to the right of the drawing (reaction conditions, products).
        """
        cands = [c for c in self.clusters if c.substantial
                 and min(box[3], c.box[3]) - max(box[1], c.box[1]) >= 0.5 * (c.box[3] - c.box[1])]
        if not cands:
            return None
        groups: List[List[_Cluster]] = []
        for c in sorted(cands, key=lambda k: k.box[0]):
            if groups and _gap(_union([g.box for g in groups[-1]]), c.box) <= 2 * self.char_h:
                groups[-1].append(c)
            else:
                groups.append([c])
        if len(groups) != 1:
            return None
        g = _union([c.box for c in groups[0]])
        ch = self.char_h
        reach = (g[0] - ch, min(box[1], g[1]) - 1.5 * ch,
                 min(float(self.width), g[2] + max(10 * ch, 0.3 * (g[2] - g[0]))), max(box[3], g[3]) + 1.5 * ch)
        return self._region(groups[0], reach)

    def split(self, box: Box, count: int) -> List[Box]:
        """Up to `count` separate drawings inside one box, in reading order."""
        chosen = self._clusters_in(box)
        subs = [c for c in chosen if c.substantial]
        if not subs:
            return []
        groups = [[c] for c in subs]
        for c in chosen:
            if not c.substantial:
                nearest = min(groups, key=lambda g: _gap(_union([k.box for k in g]), c.box))
                nearest.append(c)
        while len(groups) > count:
            best = None
            for i in range(len(groups)):
                for j in range(i + 1, len(groups)):
                    d = _gap(_union([k.box for k in groups[i]]), _union([k.box for k in groups[j]]))
                    if best is None or d < best[0]:
                        best = (d, i, j)
            _, i, j = best
            groups[i].extend(groups.pop(j))
        pad = 1.2 * self.char_h  # reaches captions such as "(X)" under a structure
        regions = []
        for g in groups:
            u = _union([k.box for k in g])
            regions.append(self._region(g, (u[0] - pad, u[1] - pad, u[2] + pad, u[3] + pad)))
        row = 3 * self.char_h
        return sorted(regions, key=lambda r: (round(((r[1] + r[3]) / 2) / row), r[0]))

    def trim(self, box: Box) -> Box:
        """Shrink a box to the ink inside it (plain crops of photos keep their box)."""
        if not self.ok:
            return box
        x0, y0, x1, y1 = (int(round(v)) for v in box)
        inside = (self.box[:, 0] >= x0) & (self.box[:, 1] >= y0) & (self.box[:, 2] <= x1) & (self.box[:, 3] <= y1)
        if not inside.any():
            return box
        b = self.box[inside]
        pad = max(4.0, round(0.35 * self.char_h))
        return (max(0.0, b[:, 0].min() - pad), max(0.0, b[:, 1].min() - pad),
                min(float(self.width), b[:, 2].max() + pad), min(float(self.height), b[:, 3].max() + pad))


def _to_px(box_2d: Sequence[float], width: int, height: int) -> Box:
    y0, x0, y1, x1 = box_2d
    return (x0 * width / 1000.0, y0 * height / 1000.0, x1 * width / 1000.0, y1 * height / 1000.0)


def _pad_px(box: Box, width: int, height: int, pad: float) -> Box:
    return (max(0.0, box[0] - pad), max(0.0, box[1] - pad), min(float(width), box[2] + pad), min(float(height), box[3] + pad))


# ── Focused localisation (one Gemini call per page) ───────────────────────────

LOCATE_PROMPT = """You are looking at ONE page of an exam paper. Find the exact position of the figures that belong to the questions listed below.

A figure is a drawing or picture: a graph or plot, circuit, diagram, chemical structure, reaction scheme drawn with structures, geometric figure, apparatus, map or photo. Printed sentences, formulas typed on a line and plain text tables are NOT figures.

Slots:
- "main": the figure(s) of the question. When the options are drawings too (for example graphs labelled (1), (2), (3), (4)), include every one of them. Return a list of boxes, one per separate figure group, in reading order.
- "1", "2", ...: the figure printed at [FIGURE n] in the question text. Exactly one box.
- "A", "B", "C", "D" (and "A2" ...): the drawing that is that option. Exactly one box.

Every box:
- box_2d = [ymin, xmin, ymax, xmax], integers from 0 to 1000 relative to this page image (0,0 is the top-left corner, 1000,1000 the bottom-right corner).
- Tight around the drawing but complete: axes, arrows, atom and point labels, reaction conditions written along arrows, and captions such as "(X)", "(a)" or "(1)" printed right next to the drawing.
- Must NOT contain question text, option text, "Ans." or "Sol." lines, or anything that belongs to another question.
- Never use a figure printed inside a solution, hint or explanation.
- On a two-column page a question's figures are in the same column as its text.
- If a slot's figure is not on this page, use null.

Questions on this page:
{questions}

Return ONLY JSON, for example:
{{"q1": {{"main": [[120, 80, 410, 470]]}}, "q2": {{"1": [520, 560, 600, 700], "2": [640, 560, 690, 650]}}}}
"""


def _describe_question(key: str, plan: _Plan) -> str:
    q = plan.question
    counter = iter(range(1, 1000))

    def mark_text(m: re.Match) -> str:
        return '[picture]' if _is_url(m.group(2)) else f'[FIGURE {next(counter)}]'

    text = ' '.join(IMAGE_TAG.sub(mark_text, q.get('question') or '').split())
    if len(text) > 320:
        cut = text[:320]
        missing = [m for m in re.findall(r'\[FIGURE \d+\]', text[320:])]
        text = cut + ' …' + (' ' + ' '.join(missing) if missing else '')

    option_parts = []
    options = q.get('options')
    if isinstance(options, dict):
        for opt_key in sorted(options.keys()):
            n = iter(range(1, 1000))

            def mark_option(m: re.Match, k: str = str(opt_key)) -> str:
                if _is_url(m.group(2)):
                    return '[picture]'
                i = next(n)
                return f'[FIGURE {k}]' if i == 1 else f'[FIGURE {k}{i}]'

            value = ' '.join(IMAGE_TAG.sub(mark_option, _option_text(options[opt_key])).split())
            option_parts.append(f"({opt_key}) {value[:70]}")
    slots = ', '.join(s.name for s in plan.slots)
    lines = [f'- "{key}": {text}']
    if option_parts:
        lines.append('  options: ' + '  '.join(option_parts))
    lines.append(f'  slots: {slots}')
    return '\n'.join(lines)


def _parse_located(value: Any) -> List[List[float]]:
    if value is None:
        return []
    if isinstance(value, dict):
        return _parse_located(value.get('box_2d'))
    if isinstance(value, (list, tuple)):
        if len(value) == 4 and all(isinstance(v, (int, float)) for v in value):
            clean = _clean_box(value)
            return [clean] if clean else []
        out: List[List[float]] = []
        for item in value:
            out.extend(_parse_located(item))
        return out
    return []


async def _locate_page(image: Image.Image, entries: List[Tuple[str, _Plan]]) -> Dict[str, Dict[str, List[List[float]]]]:
    from google.genai import types
    from ai_preview_importer.pdf_vision_pipeline import client
    if not client:
        return {}
    prompt = LOCATE_PROMPT.format(questions='\n'.join(_describe_question(k, p) for k, p in entries))
    buf = io.BytesIO()
    image.save(buf, format='JPEG', quality=88)
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.models.generate_content,
                model=LOCATE_MODEL,
                contents=[prompt, types.Part.from_bytes(data=buf.getvalue(), mime_type='image/jpeg')],
                config=types.GenerateContentConfig(temperature=0.0, response_mime_type='application/json'),
            ),
            timeout=LOCATE_TIMEOUT_S,
        )
        raw = (response.text or '').strip()
        if raw.startswith('```'):
            raw = raw.split('\n', 1)[1] if '\n' in raw else raw[3:]
            raw = raw.rsplit('```', 1)[0]
        data = json.loads(raw)
    except Exception as e:
        logger.warning(f"Figure localisation call failed, using the extraction boxes: {e}")
        return {}
    if not isinstance(data, dict):
        return {}
    out: Dict[str, Dict[str, List[List[float]]]] = {}
    for key, slots in data.items():
        if isinstance(slots, dict):
            out[str(key)] = {str(name): _parse_located(v) for name, v in slots.items()}
    return out


# ── Cropping ──────────────────────────────────────────────────────────────────


def _resolve_boxes(plan: _Plan, ink: PageInk, image: Image.Image) -> Dict[str, List[Box]]:
    """Final pixel boxes per slot name."""
    w, h = image.size
    out: Dict[str, List[Box]] = {}
    has_option_slots = any(s.kind == 'option' for s in plan.slots)

    def snap(box_2d: Sequence[float], *, trusted: bool, siblings: bool) -> Optional[Box]:
        px = _to_px(box_2d, w, h)
        if not ink.ok:
            return _pad_px(px, w, h, 12)
        snapped = ink.snap(px, siblings=siblings, strict=not trusted)
        if snapped:
            return snapped
        if not trusted:
            found = ink.find_in_band(px)
            if found:
                return found
        # No drawing recognised in the box: keep the model's box, minus blank margins.
        return ink.trim(_pad_px(px, w, h, 0.5 * ink.char_h))

    # Slots the focused call located.
    pending: List[_Slot] = []
    for slot in plan.slots:
        if slot.located:
            boxes = [snap(b, trusted=True, siblings=slot.kind == 'main' and not has_option_slots) for b in slot.located]
            out[slot.name] = [b for b in boxes if b]
        else:
            pending.append(slot)

    # The rest falls back to the extraction's rough box(es).
    main = [s for s in pending if s.kind == 'main']
    inline = [s for s in pending if s.kind != 'main']
    for slot in main:
        boxes = [snap(b, trusted=False, siblings=not has_option_slots) for b in slot.rough]
        out[slot.name] = [b for b in boxes if b]
    if inline and inline[0].rough:
        union = _union([_to_px(b, w, h) for b in inline[0].rough])
        pieces = ink.split(union, len(inline)) if ink.ok else []
        if not pieces and len(inline) == 1:
            single = snap(inline[0].rough[0], trusted=False, siblings=False)
            pieces = [single] if single else []
        for slot, piece in zip(inline, pieces):
            out[slot.name] = [piece]
    return out


def _crop_png(image: Image.Image, boxes: List[Box]) -> Optional[bytes]:
    crops = []
    for b in boxes:
        x0, y0, x1, y1 = (int(round(v)) for v in b)
        if x1 - x0 < 10 or y1 - y0 < 10:
            continue
        crops.append(image.crop((x0, y0, x1, y1)))
    if not crops:
        return None
    if len(crops) == 1:
        out = crops[0]
    else:
        gap = 16
        width = max(c.width for c in crops)
        height = sum(c.height for c in crops) + gap * (len(crops) - 1)
        out = Image.new('RGB', (width, height), 'white')
        y = 0
        for c in crops:
            out.paste(c, (0, y))
            y += c.height + gap
    buf = io.BytesIO()
    out.save(buf, format='PNG', optimize=True)
    return buf.getvalue()


def _apply(plan: _Plan) -> None:
    q = plan.question
    by_kind: Dict[str, List[_Slot]] = {}
    for slot in plan.slots:
        by_kind.setdefault(slot.kind, []).append(slot)
    for slot in by_kind.get('main', []):
        if slot.url:
            q['image'] = slot.url
    text_urls = [s.url for s in by_kind.get('text', [])]
    for key in ('question', 'questionText'):
        if isinstance(q.get(key), str):
            q[key] = _fill_tags(q[key], text_urls)
    options = q.get('options')
    if isinstance(options, dict):
        for opt_key, value in options.items():
            urls = [s.url for s in by_kind.get('option', []) if s.option_key == str(opt_key)]
            if isinstance(value, str):
                options[opt_key] = _fill_tags(value, urls)
            elif isinstance(value, dict) and isinstance(value.get('text'), str):
                value['text'] = _fill_tags(value['text'], urls)


async def crop_question_figures(questions: List[Dict[str, Any]], page_sources: List[Dict[str, Any]], locate: bool = False) -> None:
    """
    Crop, upload and attach the figures of `questions` (in place).

    page_sources: one entry per document page, as built by build_page_sources().
    locate: ask Gemini for a tight box per figure, one call per page with figures. When the
    call fails, the extraction's own boxes are used.
    """
    if not questions:
        return
    plans: List[_Plan] = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        plan = _plan_question(q, len(page_sources)) if page_sources else None
        if plan:
            plans.append(plan)
        else:
            drop_unresolved_tags(q)
    if not plans:
        return

    by_page: Dict[int, List[_Plan]] = {}
    for plan in plans:
        by_page.setdefault(plan.slots[0].page, []).append(plan)

    # One page at a time per worker: render, analyse, locate, crop, upload, then let the page
    # image go. At most PAGE_CONCURRENCY rendered pages are held in memory at once.
    page_sem = asyncio.Semaphore(PAGE_CONCURRENCY)
    upload_sem = asyncio.Semaphore(UPLOAD_CONCURRENCY)

    async def handle_page(n: int, page_plans: List[_Plan]) -> None:
        async with page_sem:
            image = await asyncio.to_thread(_render_source, page_sources[n - 1])
            if image is None:
                return
            ink = await asyncio.to_thread(PageInk, image)
            if locate:
                entries = [(f"q{i + 1}", plan) for i, plan in enumerate(page_plans)]
                found = await _locate_page(image, entries)
                for key, plan in entries:
                    slots_found = found.get(key) or {}
                    for slot in plan.slots:
                        boxes = slots_found.get(slot.name)
                        if boxes:
                            slot.located = boxes

            async def crop_plan(plan: _Plan) -> None:
                try:
                    boxes = await asyncio.to_thread(_resolve_boxes, plan, ink, image)
                except Exception as e:
                    logger.error(f"Diagram box resolution failed for question {plan.question.get('id')}: {e}")
                    return

                async def upload(slot: _Slot) -> None:
                    try:
                        png = await asyncio.to_thread(_crop_png, image, boxes.get(slot.name) or [])
                        if not png:
                            return
                        async with upload_sem:
                            slot.url = await upload_image_to_cloudinary(png)
                    except Exception as e:
                        logger.error(f"Diagram crop failed for question {plan.question.get('id')} ({slot.name}): {e}")

                await asyncio.gather(*[upload(s) for s in plan.slots])

            await asyncio.gather(*[crop_plan(p) for p in page_plans])

    await asyncio.gather(*[handle_page(n, page_plans) for n, page_plans in by_page.items()])

    cropped = 0
    for plan in plans:
        _apply(plan)
        drop_unresolved_tags(plan.question)
        cropped += sum(1 for s in plan.slots if s.url)
    logger.info(f"Diagram crops: {cropped} figure(s) for {len(plans)} question(s) on {len(by_page)} page(s)"
                f"{' (focused localisation)' if locate else ''}")
