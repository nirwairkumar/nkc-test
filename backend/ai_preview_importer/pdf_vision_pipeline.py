"""
PDF Vision Pipeline - Full-page vision approach using Gemini
Replaces the fragmented text-block + spatial-analysis pipeline with a simple,
accurate approach: render pages as images → send to Gemini Vision → parse results.

Supports two modes:
  - "extract": Extract exact questions from the exam paper as-is
  - "generate": Create new original MCQs based on the PDF content
  
Now also supports:
  - Multiple image files (not just PDFs)
  - Answer key processing for automatic correct answer matching
  - Intelligent answer detection within documents
  - Cross-page question stitching
  - ULTRA-FAST processing with hybrid OCR+Vision approach
  - Smart content analysis and parallel batch processing
"""
import os
import io
import re
import json
import base64
import asyncio
import fitz
from google import genai
from google.genai import types
from typing import Dict, List, Optional, Tuple, Callable
from utils.logger import get_logger
from app.core.config import settings
from ai_preview_importer.cloudinary_uploader import upload_image_to_cloudinary


logger = get_logger(__name__)

# Lazy-load flag for optional Tesseract
TESSERACT_AVAILABLE = None  # None = not yet checked

# Configure Gemini using Vertex AI
import os

client = None
try:
    if settings.GEMINI_API_KEY:
        client = genai.Client(
            vertexai=True,
            api_key=settings.GEMINI_API_KEY
        )
        logger.info("Initialized google-genai client with Vertex AI using API key (Express Mode).")
    else:
        gcp_project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT") or "nkc-test-2-0"
        client = genai.Client(
            vertexai=True,
            project=gcp_project,
            location="us-central1"
        )
        logger.info(f"Initialized google-genai client with Vertex AI (ADC). Project: {gcp_project}, Location: us-central1")
except Exception as e:
    logger.error(f"Failed to initialize Vertex AI client: {e}")



# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

EXTRACT_PROMPT = """
ROLE:
You are an AI document parser, OCR analyst, and exam-content extractor.

-> Give full output in one code snippet only.

GOAL:
Convert the PROVIDED document pages/images into a STRICT, VALID JSON test file.
DO NOT generate new questions.
ONLY extract and restructure content that exists in the file.

--------------------------------------------------

ABSOLUTE OUTPUT RULES

1. RETURN ONLY RAW JSON
2. NO explanation
3. NO markdown formatting
4. NO text before or after JSON
5. JSON must be syntactically valid
6. DO NOT include keys if their value is null or truly absent
7. Question IDs must be sequential integers (1,2,3,...)
8. Deeply scan mathematical syntax before finalizing
9. CRITICAL: Use DOUBLE BACKSLASHES (\\\\) for all LaTeX commands (e.g., use \\\\frac instead of \\frac).
10. ALL mathematical expressions MUST be wrapped in $...$ (inline) or $$...$$ (block). Never output bare LaTeX commands.
11. DO NOT include any citation markers like [cite: ...] or [cite:N] in the output. Strip them completely.

--------------------------------------------------

CRITICAL BEHAVIOR RULES:
- Read the uploaded pages/images visually (OCR + layout reasoning).
- Identify QUESTIONS, OPTIONS, ANSWERS, IMAGES, TABLES, and COLUMN STRUCTURES based on layout.
- If a diagram/image appears immediately before or after a question, attach it to that question.
- NEVER hallucinate or invent content.
- If something is unclear, infer conservatively from the document layout.
- Output ONLY valid JSON. No markdown. No explanations. No comments.

--------------------------------------------------

DOCUMENT ANALYSIS STEPS (MANDATORY):

1. Detect each question boundary using:
   - Question numbers
   - Line breaks
   - Bullets (Q., 1., 1), etc.)

2. For each question:
   - Extract full question text EXACTLY as written — preserve ALL numbers with full precision (e.g., 64.97 NOT 97).
   - Detect if it is:
     - Single choice
     - Multiple choice
     - Numerical
     - Match-the-following
     - Table-based

3. Extract options (A/B/C/D or similar).
   - CRITICAL: Preserve ALL numeric values with full precision (e.g., "64.97 g" NOT "97 g").
   - Do NOT strip any digits from option values.
   - If the PDF shows option labels like (1), (2), (3), (4) instead of A, B, C, D:
     * Map (1) → A, (2) → B, (3) → C, (4) → D
     * Remove the (1)/(2)/(3)/(4) prefix from the option VALUE
     * But NEVER strip numbers that are part of the actual content (e.g., "64.97 g of HCl")

4. Detect correct answers using:
   - Answer keys
   - Highlighted/marked answers
   - End-of-page answer sections.

5. Convert ALL mathematical expressions into LaTeX.

6. Preserve original wording (do NOT rewrite).

7. Attach diagrams/images to the correct question using imagePlaceholder.

8. FOR PASSAGE/COMPREHENSION QUESTIONS:
   - Extract the passage text ONCE.
   - For EVERY question belonging to that passage, include a "passageContent" field containing the FULL passage text.
   - Assign the EXACT SAME "groupId" string (e.g. "passage_grp_1") to all questions belonging to that passage. For non-passage questions, set "groupId" to null or omit it.

--------------------------------------------------

NUMERICAL TYPE DETECTION (CRITICAL):
You MUST correctly identify NUMERICAL type questions:

1. A question is NUMERICAL (type: "numerical") if:
   - It has NO options A/B/C/D listed
   - It asks for a calculated value, integer, or decimal
   - Instructions say "fill in", "enter value", "answer is", "integer type", "numerical value"
   - The answer is a number, not a letter choice

2. For numerical questions:
   - Do NOT create fake options {A,B,C,D}
   - Set options to null or omit entirely
   - Set correctAnswer to {"min": value, "max": value}

3. Common TRAPS to avoid:
   - Options labeled (1), (2), (3), (4) ARE real options → type is "single", NOT numerical
   - Only set type to "numerical" when there are truly NO options at all

--------------------------------------------------

IMAGE/DIAGRAM QUESTION HANDLING (CRITICAL - DO NOT SKIP):

1. NEVER skip a question just because it contains a diagram
2. If a question has a diagram, you MUST still extract:
   - The question text
   - All options
   - The correct answer
   - Set imagePlaceholder to the matching "image_X"
3. Even if the question is ONLY a diagram with no text, create an entry with:
   - question: "[Refer to the diagram]"
   - imagePlaceholder: "image_X"
4. Questions with diagrams are JUST AS IMPORTANT as text-only questions
5. CRITICAL - DIAGRAM VISUAL COORDINATES (DIAGRAM BOUNDING BOX):
   If a question, its options, or its context contains any diagram, graph, chemical structure, geometry figure, table, or illustration on a page:
   - You MUST detect its exact 2D bounding box on the page.
   - Include a "diagram_bbox" object in the question JSON in the format:
     "diagram_bbox": {
       "page_number": <1-based page number where the diagram is located>,
       "box_2d": [ymin, xmin, ymax, xmax]
     }
   - The coordinates in "box_2d" MUST be normalized integers from 0 to 1000 relative to the height and width of that page (e.g. top-left corner is [0, 0] and bottom-right corner is [1000, 1000]).
   - If a question has no diagrams or tables, set "diagram_bbox": null.
   - If a question has multiple diagrams, return the bounding box that encompasses all of them on that page.
6. CRITICAL - DO NOT EXTRACT SOLUTION/EXPLANATION DIAGRAMS:
   - If a diagram is located within the "Solution", "Explanation", or "Hint" section of a question (e.g., under headings/labels like "Sol.", "Solution", "Hint", "Explanation", "Answer (1)"), do NOT extract it, do NOT assign it an imagePlaceholder, and set "diagram_bbox": null (unless the question stem itself also has a diagram).
   - Only extract diagrams that are part of the question stem or option choices.
7. ACCURATE DIAGRAM-TO-QUESTION MAPPING:
   - Make sure the "page_number" in "diagram_bbox" is EXACTLY the page where the question stem/options are printed.
   - The diagram for a question is physically adjacent (usually directly below or beside the question text and above options).
   - NEVER map a diagram from a different page or from a different question. Ensure the ymin/ymax bounds contain only the diagram belonging to the question.

--------------------------------------------------

OPTION vs QUESTION TEXT BOUNDARY (CRITICAL):

1. CAREFULLY distinguish between question text and options:
   - Question text is everything BEFORE the options begin
   - Options begin when you see A., B., C., D. or (a), (b), (c), (d) or (1), (2), (3), (4)
   - Do NOT include option text inside the question field
   - Do NOT include question continuation text inside options

2. If question text appears to continue after options:
   - It is likely a SEPARATE question — check numbering
   - Or it might be instructions for the next set of questions

3. For each option, verify:
   - Does this text logically answer the question?
   - If not, it might be misidentified — it could be part of the question itself

4. CORRECT ANSWER DETECTION:
   - Look for answer keys at the end of the page or document
   - Look for bold/highlighted/circled options
   - If no answer is found, set correctAnswer to null — do NOT guess

--------------------------------------------------

CROSS-PAGE QUESTION HANDLING (CRITICAL):
When processing multiple pages, you MUST handle questions that span across pages:

1. DETECT split questions:
   - If a question starts on page N but options/answer continue on page N+1
   - Question text ends abruptly at page bottom and continues on next page
   - Look for question numbers to identify continuity

2. MERGE split questions:
   - COMBINE question text from all pages into ONE complete question
   - COMBINE all options even if spread across pages
   - Preserve the single question number
   - Mark crossPage: true

3. NEVER create duplicate questions for the same question number.

--------------------------------------------------

TABLE DETECTION RULE (CRITICAL):

If a question contains a table (rows/columns/grid structure):

- Convert the table into KaTeX array format.
- NEVER output HTML table.
- NEVER output markdown table.
- Embed the LaTeX array inside the "question" field.

Example conversion:

Original:
| A | B |
|---|---|
| 1 | 2 |

Convert to:
$$\\\\begin{array}{|c|c|} \\\\hline A & B \\\\\\\\ \\\\hline 1 & 2 \\\\\\\\ \\\\hline \\\\end{array}$$

--------------------------------------------------

MATCH-THE-FOLLOWING RULE (CRITICAL):

If question is "Match the Following" OR contains two-column pairing:

- Convert the two columns into structured LaTeX array format.
- Keep original numbering/labels.
- Embed inside the "question" field.

Example:
$$\\\\begin{array}{ll} \\\\text{Column I} & \\\\text{Column II} \\\\\\\\ A.\\\\ \\\\text{Apple} & 1.\\\\ \\\\text{Fruit} \\\\\\\\ B.\\\\ \\\\text{Car} & 2.\\\\ \\\\text{Vehicle} \\\\end{array}$$

--------------------------------------------------

MATRIX / COLUMN STRUCTURE RULE:

If content appears vertically aligned (like vector, matrix, determinant):

Convert to proper LaTeX:

Matrix: $$\\\\begin{pmatrix} a & b \\\\\\\\ c & d \\\\end{pmatrix}$$
Determinant: $$\\\\begin{vmatrix} a & b \\\\\\\\ c & d \\\\end{vmatrix}$$

--------------------------------MATH & FORMATTING RULES (CRITICAL):

- Use LaTeX for ALL math: \\\\frac, \\\\sqrt, \\\\int, x^2, etc.
- CRITICAL: Use DOUBLE BACKSLASHES (\\\\) for all LaTeX commands inside the JSON strings.
- ALL math MUST be wrapped in $...$ for inline or $$...$$ for block. Never write bare LaTeX.
- Inline math: $...$
- Block math: $$...$$
- Do NOT simplify expressions.
- Preserve spacing and symbols exactly.
- NEVER use align environments, use \\\\begin{aligned} ... \\\\end{aligned} instead.
- CRITICAL: Apply these mathematical and formatting rules to BOTH the question text AND all option values. Ensure NO options are missing or omitted.

CHEMISTRY FORMATTING (mhchem) - CRITICAL:
- Use \\\\ce{} for ALL chemical formulas: $\\\\ce{H2O}$, $\\\\ce{NaCl}$, $\\\\ce{CO2}$
- Chemical equations MUST be in \\\\ce: $\\\\ce{2H2 + O2 -> 2H2O}$
- Reversible reactions: $\\\\ce{N2 + 3H2 <=> 2NH3}$
- Ions: $\\\\ce{Na+}$, $\\\\ce{SO4^{2-}}$, $\\\\ce{Fe^{3+}}$
- Organic: $\\\\ce{CH3-CH2-OH}$, $\\\\ce{C6H12O6}$
- State symbols: $\\\\ce{H2O (l)}$, $\\\\ce{CO2 (g)}$, $\\\\ce{NaCl (aq)}$
- Isotopes: $\\\\ce{^{14}C}$, $\\\\ce{^{235}U}$
- IMPORTANT: Always wrap \\\\ce{...} inside $...$
- CRITICAL: Apply chemistry formatting strictly to options as well.

--------------------------------TEXT & LINE-BREAK RULES:
- Use standard newline characters (\n) for line breaks in questions, options, and passageContent.
- DO NOT use <br> tags.
- Ensure proper escaping of newlines as \n inside the JSON strings.
- BOLD, ITALIC, AND UNDERLINE FORMATTING:
  - If the original document has underlined text, you MUST wrap that text in LaTeX/KaTeX underline format inside inline math $...$: $\\\\underline{\\\\text{underlined text}}$ (e.g. $\\\\underline{\\\\text{recapture}}$).
  - If the original document has bold text, you MUST wrap that text in LaTeX/KaTeX bold format inside inline math $...$: $\\\\textbf{bold text}$ (e.g. $\\\\textbf{कथन:}$).
  - If the original document has italic text, you MUST wrap that text in LaTeX/KaTeX italic format inside inline math $...$: $\\\\textit{italic text}$.
  - DO NOT use HTML tags (like <u>, <strong>, <em>, etc.) or markdown formatting (like ** or _ or *) under any circumstances.

--------------------------------------------------

DIAGRAM AND IMAGE EXTRACTION (CRITICAL):
- If a diagram/image (including chemical structures, geometric drawings, graphs, inline formula diagrams) appears near or inside a question, map it to the corresponding "image_X" identifier.
- The visual order "image_1", "image_2", etc. corresponds to the order of the extracted diagram/structure images appended to this message.
- Compare the content of each extracted diagram image with the page content to identify its correct location.
- If a diagram is a large standalone figure for a question, set its "imagePlaceholder" to "image_X".
- If a diagram/chemical structure is located inline within the question text or option text, insert a markdown image tag: ![image](image_X) at the exact place inside the question or option text.
- IMPORTANT: Ignore any corporate logo, header branding, or footer page-number/institution logos that appear in the document. Do NOT assign them an "image_X" identifier or map them to any question. If a logo is extracted, ignore it.

--------------------------------------------------

STRICT JSON OUTPUT FORMAT (DO NOT CHANGE):

First, analyze the document layout and content to decide if the exam is structured section-wise (e.g., divided into Subject sections like Physics, Chemistry, Math, or Section A, Section B, Section C, etc.).
- IF it is section-wise: Use format 1 (structured section-wise JSON with "sections" field and "enable_section_mode": true).
- IF it is a flat list of questions: Use format 2 (flat JSON with "questions" array at the top level).
- Always auto-generate a descriptive, relevant test title and description based on the document text (e.g. "JEE Advanced Practice Test - Physics & Chemistry", "CBSE Class 12 Term 1 Mathematics Exam"). DO NOT use generic placeholders like "Extracted Exam" if a better title can be inferred from the document headers.

1. IF the document contains section-wise questions (e.g. Physics, Chemistry, Mathematics, Section A, Section B, etc.):
You MUST structure the output using the "sections" field instead of the top-level "questions" field. The top-level structure MUST be:
{
  "title": "Descriptive test title inferred from document headers",
  "description": "Auto-generated description summarizing the test contents and sections",
  "duration": 180,
  "enable_section_mode": true,
  "sections": [
    {
      "id": "section-1",
      "name": "Section Name (e.g. Physics)",
      "attempt_control": {
        "enabled": false
      },
      "questions": [
        {
          "id": 1,
          "type": "single",
          "question": "Exact extracted question text with LaTeX",
          "imagePlaceholder": null,
          "diagram_bbox": {
            "page_number": 1,
            "box_2d": [ymin, xmin, ymax, xmax]
          },
          "options": {
            "A": "Option text only - no numbering prefix",
            "B": "Option text only",
            "C": "Option text only",
            "D": "Option text only"
          },
          "correctAnswer": "A",
          "marks": 4,
          "negativeMarks": 1,
          "crossPage": false,
          "passageContent": null,
          "groupId": null
        }
      ]
    }
  ]
}

If instructions for a section restrict the number of attempts (e.g., "Attempt any 5 out of 10 questions" or "Only the first 10 attempted will be evaluated"), configure the "attempt_control" object inside that section:
"attempt_control": {
  "enabled": true,
  "mode": "hard" (prevent choosing more than limit) or "soft" (only first N will be evaluated),
  "max_attempts": 5
}
Otherwise, set "attempt_control" to {"enabled": false}.

2. IF the document is flat (no sections), use the top-level "questions" array:
{
  "title": "Extracted from document or inferred",
  "description": "Auto-generated from document content",
  "duration": 180,
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "Exact extracted question text with LaTeX",
      "imagePlaceholder": null,
      "diagram_bbox": null,
      "options": {
        "A": "Option text only - no numbering prefix",
        "B": "Option text only",
        "C": "Option text only",
        "D": "Option text only"
      },
      "correctAnswer": "A",
      "marks": 4,
      "negativeMarks": 1,
      "crossPage": false,
      "passageContent": null,
      "groupId": null
    }
  ]
}

--------------------------------------------------

ANSWER RULES BY TYPE:
- Single choice: correctAnswer: "A" (single string)
- Multiple choice: correctAnswer: ["A", "C"] (array of strings)
- Numerical: NO options field, correctAnswer: { "min": 3.14, "max": 3.14 }

--------------------------------------------------

FAIL-SAFE RULES:
- If an image-only question exists -> still create a question entry.
- If options are missing -> infer from alignment or labels.
- If answer key exists separately -> map carefully to question IDs.
- If ANY field is missing -> set it to null (never omit keys).
- If correctAnswer cannot be determined, set it to null.
- If table or match structure is unclear, preserve structure using LaTeX array format.

--------------------------------------------------

STRICT VALIDATION BEFORE OUTPUT

Internally verify:

✔ IDs sequential integers starting from 1
✔ No duplicate IDs
✔ Single → string correctAnswer
✔ Multiple → array correctAnswer
✔ Numerical → object correctAnswer
✔ ALL math wrapped in $...$ or $$...$$
✔ ALL LaTeX commands use double backslashes (\\\\)
✔ ALL chemical formulas use $\\\\ce{...}$
✔ NO citation markers [cite: ...] remain
✔ NO option values start with numbering like "1.", "(a)", "(1)"
✔ Valid JSON

--------------------------------------------------

FINAL COMMAND

Deep scan entire document.
Pay special attention to:
• Mathematical syntax with proper $...$ wrapping
• Tables → KaTeX arrays
• Match-the-following → LaTeX arrays
• Comprehension blocks
• Mixed question types
• Chemical formulas with \\\\ce{}
• Remove any [cite:...] artifacts

Return ONLY RAW JSON.
"""

ANSWER_KEY_PROMPT = """
You are analyzing an ANSWER KEY document/image. Your task is to extract the correct answers and map them to question numbers.

Extract the answer key in this format:
{
  "answer_key": [
    {"question_number": 1, "answer": "A"},
    {"question_number": 2, "answer": ["A", "C"]},
    {"question_number": 3, "answer": "3.14"},
    ...
  ]
}

Rules:
- For single choice: answer is a single letter like "A", "B", "C", or "D"
- For multiple choice: answer is an array of letters like ["A", "C"]
- For numerical: answer is the number as a string like "3.14" or "42"
- Match question numbers exactly as shown in the answer key
- If question numbers are not shown, assume they are in order starting from 1
- Common formats to detect: "1. A", "Q1: B", "Answer 1: C", "1 - D"

Return ONLY valid JSON. No markdown, no explanations.
"""

GENERATE_PROMPT = """
You are an expert educator and exam setter. You will receive images of document pages (textbook, notes, exam paper, etc.).

## YOUR TASK
Analyze the content thoroughly and **generate new, original MCQ questions** based on the topics and concepts covered.

## RULES
1. **Generate as many questions as reasonable** (minimum 10, aim for 15-25 depending on content density).
2. **Questions must be original** — do not copy questions verbatim if they exist in the document.
3. **Cover all topics** in the document proportionally.
4. **Vary difficulty**: mix easy, medium, and hard questions.
5. **CRITICAL - Mathematical content**:
   - Use LaTeX for ALL math: \\\\frac, \\\\sqrt, \\\\int, x^2, etc.
   - Escape ALL backslashes for JSON: use \\\\ instead of \\.
   - Inline math: $...$
   - Block equations: $$...$$ 
   - NEVER use align environments, use \\\\begin{aligned} ... \\\\end{aligned} instead.
   - Apply these rules to both questions and options. Never omit options or choices.

6. **CHEMISTRY FORMATTING (mhchem) - CRITICAL**:
   - Use \\\\ce{} for ALL chemical formulas: \\\\ce{H2O}, \\\\ce{NaCl}, \\\\ce{CO2}
   - Chemical equations MUST be in \\\\ce: \\\\ce{2H2 + O2 -> 2H2O}
   - Reversible reactions: \\\\ce{N2 + 3H2 <=> 2NH3}
   - Ions: \\\\ce{Na+}, \\\\ce{SO4^{2-}}, \\\\ce{Fe^{3+}}
   - Organic: \\\\ce{CH3-CH2-OH}, \\\\ce{C6H12O6}
   - State symbols: \\\\ce{H2O (l)}, \\\\ce{CO2 (g)}, \\\\ce{NaCl (aq)}
   - Isotopes: \\\\ce{^{14}C}, \\\\ce{^{235}U}
   - Wrap all chemical equations/formulas in $...$. Apply chemistry formatting to options too.

7. **All questions must have exactly one correct answer** specified.
8. **Create plausible distractors** — wrong options should be reasonable, not obviously wrong.

9. **IMAGE INSERTION RULE & COORDINATES**:
   - If a generated question requires a diagram/structure from the page, map it to the corresponding "image_X" identifier (which matches the appended reference diagram images).
   - If a diagram is a large standalone figure for a question, set "imagePlaceholder": "image_X".
   - If a diagram/chemical structure is located inline within the question text or option text, insert a markdown image tag: ![image](image_X) at the exact place inside the text.
   - Exclude page headers, footers, and logos. For deeply inline insertions or option diagrams, use ![image](image_X).
   - **CRITICAL**: If the generated question is based on or refers to any visual diagram, graph, table, or chemical structure from the page, you MUST identify its exact 2D bounding box on the source page. Include a "diagram_bbox" object in the question JSON in the format:
     "diagram_bbox": {
       "page_number": <1-based page number where the diagram is located>,
       "box_2d": [ymin, xmin, ymax, xmax]
     }
     where coordinates are normalized integers (0-1000) relative to page dimensions. If no diagram/figure is used for the question, set "diagram_bbox": null.

## CROSS-PAGE HANDLING:
- Questions may span multiple pages - combine them into complete questions
- Never split a single question into multiple entries

## Return ONLY valid JSON (no markdown fences, no explanation):

First, analyze the document layout and content to decide if the exam should be structured section-wise (e.g., divided into Subject sections like Physics, Chemistry, Math, or Section A, Section B, Section C, etc.).
- IF it should be section-wise: Use format 1 (structured section-wise JSON with "sections" field and "enable_section_mode": true).
- IF it should be a flat list of questions: Use format 2 (flat JSON with "questions" array at the top level).
- Always auto-generate a descriptive, relevant test title and description based on the document text (e.g. "Practice Test: Electrostatics and Chemical Bonding"). DO NOT use generic placeholders if a better title can be inferred from the document headers.

1. IF the generated exam is structured by subject or section (e.g. Physics, Chemistry, Math, Section A, etc.):
You MUST structure the output using the "sections" field instead of a top-level "questions" field. The top-level structure MUST be:
{
  "title": "Descriptive test title auto-generated from topics",
  "description": "AI-generated questions based on document content",
  "revision_notes": "# Key Concepts\\n* Point 1\\n* Point 2\\n...",
  "enable_section_mode": true,
  "sections": [
    {
      "id": "section-1",
      "name": "Section Name",
      "attempt_control": {
        "enabled": false
      },
      "questions": [
        {
          "id": 1,
          "type": "single",
          "question": "Original question text here",
          "diagram_bbox": null,
          "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
          "correctAnswer": "C",
          "marks": 4,
          "negativeMarks": 1,
          "crossPage": false
        }
      ]
    }
  ]
}

2. Otherwise, if the generated exam is flat (no sections), use the top-level "questions" array:
{
  "title": "Generated: [Topic/Subject]",
  "description": "AI-generated questions based on [content summary]",
  "revision_notes": "# Key Concepts\\n* Point 1\\n* Point 2\\n...",
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "Original question text here",
      "diagram_bbox": null,
      "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
      "correctAnswer": "C",
      "marks": 1,
      "negativeMarks": 0,
      "crossPage": false
    }
  ]
}
"""


# ---------------------------------------------------------------------------
# Core Pipeline
# ---------------------------------------------------------------------------

def render_pages_as_images(pdf_bytes: bytes, dpi: int = 300) -> List[bytes]:
    """Render each PDF page as a JPEG image with dynamic size capping to optimize memory and speed."""
    import fitz  # lazy-loaded: only used by OCR pipeline
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_images = []

    # Map DPI to maximum pixel dimension for the page to prevent rendering massive pages
    # e.g., standard letter page: 612x792 points. At 300 DPI, height is ~3300px.
    # We cap max dimension at 2048px (high accuracy) or 1600px (fast/standard).
    max_dim = 2048 if dpi >= 300 else 1600

    for page_num in range(len(doc)):
        page = doc[page_num]
        rect = page.rect
        
        # Calculate dynamic scale to keep maximum dimension within max_dim
        scale = min(max_dim / rect.width, max_dim / rect.height)
        
        # Ensure we don't scale UP if the page is already smaller than target dimension
        if scale > (dpi / 72):
            scale = dpi / 72
            
        mat = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=mat, alpha=False)

        img_bytes = pix.tobytes("jpg")
        page_images.append(img_bytes)
        logger.debug(f"Rendered page {page_num + 1}: {pix.width}x{pix.height} ({len(img_bytes)} bytes)")

    doc.close()
    logger.info(f"Rendered {len(page_images)} pages as JPEG images capped at max {max_dim}px")
    return page_images


def build_page_sources(file_data: List[Dict]) -> List[Dict]:
    """Build list of page sources to map flat page number to source PDF/image."""
    page_sources = []
    for file_info in file_data:
        filename = file_info["filename"]
        content = file_info["content"]
        if is_pdf(content):
            try:
                import fitz
                doc = fitz.open(stream=content, filetype="pdf")
                num_pages = len(doc)
                doc.close()
                for i in range(num_pages):
                    page_sources.append({
                        "type": "pdf",
                        "content": content,
                        "page_idx": i
                    })
            except Exception as e:
                logger.error(f"Error reading PDF page count for {filename}: {e}")
        else:
            page_sources.append({
                "type": "image",
                "content": content
            })
    return page_sources


async def process_diagram_bboxes(questions: List[Dict], page_sources: List[Dict]) -> None:
    """
    Looks for "diagram_bbox" inside each question. If found, crops the diagram region 
    from the corresponding page image, uploads it to Cloudinary, and sets it as the 
    question's "image" field.
    """
    from PIL import Image
    import io
    import asyncio
    import fitz
    
    if not page_sources:
        return

    crop_tasks = []

    async def _crop_and_upload(vq: Dict):
        # If the question already has a valid image resolved from an embedded placeholder, do NOT crop/overwrite it
        if vq.get("image"):
            return
            
        bbox_info = vq.get("diagram_bbox")
        if not bbox_info or not isinstance(bbox_info, dict):
            return
            
        page_num = bbox_info.get("page_number")
        box_2d = bbox_info.get("box_2d")
        
        if not page_num or not box_2d or len(box_2d) != 4:
            return
            
        try:
            page_idx = int(page_num) - 1
            if page_idx < 0 or page_idx >= len(page_sources):
                logger.warning(f"Invalid page_number {page_num} in diagram_bbox. Total pages: {len(page_sources)}")
                return
                
            source = page_sources[page_idx]
            
            # Render page or load image
            if source["type"] == "pdf":
                # Render page at 300 DPI for high resolution cropping
                pdf_bytes = source["content"]
                page_in_pdf = source["page_idx"]
                
                def _render_page():
                    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                    page = doc[page_in_pdf]
                    rect = page.rect
                    max_dim = 2048
                    scale = min(max_dim / rect.width, max_dim / rect.height)
                    if scale > (300/72):
                        scale = 300/72
                    mat = fitz.Matrix(scale, scale)
                    pix = page.get_pixmap(matrix=mat, alpha=False)
                    img_bytes = pix.tobytes("png")
                    doc.close()
                    return img_bytes
                    
                page_img_bytes = await asyncio.to_thread(_render_page)
            else:
                page_img_bytes = convert_image_to_bytes(source["content"])
            
            # Crop using Pillow
            img = Image.open(io.BytesIO(page_img_bytes))
            width, height = img.size
            
            # BBox coordinates [ymin, xmin, ymax, xmax] (0-1000 scale)
            ymin, xmin, ymax, xmax = box_2d
            
            ymin = max(0, min(1000, int(ymin)))
            xmin = max(0, min(1000, int(xmin)))
            ymax = max(0, min(1000, int(ymax)))
            xmax = max(0, min(1000, int(xmax)))
            
            if ymin >= ymax or xmin >= xmax:
                logger.warning(f"Invalid bbox dimensions for question {vq.get('id')}: {box_2d}")
                return
                
            # Convert to actual pixels
            left = int(xmin * width / 1000)
            top = int(ymin * height / 1000)
            right = int(xmax * width / 1000)
            bottom = int(ymax * height / 1000)
            
            # Add a small padding (15 pixels)
            padding = 15
            left = max(0, left - padding)
            top = max(0, top - padding)
            right = min(width, right + padding)
            bottom = min(height, bottom + padding)
            
            if (right - left) < 10 or (bottom - top) < 10:
                logger.warning(f"Cropped region too small: {right - left}x{bottom - top}")
                return
                
            cropped_img = img.crop((left, top, right, bottom))
            
            out_io = io.BytesIO()
            cropped_img.save(out_io, format="PNG")
            cropped_bytes = out_io.getvalue()
            
            # Upload to Cloudinary
            cloudinary_url = await upload_image_to_cloudinary(cropped_bytes)
            if cloudinary_url:
                vq["image"] = cloudinary_url
                logger.info(f"Successfully cropped diagram for Q{vq.get('id')} and uploaded to Cloudinary: {cloudinary_url}")
        except Exception as e:
            logger.error(f"Failed to crop diagram for question {vq.get('id')}: {e}")

    for vq in questions:
        crop_tasks.append(_crop_and_upload(vq))
        
    if crop_tasks:
        await asyncio.gather(*crop_tasks)


def wrap_bare_latex(text: str) -> str:
    """
    Ensures that bare LaTeX math expressions in options/choices are wrapped in $...$.
    Scans for LaTeX commands or sub/superscripts and wraps the entire string if no '$' is present.
    """
    if not isinstance(text, str) or not text.strip():
        return text
    if '$' in text:
        return text
    cmds = re.findall(r'\\([a-zA-Z]+)', text)
    has_latex_cmd = any(cmd not in ('n', 't', 'r') for cmd in cmds)
    has_sub_super = bool(re.search(r'[\^_]', text))
    if has_latex_cmd or has_sub_super:
        return f"${text.strip()}$"
    return text


def extract_embedded_images(pdf_bytes: bytes) -> List[Dict]:
    """
    Extract ALL embedded images and vector diagrams from the PDF.
    - Uses page.get_images() for raster images.
    - Groups page.get_drawings() (vector graphics) and crops them.
    - Filters out corporate logos (e.g. at the top or bottom of pages) and noise.
    """
    import fitz
    import hashlib
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images = []
    seen_hashes = set()

    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Skip scanned/image-only pages to avoid extracting the full-page background scanned image
        page_text = page.get_text("text").strip()
        if len(page_text) < 50:
            logger.info(f"Skipping embedded image extraction for page {page_num + 1} (scanned/image-only page)")
            continue
        
        # 1. Raster images
        image_list = page.get_images(full=True)
        page_raster_count = 0
        for img_info in image_list:
            if page_raster_count >= 5:
                logger.info(f"Reached max raster images limit (5) for page {page_num + 1}, skipping remaining images")
                break
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                ext = base_image["ext"]
                
                # Check size
                w, h = base_image["width"], base_image["height"]
                if w < 20 or h < 20:
                    continue
                
                # Exclude header/footer logos by coordinate heuristics:
                rects = page.get_image_rects(xref)
                bbox = None
                if rects:
                    r = rects[0]
                    bbox = (r.x0, r.y0, r.x1, r.y1)
                    page_height = page.rect.height
                    # Logo heuristic: top 12% or bottom 12% of page and not very tall
                    if (r.y1 < page_height * 0.12 or r.y0 > page_height * 0.88) and (r.y1 - r.y0) < 80:
                        logger.info(f"Skipping potential logo raster image on page {page_num + 1} at {bbox}")
                        continue
                    
                    # Exclude full-page background scanned images:
                    page_area = page.rect.width * page.rect.height
                    img_area = r.width * r.height
                    if img_area > page_area * 0.65:
                        logger.info(f"Skipping full-page background raster image on page {page_num + 1} at {bbox} (area ratio: {img_area/page_area:.2f})")
                        continue
                else:
                    # Fallback check if rects is empty:
                    # Compare image pixel area. A typical full-page image at 150+ DPI has > 1M pixels
                    # If page has text, we only filter if it is extremely large compared to normal embedded diagrams.
                    if w > 800 and h > 1000 and (w * h) > 1000000:
                        logger.info(f"Skipping potential full-page background raster image (no rects) on page {page_num + 1} ({w}x{h})")
                        continue
                
                img_hash = hashlib.md5(image_bytes).hexdigest()
                if img_hash in seen_hashes:
                    continue
                seen_hashes.add(img_hash)
                
                images.append({
                    "page": page_num + 1,
                    "data": base64.b64encode(image_bytes).decode("utf-8"),
                    "ext": ext,
                    "width": w,
                    "height": h,
                    "bbox": bbox,
                    "base64_uri": f"data:image/{ext};base64,{base64.b64encode(image_bytes).decode('utf-8')}"
                })
                page_raster_count += 1
            except Exception as e:
                logger.warning(f"Failed to extract raster image: {e}")

                
        # 2. Vector Drawings grouping
        try:
            drawings = page.get_drawings()
            if drawings:
                if len(drawings) > 1000:
                    logger.info(f"Page {page_num + 1} has too many vector drawings ({len(drawings)}), skipping vector crop to prevent slowdown")
                    drawings = []
                
                rects_to_crop = []
                for draw in drawings:
                    r = draw["rect"]
                    if r.width > page.rect.width * 0.95 or r.height > page.rect.height * 0.95:
                        continue
                    if r.width < 10 or r.height < 10:
                        continue
                    
                    page_height = page.rect.height
                    if (r.y1 < page_height * 0.10 or r.y0 > page_height * 0.90) and r.height < 20:
                        continue
                        
                    rects_to_crop.append(r)
                
                # Merge overlapping or very close rects (within 30 points)
                merged_rects = []
                for r in rects_to_crop:
                    expanded = fitz.Rect(r.x0 - 15, r.y0 - 15, r.x1 + 15, r.y1 + 15)
                    merged = False
                    for i, mr in enumerate(merged_rects):
                        expanded_mr = fitz.Rect(mr.x0 - 15, mr.y0 - 15, mr.x1 + 15, mr.y1 + 15)
                        if expanded_mr.intersects(expanded):
                            merged_rects[i] = mr | r
                            merged = True
                            break
                    if not merged:
                        merged_rects.append(r)
                
                # Render/crop each merged rect
                page_vector_count = 0
                for r in merged_rects:
                    if page_vector_count >= 5:
                        logger.info(f"Reached max vector crops limit (5) for page {page_num + 1}, skipping remaining drawings")
                        break
                        
                    margin = 5
                    crop_rect = fitz.Rect(
                        max(0, r.x0 - margin),
                        max(0, r.y0 - margin),
                        min(page.rect.width, r.x1 + margin),
                        min(page.rect.height, r.y1 + margin)
                    )
                    
                    if crop_rect.width < 15 or crop_rect.height < 15:
                        continue
                        
                    page_height = page.rect.height
                    if (crop_rect.y1 < page_height * 0.12 or crop_rect.y0 > page_height * 0.88) and crop_rect.height < 70:
                        continue
                    
                    # Exclude too large cropped drawings (whole-page border/diagrams):
                    page_area = page.rect.width * page.rect.height
                    crop_area = crop_rect.width * crop_rect.height
                    if crop_area > page_area * 0.65:
                        logger.info(f"Skipping too large cropped drawing on page {page_num + 1} at {crop_rect} (area ratio: {crop_area/page_area:.2f})")
                        continue
                    
                    # Crop the drawing region
                    pix = page.get_pixmap(clip=crop_rect, matrix=fitz.Matrix(2.0, 2.0), alpha=False)
                    img_bytes = pix.tobytes("png")
                    
                    img_hash = hashlib.md5(img_bytes).hexdigest()
                    if img_hash in seen_hashes:
                        continue
                    seen_hashes.add(img_hash)
                    
                    images.append({
                        "page": page_num + 1,
                        "data": base64.b64encode(img_bytes).decode("utf-8"),
                        "ext": "png",
                        "width": pix.width,
                        "height": pix.height,
                        "bbox": (crop_rect.x0, crop_rect.y0, crop_rect.x1, crop_rect.y1),
                        "base64_uri": f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf-8')}"
                    })
                    page_vector_count += 1
        except Exception as e:
            logger.warning(f"Failed to extract vector drawings on page {page_num + 1}: {e}")

    doc.close()
    
    # Sort images by page, then Y-coordinate (top to bottom), then X-coordinate (left to right)
    def sort_key(img):
        bbox = img["bbox"]
        if bbox:
            return (img["page"], bbox[1], bbox[0])
        return (img["page"], 0, 0)
        
    images.sort(key=sort_key)
    
    # Assign sequential IDs mapping to the expected placeholders
    for i, img in enumerate(images):
        img["id"] = f"image_{i+1}"
        
    logger.info(f"Extracted and ordered {len(images)} images from PDF")
    return images


def append_extracted_images_to_content(content_parts: List, embedded_images: List[Dict]):
    """
    Append extracted diagrams to Gemini content parts so the model can visually map them.
    Each diagram is appended as a labeled image.
    """
    if not embedded_images:
        return
        
    content_parts.append("\n\n--- EXTRACTED DIAGRAMS AND INLINE STRUCTURES FOR REFERENCE ---\n")
    content_parts.append("Use the following labeled images to match with placeholders (image_1, image_2, etc.) inside the questions or options:\n")
    
    for img in embedded_images:
        img_id = img["id"]
        content_parts.append(f"\nID: {img_id}\n")
        try:
            raw_bytes = base64.b64decode(img["data"])
            content_parts.append(types.Part.from_bytes(data=raw_bytes, mime_type="image/png"))
        except Exception as e:
            logger.error(f"Failed to append image {img_id} to content: {e}")


def convert_image_to_bytes(image_bytes: bytes, target_format: str = "png") -> bytes:
    """Convert any image format to standardized bytes."""
    try:
        from PIL import Image  # lazy-loaded: only used by OCR pipeline
        img = Image.open(io.BytesIO(image_bytes))
        # Convert to RGB if necessary (for PNG compatibility)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        output = io.BytesIO()
        img.save(output, format=target_format.upper())
        return output.getvalue()
    except Exception as e:
        logger.warning(f"Failed to convert image: {e}, returning original")
        return image_bytes


def is_pdf(file_bytes: bytes) -> bool:
    """Check if the file bytes represent a PDF."""
    return file_bytes.startswith(b'%PDF')


def is_image(filename: str) -> bool:
    """Check if the filename represents an image."""
    ext = filename.lower()
    return any(ext.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'])


def normalize_question_id(q_id) -> int:
    """
    Normalize question ID to integer for matching.
    Handles formats like: 1, "1", "Q1", "Question 1", "1.", etc.
    """
    if isinstance(q_id, int):
        return q_id
    
    if isinstance(q_id, str):
        # Remove common prefixes and suffixes
        cleaned = q_id.strip()
        cleaned = re.sub(r'^(Q|Question|No|#)\s*', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'[.:)\]]\s*$', '', cleaned)
        cleaned = cleaned.strip()
        
        try:
            return int(cleaned)
        except ValueError:
            # If can't convert, return original as string
            logger.warning(f"Could not normalize question ID: {q_id}")
            return q_id
    
    return q_id


async def process_answer_key(answer_key_data: Dict) -> List[Dict]:
    """
    Process an answer key file (PDF or image) and extract answer mappings.
    Returns a list of {question_number, answer} dictionaries.
    """
    if not client:
        logger.warning("Vertex AI client not initialized, skipping answer key processing")
        return []
    
    logger.info("Processing answer key...")
    
    # Convert answer key to images
    images = []
    if is_pdf(answer_key_data["content"]):
        images = render_pages_as_images(answer_key_data["content"], dpi=300)
    elif is_image(answer_key_data["filename"]):
        images = [convert_image_to_bytes(answer_key_data["content"])]
    else:
        logger.warning("Unknown answer key format, treating as image")
        images = [answer_key_data["content"]]
    
    if not images:
        logger.warning("No images extracted from answer key")
        return []
    
    # Send to Gemini for answer extraction
    content_parts = [ANSWER_KEY_PROMPT]
    for i, img_bytes in enumerate(images):
        content_parts.append(f"\n--- ANSWER KEY PAGE {i + 1} ---\n")
        content_parts.append({
            "mime_type": "image/png",
            "data": base64.b64encode(img_bytes).decode("utf-8")
        })
    
    try:
        model = "gemini-3.5-flash"
        
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=content_parts,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    top_p=0.95,
                    max_output_tokens=4096,
                )
            ),
            timeout=120.0
        )
        raw_text = response.text
        
        # Parse the answer key JSON
        clean = raw_text.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        elif clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()
        
        data = json.loads(clean)
        answer_key = data.get("answer_key", [])
        
        logger.info(f"Extracted {len(answer_key)} answers from answer key")
        return answer_key
        
    except Exception as e:
        logger.error(f"Error processing answer key: {e}")
        return []


async def process_pdf(file_bytes: bytes, mode: str = "extract") -> Dict:
    """
    Legacy function for backward compatibility.
    Processes a single PDF file.
    """
    file_data = [{
        "filename": "document.pdf",
        "content": file_bytes,
        "content_type": "application/pdf"
    }]
    return await process_files(file_data, mode=mode, answer_key=None)


def merge_cross_page_questions(all_questions: List[Dict]) -> List[Dict]:
    """
    Merge questions that span across multiple pages.
    Groups questions by normalized ID and combines their content.
    """
    # Group questions by normalized ID
    question_groups: Dict[int, List[Dict]] = {}
    
    for q in all_questions:
        q_id = normalize_question_id(q.get("id"))
        if q_id not in question_groups:
            question_groups[q_id] = []
        question_groups[q_id].append(q)
    
    # Merge questions with same ID
    merged_questions = []
    for q_id, group in question_groups.items():
        if len(group) == 1:
            # No merging needed
            merged_questions.append(group[0])
        else:
            # Merge multiple parts of the same question
            logger.info(f"Merging {len(group)} parts of question {q_id}")
            merged = merge_question_parts(group)
            merged_questions.append(merged)
    
    # Sort by ID
    merged_questions.sort(key=lambda x: normalize_question_id(x.get("id")))
    
    return merged_questions


async def _call_gemini_with_retry(content_parts: list, batch_num: int, max_retries: int = 3) -> str:
    """
    Call Gemini API with retry logic, exponential backoff, and fallback models/settings.
    """
    base_model = "gemini-3.5-flash"
    fallback_model = "gemini-2.0-flash-lite"
    
    for attempt in range(max_retries):
        try:
            # Adjust settings based on attempt
            if attempt == 0:
                model = base_model
                temp = 0.1
                max_tokens = 65536
            elif attempt == 1:
                logger.warning(f"Batch {batch_num}: Attempt {attempt + 1}. Using higher temperature.")
                model = base_model
                temp = 0.3  # Slightly higher temperature for different generation path
                max_tokens = 65536
            else:
                logger.warning(f"Batch {batch_num}: Attempt {attempt + 1}. Falling back to {fallback_model}.")
                model = fallback_model
                temp = 0.2
                max_tokens = 65536

            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model=model,
                    contents=content_parts,
                    config=types.GenerateContentConfig(
                        temperature=temp,
                        top_p=0.95,
                        max_output_tokens=max_tokens,
                        response_mime_type="application/json",
                    )
                ),
                timeout=120.0
            )
            
            if not response.text:
                raise ValueError("Empty response received from Gemini.")
                
            return response.text

        except Exception as e:
            logger.error(f"Batch {batch_num}: Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                raise Exception(f"Failed after {max_retries} attempts: {e}")
            
            # Check for rate limits or overloaded service
            if "429" in str(e) or "503" in str(e):
                wait_time = (2 ** attempt) + 2  # 3s, 4s, 6s...
                logger.info(f"Batch {batch_num}: Rate limit/overload detected. Waiting {wait_time}s before retry.")
                await asyncio.sleep(wait_time)
            else:
                # Short delay for other errors
                await asyncio.sleep(1)

def merge_question_parts(parts: List[Dict]) -> Dict:
    """
    Merge multiple parts of the same question into one complete question.
    """
    # Start with the first part
    merged = parts[0].copy()
    
    # Collect all text parts
    all_question_texts = []
    all_options = {}
    diagram_pages = []
    
    for part in parts:
        # Collect question text if not empty
        q_text = part.get("question", "")
        if q_text and q_text.strip():
            all_question_texts.append(q_text.strip())
        
        # Collect options
        opts = part.get("options", {})
        if opts:
            for key, value in opts.items():
                if value and value.strip():
                    all_options[key] = value
        
        # Track diagram pages
        if part.get("diagramPage"):
            diagram_pages.append(part["diagramPage"])
        
        # Keep the correct answer if found
        if part.get("correctAnswer") and not merged.get("correctAnswer"):
            merged["correctAnswer"] = part["correctAnswer"]
        
        # Keep the type if more specific
        if part.get("type") and part["type"] != "single":
            merged["type"] = part["type"]
    
    # Merge question texts (remove duplicates, preserve order)
    seen_texts = set()
    unique_texts = []
    for text in all_question_texts:
        # Simple deduplication - check if text is substring of already seen
        is_duplicate = False
        for seen in seen_texts:
            if text in seen or seen in text:
                is_duplicate = True
                break
        if not is_duplicate:
            seen_texts.add(text)
            unique_texts.append(text)
    
    merged["question"] = "\n\n".join(unique_texts)
    
    # Merge options
    if all_options:
        merged["options"] = all_options
        # Update optionImages to match
        merged["optionImages"] = {k: None for k in all_options.keys()}
    
    # Use first diagram page
    if diagram_pages:
        merged["diagramPage"] = min(diagram_pages)
    
    # Mark as cross-page
    merged["crossPage"] = True
    
    return merged


async def process_files(file_data: List[Dict], mode: str = "extract", answer_key: Optional[Dict] = None) -> Dict:
    """
    Main pipeline entry point for processing multiple files (PDFs and/or images).
    
    Strategy:
    1. Convert all files to page images at HIGH QUALITY (300 DPI)
    2. If answer key provided, extract answers first
    3. Send page images to Gemini Vision for question extraction
    4. Match extracted answers with questions if answer key was provided
    5. Separately extract embedded images for diagram matching
    6. Merge questions that span across pages
    """
    if not client:
        raise ValueError("Vertex AI client not initialized. Check configuration.")

    logger.info(f"Starting Vision Pipeline in '{mode}' mode with {len(file_data)} file(s)...")

    page_sources = build_page_sources(file_data)


    # Step 1: Process answer key if provided
    answer_key_mappings = []
    if answer_key:
        answer_key_mappings = await process_answer_key(answer_key)
        logger.info(f"Answer key loaded with {len(answer_key_mappings)} mappings")

    # Step 2: Convert all files to page images at HIGH QUALITY
    logger.info("Converting files to high-quality images (300 DPI)...")
    all_page_images = []
    all_embedded_images = []
    
    for file_info in file_data:
        filename = file_info["filename"]
        content = file_info["content"]
        
        if is_pdf(content):
            logger.info(f"Processing PDF: {filename}")
            pdf_pages = render_pages_as_images(content, dpi=300)  # HIGH QUALITY
            all_page_images.extend(pdf_pages)
            
            # Extract ALL embedded images from PDF (minimal filtering)
            embedded = extract_embedded_images(content)
            all_embedded_images.extend(embedded)
            
        elif is_image(filename):
            logger.info(f"Processing Image: {filename}")
            img_bytes = convert_image_to_bytes(content)
            all_page_images.append(img_bytes)
        else:
            logger.warning(f"Unknown file type: {filename}, attempting to process as image")
            all_page_images.append(content)

    if not all_page_images:
        raise ValueError("No pages/images could be extracted from the provided files")

    logger.info(f"Total pages/images to process: {len(all_page_images)}")
    # Step 3: Process pages (use single batch for smaller files, chunked for larger ones)
    SINGLE_BATCH_PAGE_LIMIT = 15
    prompt = EXTRACT_PROMPT if mode == "extract" else GENERATE_PROMPT
    total_pages = len(all_page_images)
    
    if total_pages <= SINGLE_BATCH_PAGE_LIMIT:
        logger.info(f"Processing all {total_pages} pages in a single batch (no chunking)...")
        content_parts = [prompt]
        for idx, page_img in enumerate(all_page_images):
            content_parts.append(f"\n--- PAGE {idx + 1} of {total_pages} ---\n")
            content_parts.append(
                types.Part.from_bytes(data=page_img, mime_type="image/jpeg")
            )
        append_extracted_images_to_content(content_parts, all_embedded_images)
            
        try:
            raw_text = await _call_gemini_with_retry(content_parts, batch_num=1)
            logger.info(f"Single batch response received. Length: {len(raw_text)}")
            
            batch_result = await _parse_response(raw_text, all_embedded_images)
            unique_questions = batch_result.get("questions", [])
            
            await process_diagram_bboxes(unique_questions, page_sources)
            
            if not unique_questions:
                raise ValueError("No questions could be extracted in single batch mode.")
                
            # Step 5: Match answer key with questions if provided (PRIORITY)
            if answer_key_mappings:
                logger.info("Matching separate answer key with extracted questions...")
                unique_questions = _match_answer_key(unique_questions, answer_key_mappings)
            
            # Reconstruct sections if section mode is detected
            has_sections = any(q.get("section_name") for q in unique_questions)
            
            result = {
                "title": batch_result.get("title") or "Extracted Exam",
                "description": batch_result.get("description") or f"Extracted from {total_pages} pages",
                "questions": [
                    {k: v for k, v in q.items() if k not in ["section_name", "section_id", "section_attempt_control"]}
                    for q in unique_questions
                ],
                "canConfirm": all(q.get("correctAnswer") is not None for q in unique_questions),
                "unansweredCount": sum(1 for q in unique_questions if q.get("correctAnswer") is None),
            }

            if has_sections:
                sections_map = {}
                sections_list = []
                for q in unique_questions:
                    sec_name = q.get("section_name") or "General"
                    sec_key = sec_name.strip().lower()
                    if sec_key not in sections_map:
                        attempt_control = q.get("section_attempt_control") or {"enabled": False}
                        sec_obj = {
                            "id": q.get("section_id") or f"section-{len(sections_list) + 1}",
                            "name": sec_name,
                            "attempt_control": attempt_control,
                            "questions": []
                        }
                        sections_map[sec_key] = sec_obj
                        sections_list.append(sec_obj)
                    
                    q_clean = {k: v for k, v in q.items() if k not in ["section_name", "section_id", "section_attempt_control"]}
                    sections_map[sec_key]["questions"].append(q_clean)
                
                result["enable_section_mode"] = True
                result["sections"] = sections_list
                
            return result
            
        except Exception as e:
            logger.error(f"Error in single batch processing: {e}. Falling back to chunked processing...")

    # Fallback to chunked/parallel processing for larger files
    MAX_PAGES_PER_BATCH = 5
    OVERLAP_PAGES = 1  # Include last page of previous batch in next batch
    all_questions = []
    
    start_idx = 0
    batch_num = 0
    first_batch_title = None
    first_batch_desc = None
    
    while start_idx < total_pages:
        batch_num += 1
        end_idx = min(start_idx + MAX_PAGES_PER_BATCH, total_pages)
        
        # Get batch images with overlap from previous batch
        if start_idx == 0:
            batch_images = all_page_images[start_idx:end_idx]
            batch_start_page = start_idx
        else:
            # Include overlap page from previous batch
            batch_images = all_page_images[start_idx - OVERLAP_PAGES:end_idx]
            batch_start_page = start_idx - OVERLAP_PAGES
        
        actual_batch_size = len(batch_images)
        logger.info(f"Processing batch {batch_num}: Pages {batch_start_page + 1}-{batch_start_page + actual_batch_size}")

        content_parts = [prompt]
        
        for i, page_img in enumerate(batch_images):
            actual_page_num = batch_start_page + i + 1
            content_parts.append(f"\n--- PAGE {actual_page_num} of {total_pages} ---\n")
            content_parts.append(
                types.Part.from_bytes(data=page_img, mime_type="image/jpeg")
            )

        batch_embedded = [img for img in all_embedded_images if batch_start_page + 1 <= img["page"] <= batch_start_page + actual_batch_size]
        append_extracted_images_to_content(content_parts, batch_embedded)

        logger.info(f"Sending batch {batch_num} to Gemini...")
        
        try:
            raw_text = await _call_gemini_with_retry(content_parts, batch_num)
            
            logger.info(f"Batch {batch_num} response received. Length: {len(raw_text)}")
            
            batch_result = await _parse_response(raw_text, all_embedded_images)
            questions = batch_result.get("questions", [])
            
            if batch_num == 1:
                first_batch_title = batch_result.get("title")
                first_batch_desc = batch_result.get("description")
            
            if questions:
                # Adjust relative page numbers to global ones
                for q in questions:
                    bbox = q.get("diagram_bbox")
                    if bbox and isinstance(bbox, dict):
                        p_num = bbox.get("page_number")
                        if p_num is not None:
                            try:
                                p_num = int(p_num)
                                if p_num <= actual_batch_size and batch_start_page > 0:
                                    bbox["page_number"] = batch_start_page + p_num
                                    logger.info(f"Adjusted relative page_number {p_num} to global {batch_start_page + p_num} for Q {q.get('id')}")
                            except (ValueError, TypeError):
                                pass
                logger.info(f"Extracted {len(questions)} questions from batch {batch_num}")
                all_questions.extend(questions)
            else:
                logger.warning(f"Batch {batch_num} returned 0 questions despite successful API call.")
                
        except Exception as e:
            logger.error(f"Error processing batch {batch_num}: {e}")
            # Continue to next batch instead of failing entire document
        
        # Move to next batch
        start_idx = end_idx

    if not all_questions:
        raise ValueError("No questions could be extracted from any batch.")

    logger.info(f"Total questions extracted before merging: {len(all_questions)}")

    # Step 4: Merge cross-page questions
    logger.info("Merging cross-page questions...")
    unique_questions = merge_cross_page_questions(all_questions)
    logger.info(f"Total questions after merging: {len(unique_questions)}")

    await process_diagram_bboxes(unique_questions, page_sources)

    # Step 5: Match answer key with questions if provided (PRIORITY)
    if answer_key_mappings:
        logger.info("Matching separate answer key with extracted questions...")
        unique_questions = _match_answer_key(unique_questions, answer_key_mappings)
    else:
        # If no separate answer key, check if inline answers were detected
        logger.info("No separate answer key provided - relying on inline answer detection")

    # Reconstruct sections if section mode is detected
    has_sections = any(q.get("section_name") for q in unique_questions)
    
    result = {
        "title": first_batch_title or "Extracted Exam",
        "description": first_batch_desc or f"Extracted from {total_pages} pages",
        "questions": [
            {k: v for k, v in q.items() if k not in ["section_name", "section_id", "section_attempt_control"]}
            for q in unique_questions
        ],
        "canConfirm": all(q.get("correctAnswer") is not None for q in unique_questions),
        "unansweredCount": sum(1 for q in unique_questions if q.get("correctAnswer") is None),
    }

    if has_sections:
        sections_map = {}
        sections_list = []
        for q in unique_questions:
            sec_name = q.get("section_name") or "General"
            sec_key = sec_name.strip().lower()
            if sec_key not in sections_map:
                attempt_control = q.get("section_attempt_control") or {"enabled": False}
                sec_obj = {
                    "id": q.get("section_id") or f"section-{len(sections_list) + 1}",
                    "name": sec_name,
                    "attempt_control": attempt_control,
                    "questions": []
                }
                sections_map[sec_key] = sec_obj
                sections_list.append(sec_obj)
            
            q_clean = {k: v for k, v in q.items() if k not in ["section_name", "section_id", "section_attempt_control"]}
            sections_map[sec_key]["questions"].append(q_clean)
        
        result["enable_section_mode"] = True
        result["sections"] = sections_list

    return result


def _match_answer_key(questions: List[Dict], answer_key: List[Dict]) -> List[Dict]:
    """
    Match extracted questions with answer key mappings.
    Updates correctAnswer field based on answer key.
    Uses normalized question IDs for flexible matching.
    """
    # Create a lookup from normalized question number to answer
    answer_lookup: Dict[int, any] = {}
    for mapping in answer_key:
        q_num = mapping.get("question_number")
        answer = mapping.get("answer")
        if q_num is not None and answer is not None:
            normalized_num = normalize_question_id(q_num)
            answer_lookup[normalized_num] = answer
            logger.debug(f"Answer key mapping: Q{normalized_num} -> {answer}")
    
    logger.info(f"Answer key contains {len(answer_lookup)} normalized mappings")
    
    # Update questions with correct answers
    matched_count = 0
    unmatched_questions = []
    
    for q in questions:
        q_id = q.get("id")
        normalized_q_id = normalize_question_id(q_id)
        
        logger.debug(f"Trying to match question {q_id} (normalized: {normalized_q_id})")
        
        if normalized_q_id in answer_lookup:
            answer = answer_lookup[normalized_q_id]
            
            # Handle different answer formats
            if isinstance(answer, list):
                # Multiple choice
                q["correctAnswer"] = answer
                q["type"] = "multiple"
                logger.debug(f"Matched Q{normalized_q_id} as multiple choice: {answer}")
            elif isinstance(answer, str):
                if answer.upper() in ['A', 'B', 'C', 'D', 'E']:
                    # Single choice
                    q["correctAnswer"] = answer.upper()
                    logger.debug(f"Matched Q{normalized_q_id} as single choice: {answer.upper()}")
                else:
                    # Try to parse as numerical
                    try:
                        num_val = float(answer)
                        q["correctAnswer"] = {"min": num_val, "max": num_val}
                        q["type"] = "numerical"
                        logger.debug(f"Matched Q{normalized_q_id} as numerical: {num_val}")
                    except:
                        # Keep as string
                        q["correctAnswer"] = answer
                        logger.debug(f"Matched Q{normalized_q_id} as string: {answer}")
            
            matched_count += 1
        else:
            unmatched_questions.append(q_id)
    
    logger.info(f"Successfully matched {matched_count}/{len(questions)} questions with answer key")
    if unmatched_questions:
        logger.info(f"Unmatched questions: {unmatched_questions}")
    
    return questions


# ---------------------------------------------------------------------------
# JSON Sanitization
# ---------------------------------------------------------------------------

def _sanitize_gemini_json(text: str) -> str:
    """
    Fix common JSON issues in Gemini responses:
    1. LaTeX backslash commands that break JSON parsing
    2. Unquoted values
    3. Truncated output — try to close incomplete JSON
    """
    # Fix 1: Quote unquoted IMG references if any
    text = re.sub(r':\s*(IMG_\d+)\s*([,}\]])', r': "\1"\2', text)

    # Fix 2: Handle LaTeX backslashes.
    # Gemini should double-escape (\\frac), but sometimes uses single (\frac).
    # Strategy: any \<letters> where letters form 2+ chars → escape the backslash
    def fix_backslash(match):
        word = match.group(1)
        if len(word) >= 2:
            return '\\\\' + word
        elif word in 'bfnrtu':
            return '\\' + word
        else:
            return '\\\\' + word

    text = re.sub(r'(?<!\\)\\([a-zA-Z]+)', fix_backslash, text)

    # Fix 3: Handle \( and \) LaTeX delimiters
    text = text.replace('\\(', '(').replace('\\)', ')')

    # Fix 4: Handle truncated JSON — try to close it
    text = text.rstrip()
    if not text.endswith('}'):
        # Try to find the last complete question and close the JSON
        logger.warning("Detected potentially truncated JSON response, attempting to repair...")
        text = _repair_truncated_json(text)

    return text


def _repair_truncated_json(text: str) -> str:
    """
    Attempt to repair truncated JSON by closing open structures.
    Works by finding the last complete question object and closing the array/object.
    """
    # Find the last complete question object (ends with })
    # Look for the pattern: }, followed by possible whitespace, then either , or ]
    last_complete = text.rfind('"negativeMarks"')
    if last_complete == -1:
        last_complete = text.rfind('"marks"')
    if last_complete == -1:
        last_complete = text.rfind('"correctAnswer"')

    if last_complete > 0:
        # Find the closing } of this question object after the last key
        close_pos = text.find('}', last_complete)
        if close_pos > 0:
            # Keep everything up to and including this }
            text = text[:close_pos + 1]
            # Close the questions array and outer object
            text += '\n  ]\n}'
            logger.info(f"Repaired truncated JSON (cut at position {close_pos + 1})")
    else:
        # Can't find a good cut point, try brute force closing
        # Count open/close braces and brackets
        open_braces = text.count('{') - text.count('}')
        open_brackets = text.count('[') - text.count(']')

        # Find and remove the last incomplete string
        last_quote = text.rfind('"')
        if last_quote > 0:
            # Check if string is unterminated
            preceding = text[:last_quote]
            if preceding.count('"') % 2 == 0:
                # This quote opens a new string that's unterminated
                text = text[:last_quote] + '"null"'

        # Close remaining open structures
        text += ']' * max(0, open_brackets)
        text += '}' * max(0, open_braces)

    return text


def _extract_questions_regex(text: str) -> List[Dict]:
    """
    Last resort: Try to extract question objects using regex if JSON is completely broken.
    Looks for { ... "question": ... } structures.
    """
    questions = []
    # Try to find all blocks that look like question objects using a non-backtracking approach
    # We look for "question": "..." using standard JSON string parsing logic.
    # No re.DOTALL, strict linear matching to prevent backtracking hangs.
    pattern = r'"question"\s*:\s*"((?:[^"\\]|\\.)*)"'
    matches = re.finditer(pattern, text)
    
    for match in matches:
        try:
            q_text = match.group(1)
            if q_text:
                q_dict = {"question": q_text.strip()}
                questions.append(q_dict)
        except:
            pass
            
    return questions


def group_passage_questions(questions: List[Dict]) -> List[Dict]:
    """
    Ensure consecutive questions that share the exact same non-empty passageContent
    have the exact same groupId so the platform treats them as a comprehension group.
    """
    current_group_id = None
    current_passage_content = None
    current_section = None
    group_counter = 0

    for vq in questions:
        if not isinstance(vq, dict):
            continue
        p_content = vq.get("passageContent")
        p_content_stripped = p_content.strip() if isinstance(p_content, str) else ""
        section_name = vq.get("section_name")
        
        if p_content_stripped:
            existing_group_id = vq.get("groupId")
            if existing_group_id:
                current_group_id = existing_group_id
                current_passage_content = p_content_stripped
                current_section = section_name
            else:
                if (current_passage_content == p_content_stripped and 
                    current_group_id and 
                    current_section == section_name):
                    vq["groupId"] = current_group_id
                else:
                    group_counter += 1
                    current_group_id = f"passage_group_{group_counter}"
                    current_passage_content = p_content_stripped
                    current_section = section_name
                    vq["groupId"] = current_group_id
        else:
            current_group_id = None
            current_passage_content = None
            current_section = None
            
    return questions


async def _parse_response(raw_text: str, embedded_images: List[Dict]) -> Dict:
    """Parse Gemini response into our strict Question format"""
    
    # DEBUG: dump raw response to analyze
    try:
        with open("/tmp/gemini_raw_output_debug.txt", "a", encoding="utf-8") as f:
            f.write("\n\n==== NEW RESPONSE ====\n\n")
            f.write(raw_text)
    except:
        pass

    # Clean markdown code fences if present
    clean = raw_text.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    elif clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    clean = clean.strip()

    # Try parsing raw first, then sanitize if needed
    try:
        data = json.loads(clean)
    except json.JSONDecodeError as e:
        logger.info(f"Raw JSON parse failed: {e}. Applying sanitization...")
        sanitized = _sanitize_gemini_json(clean)
        try:
            data = json.loads(sanitized)
            logger.info("Sanitized JSON parsed successfully")
        except json.JSONDecodeError as e2:
            logger.error(f"JSON parse error after sanitization: {e2}")
            # Last resort: try regex extraction of questions
            logger.info("Attempting regex fallback extraction...")
            questions_fallback = _extract_questions_regex(sanitized)
            if questions_fallback:
                logger.info(f"Regex extracted {len(questions_fallback)} questions")
                data = {"questions": questions_fallback, "is_regex_fallback": True}
            else:
                raise ValueError(f"AI returned invalid JSON: {e2}")

    questions = []
    sections = data.get("sections", [])
    if sections and isinstance(sections, list):
        for s in sections:
            if isinstance(s, dict):
                sec_name = s.get("name") or s.get("title") or "General"
                sec_id = s.get("id")
                sec_attempt = s.get("attempt_control")
                for q in s.get("questions", []):
                    if isinstance(q, dict):
                        q["section_name"] = sec_name
                        if sec_id:
                            q["section_id"] = sec_id
                        if sec_attempt:
                            q["section_attempt_control"] = sec_attempt
                        questions.append(q)
    else:
        questions = data.get("questions", [])
        if not isinstance(questions, list):
            questions = []
        for q in questions:
            if isinstance(q, dict):
                if "section" in q and "section_name" not in q:
                    q["section_name"] = q["section"]
            
    if not questions:
        logger.warning(f"AI returned 0 questions. Raw snippet: {clean[:500]}")
        # Don't raise error, just return empty so batch can fail gracefully without breaking pipeline
        return {"questions": []}

    # Identify referenced image placeholders from the parsed questions
    referenced_placeholders = set()
    for q in questions:
        if not isinstance(q, dict):
            continue
        
        # Check in question text
        question_text = q.get("question") or q.get("questionText") or ""
        for match in re.findall(r'(image_\d+)', question_text):
            referenced_placeholders.add(match)
            
        # Check in imagePlaceholder field
        image_placeholder = q.get("imagePlaceholder")
        if image_placeholder and isinstance(image_placeholder, str):
            match = re.search(r'(image_\d+)', image_placeholder)
            if match:
                referenced_placeholders.add(match.group(1))

    # Upload ONLY the referenced embedded images to Cloudinary
    referenced_images = [img for img in embedded_images if img.get("id") in referenced_placeholders]
    if referenced_images:
        logger.info(f"Uploading {len(referenced_images)} referenced embedded images to Cloudinary...")
        async def _upload(img_info):
            try:
                import base64
                raw_bytes = base64.b64decode(img_info["data"])
                url = await upload_image_to_cloudinary(raw_bytes)
                if url:
                    img_info["cloudinary_url"] = url
                    img_info["base64_uri"] = url
            except Exception as e:
                logger.error(f"Referenced diagram upload failed: {e}")
        await asyncio.gather(*[_upload(img) for img in referenced_images])

    # Build image lookup for placeholder replacement
    placeholder_map = {}
    for img in embedded_images:
        placeholder_map[img["id"]] = img.get("cloudinary_url", img.get("base64_uri"))

    def replace_placeholders(text: str) -> str:
        if not text:
            return text
        for placeholder, url in placeholder_map.items():
            text = text.replace(f"![image]({placeholder})", f"![image]({url})")
            text = text.replace(f"![diagram]({placeholder})", f"![image]({url})")
        return text

    # Validate and match diagrams
    validated = []
    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            continue

        question_text = q.get("question") or q.get("questionText") or ""
        if not question_text:
            logger.warning(f"Question {i + 1} has no text, skipping")
            continue

        question_text = replace_placeholders(question_text)

        # Match main question image placeholder
        q_image = q.get("image")
        image_placeholder = q.get("imagePlaceholder")
        if image_placeholder and isinstance(image_placeholder, str):
            match = re.search(r'(image_\d+)', image_placeholder)
            if match:
                image_placeholder = match.group(1)

        # If image is already a data URI or URL, keep it
        if q_image and isinstance(q_image, str) and (q_image.startswith("data:") or q_image.startswith("http")):
            pass  # keep as-is
        elif image_placeholder and image_placeholder in placeholder_map:
            q_image = placeholder_map[image_placeholder]
        else:
            if not q_image:
                q_image = None

        # Ensure options exist (not for numerical type)
        options = q.get("options", {})
        q_type = q.get("type", "single")
        if not options and q_type != "numerical":
            options = {"A": "", "B": "", "C": "", "D": ""}
        
        # Replace placeholders in options
        if isinstance(options, dict):
            for k, v in options.items():
                if isinstance(v, str):
                    options[k] = wrap_bare_latex(replace_placeholders(v))
                elif isinstance(v, dict) and "text" in v:
                    v["text"] = wrap_bare_latex(replace_placeholders(v["text"]))

        sec_name = q.get("section_name")
        sec_id = q.get("section_id")
        sec_attempt = q.get("section_attempt_control")

        val_q = {
            "id": q.get("id", i + 1),
            "type": q_type,
            "question": question_text,
            "image": q_image,
            "diagram_bbox": q.get("diagram_bbox"),
            "options": options,
            "optionImages": q.get("optionImages", {k: None for k in options.keys()} if options else {}),
            "correctAnswer": q.get("correctAnswer"),
            "marks": q.get("marks", 4),
            "negativeMarks": q.get("negativeMarks", 1),
            "crossPage": q.get("crossPage", False),
            "groupId": q.get("groupId", ""),
            "passageContent": q.get("passageContent", ""),
        }
        if sec_name:
            val_q["section_name"] = sec_name
        if sec_id:
            val_q["section_id"] = sec_id
        if sec_attempt:
            val_q["section_attempt_control"] = sec_attempt

        validated.append(val_q)

    # ── POST-PROCESSING ──────────────────────────────────────────────────
    
    # Regex to strip ONLY single-digit (1-4) option numbering prefixes
    # IMPORTANT: Must NOT match multi-digit numbers like "64.97" which are actual content
    option_prefix_re = re.compile(r'^\s*(?:[1-4]\)\s+|\([1-4]\)\s+|\([a-dA-D]\)\s+|[A-Da-d]\.\s+)')
    
    # Regex to strip citation markers like [cite: 23] or [cite:44 45]
    citation_re = re.compile(r'\[cite:\s*[^\]]*\]')
    
    def _strip_citations(text: str) -> str:
        """Remove all [cite: ...] markers from text."""
        if not text:
            return text
        return citation_re.sub('', text).strip()
    
    def _strip_option_prefix(text: str) -> str:
        """Remove leading numbering from option text (e.g. '1. answer' → 'answer')."""
        if not text:
            return text
        return option_prefix_re.sub('', text).strip()
    
    for vq in validated:
        # 1. Strip citation markers from question text, options, and passage
        vq["question"] = _strip_citations(vq.get("question", ""))
        if vq.get("passageContent"):
            vq["passageContent"] = _strip_citations(vq["passageContent"])
        
        # 2. Strip option numbering prefixes and citations from option values
        if isinstance(vq.get("options"), dict):
            for k, v in vq["options"].items():
                if isinstance(v, str):
                    v = _strip_citations(v)
                    v = _strip_option_prefix(v)
                    vq["options"][k] = v
                elif isinstance(v, dict) and "text" in v:
                    v["text"] = _strip_citations(v["text"])
                    v["text"] = _strip_option_prefix(v["text"])
        
        # 3. Resolve imagePlaceholder → Cloudinary URL if not already done
        if not vq.get("image") and vq.get("imagePlaceholder"):
            placeholder = vq["imagePlaceholder"]
            if placeholder in placeholder_map:
                vq["image"] = placeholder_map[placeholder]
    
    # 3.5 Group consecutive passage questions sharing identical passageContent
    validated = group_passage_questions(validated)
    
    # 4. Sort by original ID (as extracted) and re-assign sequential IDs
    try:
        validated.sort(key=lambda x: int(x.get("id", 0)))
    except (ValueError, TypeError):
        pass  # If IDs aren't integers, keep original order
    
    for idx, vq in enumerate(validated):
        vq["id"] = idx + 1
    
    logger.info(f"Post-processed {len(validated)} questions (sequential IDs, stripped prefixes, resolved images)")
    # ── END POST-PROCESSING ───────────────────────────────────────────────

    result = {
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "duration": data.get("duration", "180"),
        "maxMarks": data.get("maxMarks", ""),
        "questions": validated,
        "canConfirm": all(q.get("correctAnswer") is not None for q in validated),
        "unansweredCount": sum(1 for q in validated if q.get("correctAnswer") is None),
        "is_regex_fallback": data.get("is_regex_fallback", False)
    }

    # Include revision notes for generate mode
    if data.get("revision_notes"):
        result["revision_notes"] = data.get("revision_notes")

    return result


# =============================================================================
# ULTRA-FAST STREAMING PROCESSING - NEW IMPLEMENTATION
# =============================================================================

async def process_files_stream(
    file_data: List[Dict], 
    mode: str = "extract", 
    answer_key: Optional[Dict] = None,
    progress_callback: Optional[Callable] = None,
    question_callback: Optional[Callable] = None,
    max_concurrent: int = 15
) -> Dict:
    """
    ULTRA-FAST Stream-enabled file processing with:
    - Quality-based adaptive DPI selection
    - Parallel batch processing (up to 15 concurrent)
    - Real-time progress updates via callbacks
    - Progressive question streaming
    - Smart content analysis for optimal processing
    
    Expected speed improvement: 70-85% faster than sequential processing
    """
    if not client:
        raise ValueError("Vertex AI client not initialized")
    
    logger.info(f"🚀 Starting ULTRA-FAST stream processing with {len(file_data)} file(s)...")
    page_sources = build_page_sources(file_data)
    
    # Step 1: Notify upload start
    if progress_callback:
        await progress_callback({
            'stage': 'uploading',
            'percent': 10,
            'message': 'Receiving and validating files...'
        })
    
    # Step 2: Quick file preparation (no rendering yet)
    all_files_info = []
    for file_info in file_data:
        filename = file_info["filename"]
        content = file_info["content"]
        
        if is_pdf(content):
            all_files_info.append({
                'type': 'pdf',
                'filename': filename,
                'content': content
            })
        elif is_image(filename):
            all_files_info.append({
                'type': 'image',
                'filename': filename,
                'content': content
            })
    
    # Step 3: ULTRA-FAST Quality Analysis (sample first 3 pages)
    if progress_callback:
        await progress_callback({
            'stage': 'analyzing',
            'percent': 20,
            'message': 'Analyzing image quality...'
        })
    
    from ai_preview_importer.quality_analyzer import QualityAnalyzer
    
    # Analyze quality of sample pages to determine optimal settings
    quality_results = []
    sample_pages = []
    
    # Extract sample pages for quality analysis
    for file_info in all_files_info[:3]:  # Check first 3 files max
        if file_info['type'] == 'image':
            sample_pages.append(file_info['content'])
        elif file_info['type'] == 'pdf':
            # Render first page at 150 DPI for quick analysis
            try:
                doc = fitz.open(stream=file_info['content'], filetype="pdf")
                if len(doc) > 0:
                    page = doc[0]
                    rect = page.rect
                    max_dim = 1600
                    scale = min(max_dim / rect.width, max_dim / rect.height)
                    if scale > (150/72):
                        scale = 150/72
                    mat = fitz.Matrix(scale, scale)
                    pix = page.get_pixmap(matrix=mat, alpha=False)
                    sample_pages.append(pix.tobytes("jpg"))
                doc.close()
            except Exception as e:
                logger.warning(f"Failed to extract sample page: {e}")
        
        if len(sample_pages) >= 3:
            break
    
    # Analyze sample pages
    for page_bytes in sample_pages:
        try:
            quality = QualityAnalyzer.analyze_page(page_bytes)
            quality_results.append(quality)
        except Exception as e:
            logger.warning(f"Quality analysis failed for sample: {e}")
    
    # Determine final settings based on quality
    if quality_results:
        avg_score = sum(q['score'] for q in quality_results) / len(quality_results)
        
        # Check minimum quality
        is_acceptable, warning_msg = QualityAnalyzer.check_minimum_quality(avg_score)
        if not is_acceptable:
            raise ValueError(warning_msg)
        
        # Determine DPI based on quality
        if avg_score >= 0.8:
            selected_dpi = 150
            quality_tier = 'high'
        elif avg_score >= 0.5:
            selected_dpi = 200
            quality_tier = 'medium'
        else:
            selected_dpi = 300
            quality_tier = 'low'
        
        # Show warning for low quality
        if warning_msg and progress_callback:
            await progress_callback({
                'stage': 'analyzing',
                'percent': 30,
                'message': warning_msg,
                'data': {
                    'quality_tier': quality_tier,
                    'dpi': selected_dpi,
                    'quality_score': avg_score,
                    'warning': True
                }
            })
    else:
        # Default to medium if analysis fails
        selected_dpi = 200
        quality_tier = 'medium'
        avg_score = 0.5
    
    if progress_callback:
        await progress_callback({
            'stage': 'analyzing',
            'percent': 30,
            'message': f'Quality: {quality_tier} tier, using {selected_dpi} DPI for optimal speed',
            'data': {
                'quality_tier': quality_tier,
                'dpi': selected_dpi,
                'quality_score': avg_score
            }
        })
    
    # Step 4: ULTRA-FAST Parallel Page Rendering
    if progress_callback:
        await progress_callback({
            'stage': 'processing',
            'percent': 35,
            'message': f'Rendering pages at {selected_dpi} DPI...'
        })
    
    # Render all pages in parallel
    render_tasks = []
    for file_info in all_files_info:
        if file_info['type'] == 'pdf':
            task = asyncio.create_task(_render_pdf_pages(file_info['content'], selected_dpi))
            render_tasks.append(task)
        else:  # image
            render_tasks.append(asyncio.create_task(_process_image(file_info['content'])))
    
    # Wait for all renders to complete
    render_results = await asyncio.gather(*render_tasks)
    
    # Flatten results
    all_page_images = []
    all_embedded_images = []
    
    for result in render_results:
        if isinstance(result, tuple):  # PDF result
            pages, embedded = result
            all_page_images.extend(pages)
            all_embedded_images.extend(embedded)
        else:  # Single image
            all_page_images.append(result)
    
    total_pages = len(all_page_images)
    
    if total_pages == 0:
        raise ValueError("No pages could be rendered from the provided files")
    
    logger.info(f"✅ Rendered {total_pages} pages at {selected_dpi} DPI")
    
    # 4.5 Upload all embedded images to Cloudinary concurrently
    if progress_callback:
        await progress_callback({
            'stage': 'processing',
            'percent': 35,
            'message': f'Uploading {len(all_embedded_images)} diagrams to Cloudinary...'
        })
        
    upload_tasks = []
    async def upload_and_update(img_info):
        try:
            # Decode the base64 we created earlier
            raw_bytes = base64.b64decode(img_info["data"])
            cloudinary_url = await upload_image_to_cloudinary(raw_bytes)
            if cloudinary_url:
                img_info["cloudinary_url"] = cloudinary_url
                img_info["base64_uri"] = cloudinary_url
        except Exception as e:
            logger.error(f"Failed to upload diagram on page {img_info['page']}: {e}")
            
    upload_tasks = [upload_and_update(img) for img in all_embedded_images]
    if upload_tasks:
        await asyncio.gather(*upload_tasks)
    
    prompt = EXTRACT_PROMPT if mode == 'extract' else GENERATE_PROMPT
    
    # Step 5: Process pages (use single batch for smaller files, chunked for larger ones)
    SINGLE_BATCH_PAGE_LIMIT = 15
    first_batch_title = None
    first_batch_desc = None
    
    if total_pages <= SINGLE_BATCH_PAGE_LIMIT:
        logger.info(f"Processing all {total_pages} pages in a single batch (streaming)...")
        if progress_callback:
            await progress_callback({
                'stage': 'processing',
                'percent': 40,
                'message': f'Sending all {total_pages} pages to Gemini in a single request...',
                'data': {
                    'total_pages': total_pages,
                    'total_batches': 1,
                    'dpi': selected_dpi
                }
            })
            
        content_parts = [prompt]
        for idx, page_img in enumerate(all_page_images):
            content_parts.append(f"\n--- PAGE {idx + 1} of {total_pages} ---\n")
            content_parts.append(
                types.Part.from_bytes(data=page_img, mime_type="image/jpeg")
            )
        append_extracted_images_to_content(content_parts, all_embedded_images)
            
        try:
            raw_text = await _call_gemini_with_retry(content_parts, batch_num=1)
            
            if progress_callback:
                await progress_callback({
                    'stage': 'processing',
                    'percent': 80,
                    'message': 'Parsing single batch response from Gemini...',
                    'data': {
                        'total_pages': total_pages,
                        'total_batches': 1,
                        'dpi': selected_dpi
                    }
                })
                
            batch_result = await _parse_response(raw_text, all_embedded_images)
            unique_questions = batch_result.get("questions", [])
            
            await process_diagram_bboxes(unique_questions, page_sources)
            
            if not unique_questions:
                raise ValueError("No questions could be extracted in single batch streaming mode.")
                
            # Stream individual questions if callback is provided
            if question_callback:
                for q in unique_questions:
                    try:
                        await question_callback({
                            'type': 'question',
                            'question': q,
                            'batch': 1
                        })
                    except Exception as e:
                        logger.warning(f"Failed to stream question: {e}")
            
            # Match answer key if provided
            if answer_key:
                answer_key_mappings = await process_answer_key(answer_key)
                unique_questions = _match_answer_key(unique_questions, answer_key_mappings)
            
            # Final progress update
            if progress_callback:
                await progress_callback({
                    'stage': 'complete',
                    'percent': 100,
                    'message': f'Complete! Extracted {len(unique_questions)} questions.',
                    'data': {
                        'questions_count': len(unique_questions),
                        'total_batches': 1,
                        'successful_batches': 1,
                        'failed_batches': 0,
                        'quality_tier': quality_tier,
                        'dpi_used': selected_dpi
                    }
                })
            
            has_sections = any(q.get("section_name") for q in unique_questions)
            
            result = {
                'title': batch_result.get("title") or 'Extracted Exam',
                'description': batch_result.get("description") or f'Extracted from {total_pages} pages',
                'questions': [
                    {k: v for k, v in q.items() if k not in ["section_name", "section_id", "section_attempt_control"]}
                    for q in unique_questions
                ],
                'canConfirm': all(q.get('correctAnswer') is not None for q in unique_questions),
                'unansweredCount': sum(1 for q in unique_questions if q.get('correctAnswer') is None),
                'quality_tier': quality_tier,
                'dpi_used': selected_dpi
            }
            
            if has_sections:
                sections_map = {}
                sections_list = []
                for q in unique_questions:
                    sec_name = q.get("section_name") or "General"
                    sec_key = sec_name.strip().lower()
                    if sec_key not in sections_map:
                        attempt_control = q.get("section_attempt_control") or {"enabled": False}
                        sec_obj = {
                            "id": q.get("section_id") or f"section-{len(sections_list) + 1}",
                            "name": sec_name,
                            "attempt_control": attempt_control,
                            "questions": []
                        }
                        sections_map[sec_key] = sec_obj
                        sections_list.append(sec_obj)
                    
                    q_clean = {k: v for k, v in q.items() if k not in ["section_name", "section_id", "section_attempt_control"]}
                    sections_map[sec_key]["questions"].append(q_clean)
                
                result["enable_section_mode"] = True
                result["sections"] = sections_list

            return result
            
        except Exception as e:
            logger.error(f"Error in single batch streaming: {e}. Falling back to chunked processing...")

    # Fallback/chunked mode for larger files
    MAX_PAGES_PER_BATCH = 5
    OVERLAP_PAGES = 1
    
    batches = []
    start_idx = 0
    batch_num = 0
    
    while start_idx < total_pages:
        batch_num += 1
        end_idx = min(start_idx + MAX_PAGES_PER_BATCH, total_pages)
        
        if start_idx == 0:
            batch_images = all_page_images[start_idx:end_idx]
            batch_start_page = start_idx
        else:
            # Include overlap page from previous batch
            batch_images = all_page_images[start_idx - OVERLAP_PAGES:end_idx]
            batch_start_page = start_idx - OVERLAP_PAGES
        
        # Filter batch-specific embedded images
        batch_embedded = [img for img in all_embedded_images if batch_start_page + 1 <= img["page"] <= batch_start_page + len(batch_images)]
        
        batches.append({
            'batch_num': batch_num,
            'start_page': batch_start_page,
            'images': batch_images,
            'mode': mode,
            'embedded_images': all_embedded_images,
            'batch_embedded': batch_embedded,
            'total_pages': total_pages
        })
        
        start_idx = end_idx
    
    total_batches = len(batches)
    logger.info(f"📦 Created {total_batches} batches for parallel processing")
    
    if progress_callback:
        await progress_callback({
            'stage': 'processing',
            'percent': 40,
            'message': f'Processing {total_pages} pages in {total_batches} parallel batches...',
            'data': {
                'total_pages': total_pages,
                'total_batches': total_batches,
                'dpi': selected_dpi
            }
        })
    
    # Step 6: ULTRA-FAST Parallel Batch Processing with Semaphore
    semaphore = asyncio.Semaphore(max_concurrent)
    all_questions = []
    completed_batches = 0
    total_questions_found = 0
    
    async def process_batch_with_progress(batch_data):
        nonlocal completed_batches, total_questions_found, first_batch_title, first_batch_desc
        
        async with semaphore:
            batch_num = batch_data['batch_num']
            
            if progress_callback:
                await progress_callback({
                    'stage': 'processing',
                    'percent': 40 + (completed_batches / total_batches) * 40,
                    'message': f'Processing batch {batch_num} of {total_batches} ({total_questions_found} questions found)...',
                    'data': {
                        'batch': batch_num,
                        'total_batches': total_batches,
                        'questions_found': total_questions_found
                    }
                })
            
            try:
                result_data = await _process_single_batch_stream(
                    batch_data, 
                    question_callback=question_callback
                )
                questions = result_data["questions"]
                
                if batch_num == 1:
                    first_batch_title = result_data.get("title")
                    first_batch_desc = result_data.get("description")
                
                completed_batches += 1
                total_questions_found += len(questions)
                
                logger.info(f"✅ Batch {batch_num}: Extracted {len(questions)} questions")
                return {'success': True, 'questions': questions, 'batch': batch_num}
                
            except Exception as e:
                logger.error(f"❌ Batch {batch_num} failed: {e}")
                completed_batches += 1
                return {'success': False, 'error': str(e), 'batch': batch_num}
    
    # Process ALL batches in parallel
    logger.info(f"🚀 Launching {total_batches} parallel batch processors...")
    batch_tasks = [process_batch_with_progress(batch) for batch in batches]
    batch_results = await asyncio.gather(*batch_tasks)
    
    # Collect successful results
    failed_batches = []
    for result in batch_results:
        if result['success']:
            all_questions.extend(result['questions'])
        else:
            failed_batches.append(result)
    
    if failed_batches:
        logger.warning(f"⚠️ {len(failed_batches)} batches failed: {[b['batch'] for b in failed_batches]}")
        if len(failed_batches) == total_batches:
            errors = [b.get('error', 'Unknown Error') for b in failed_batches]
            unique_errors = list(set(errors))
            error_details = "\n".join(f"- {err}" for err in unique_errors)
            raise ValueError(f"Extraction aborted. All {total_batches} batches failed due to the following API errors:\n{error_details}")
    
    logger.info(f"📊 Total questions extracted: {len(all_questions)}")
    
    # Step 7: Finalize results
    if progress_callback:
        await progress_callback({
            'stage': 'finalizing',
            'percent': 90,
            'message': 'Merging cross-page questions and matching answers...'
        })
    
    # Merge cross-page questions
    unique_questions = merge_cross_page_questions(all_questions)
    
    await process_diagram_bboxes(unique_questions, page_sources)
    
    # ── STREAM POST-PROCESSING (same as _parse_response) ─────────────────
    # IMPORTANT: Only match single-digit 1-4 numbering, NOT multi-digit content like "64.97"
    option_prefix_re = re.compile(r'^\s*(?:[1-4]\)\s+|\([1-4]\)\s+|\([a-dA-D]\)\s+|[A-Da-d]\.\s+)')
    citation_re = re.compile(r'\[cite:\s*[^\]]*\]')
    
    # Build placeholder → Cloudinary URL lookup
    placeholder_map = {}
    for img in all_embedded_images:
        placeholder_map[img.get("id", "")] = img.get("cloudinary_url", img.get("base64_uri", ""))
    
    for vq in unique_questions:
        # Strip citations
        if isinstance(vq.get("question"), str):
            vq["question"] = citation_re.sub('', vq["question"]).strip()
        if isinstance(vq.get("passageContent"), str) and vq["passageContent"]:
            vq["passageContent"] = citation_re.sub('', vq["passageContent"]).strip()
        
        # Strip option numbering prefixes and citations
        if isinstance(vq.get("options"), dict):
            for k, v in vq["options"].items():
                if isinstance(v, str):
                    v = citation_re.sub('', v).strip()
                    v = option_prefix_re.sub('', v).strip()
                    v = wrap_bare_latex(v)
                    vq["options"][k] = v
        
        # Resolve imagePlaceholder → Cloudinary URL
        if not vq.get("image"):
            placeholder = vq.get("imagePlaceholder", "")
            if placeholder and isinstance(placeholder, str):
                match = re.search(r'(image_\d+)', placeholder)
                if match:
                    placeholder = match.group(1)
            if placeholder and placeholder in placeholder_map:
                vq["image"] = placeholder_map[placeholder]
    
    # Group consecutive passage questions sharing identical passageContent
    unique_questions = group_passage_questions(unique_questions)
    
    # Sort by original ID and re-assign sequential IDs
    try:
        unique_questions.sort(key=lambda x: int(x.get("id", 0)))
    except (ValueError, TypeError):
        pass
    for idx, vq in enumerate(unique_questions):
        vq["id"] = idx + 1
    
    logger.info(f"Post-processed {len(unique_questions)} streaming questions")
    # ── END STREAM POST-PROCESSING ────────────────────────────────────────
    
    # Match answer key if provided
    if answer_key:
        answer_key_mappings = await process_answer_key(answer_key)
        unique_questions = _match_answer_key(unique_questions, answer_key_mappings)
    
    # Final progress update
    if progress_callback:
        await progress_callback({
            'stage': 'complete',
            'percent': 100,
            'message': f'Complete! Extracted {len(unique_questions)} questions.',
            'data': {
                'questions_count': len(unique_questions),
                'total_batches': total_batches,
                'successful_batches': sum(1 for r in batch_results if r['success']),
                'failed_batches': len(failed_batches),
                'quality_tier': quality_tier,
                'dpi_used': selected_dpi
            }
        })
    
    has_sections = any(q.get("section_name") for q in unique_questions)
    
    result = {
        'title': first_batch_title or 'Extracted Exam',
        'description': first_batch_desc or f'Extracted from {total_pages} pages',
        'questions': [
            {k: v for k, v in q.items() if k not in ["section_name", "section_id", "section_attempt_control"]}
            for q in unique_questions
        ],
        'canConfirm': all(q.get('correctAnswer') is not None for q in unique_questions),
        'unansweredCount': sum(1 for q in unique_questions if q.get('correctAnswer') is None),
        'quality_tier': quality_tier,
        'dpi_used': selected_dpi
    }
    
    if has_sections:
        sections_map = {}
        sections_list = []
        for q in unique_questions:
            sec_name = q.get("section_name") or "General"
            sec_key = sec_name.strip().lower()
            if sec_key not in sections_map:
                attempt_control = q.get("section_attempt_control") or {"enabled": False}
                sec_obj = {
                    "id": q.get("section_id") or f"section-{len(sections_list) + 1}",
                    "name": sec_name,
                    "attempt_control": attempt_control,
                    "questions": []
                }
                sections_map[sec_key] = sec_obj
                sections_list.append(sec_obj)
            
            q_clean = {k: v for k, v in q.items() if k not in ["section_name", "section_id", "section_attempt_control"]}
            sections_map[sec_key]["questions"].append(q_clean)
        
        result["enable_section_mode"] = True
        result["sections"] = sections_list

    return result


async def _render_pdf_pages(pdf_bytes: bytes, dpi: int) -> Tuple[List[bytes], List[Dict]]:
    """Render PDF pages to images asynchronously"""
    loop = asyncio.get_event_loop()
    
    def render():
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_images = []
        
        max_dim = 2048 if dpi >= 300 else 1600
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            rect = page.rect
            scale = min(max_dim / rect.width, max_dim / rect.height)
            if scale > (dpi / 72):
                scale = dpi / 72
            mat = fitz.Matrix(scale, scale)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes("jpg")
            page_images.append(img_bytes)
        
        # Also extract embedded images
        embedded = extract_embedded_images(pdf_bytes)
        
        doc.close()
        return page_images, embedded
    
    return await loop.run_in_executor(None, render)


async def _process_image(image_bytes: bytes) -> bytes:
    """Process single image asynchronously"""
    loop = asyncio.get_event_loop()
    
    def process():
        return convert_image_to_bytes(image_bytes)
    
    return await loop.run_in_executor(None, process)


async def _process_single_batch_stream(
    batch_data: Dict,
    question_callback: Optional[Callable] = None
) -> Dict:
    """
    Process a single batch and stream questions immediately
    """
    batch_num = batch_data['batch_num']
    start_page = batch_data['start_page']
    images = batch_data['images']
    mode = batch_data['mode']
    embedded_images = batch_data['embedded_images']
    total_pages = batch_data['total_pages']
    
    prompt = EXTRACT_PROMPT if mode == 'extract' else GENERATE_PROMPT
    
    # Build content parts
    content_parts = [prompt]
    
    for i, page_img in enumerate(images):
        actual_page_num = start_page + i + 1
        content_parts.append(f"\n--- PAGE {actual_page_num} of {total_pages} ---\n")
        content_parts.append(
            types.Part.from_bytes(data=page_img, mime_type="image/jpeg")
        )
        
    batch_embedded = batch_data.get('batch_embedded', [])
    append_extracted_images_to_content(content_parts, batch_embedded)
    
    # Call Gemini with retry
    raw_text = await _call_gemini_with_retry(content_parts, batch_num)
    
    # Parse response
    batch_result = await _parse_response(raw_text, embedded_images)
    questions = batch_result.get("questions", [])
    
    # Adjust relative page numbers to global ones
    batch_size = len(images)
    for q in questions:
        bbox = q.get("diagram_bbox")
        if bbox and isinstance(bbox, dict):
            p_num = bbox.get("page_number")
            if p_num is not None:
                try:
                    p_num = int(p_num)
                    if p_num <= batch_size and start_page > 0:
                        bbox["page_number"] = start_page + p_num
                        logger.info(f"Adjusted relative page_number {p_num} to global {start_page + p_num} for Q {q.get('id')}")
                except (ValueError, TypeError):
                    pass
                    
    # Stream questions immediately if callback provided
    if question_callback:
        for q in questions:
            try:
                await question_callback({
                    'type': 'question',
                    'question': q,
                    'batch': batch_num
                })
            except Exception as e:
                logger.warning(f"Failed to stream question: {e}")
    
    return {
        "questions": questions,
        "title": batch_result.get("title"),
        "description": batch_result.get("description")
    }
