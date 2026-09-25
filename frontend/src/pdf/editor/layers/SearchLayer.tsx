import type { PageKey } from '../../engine/edits';
import { useEditor } from '../EditorContext';
import type { View } from '../geometry';

export default function SearchLayer({ pageKey, view }: { pageKey: PageKey; view: View }) {
    const { search } = useEditor();
    if (!search.query) return null;
    const active = search.matches[search.active];
    return (
        <div className="pointer-events-none absolute inset-0" style={{ zIndex: 15 }}>
            {search.matches.map((m, i) =>
                m.page !== pageKey
                    ? null
                    : m.rects.map((r, k) => {
                          const b = view.rectToScreen(r);
                          const isActive = m === active;
                          return (
                              <div
                                  key={`${i}-${k}`}
                                  className="absolute rounded-[2px]"
                                  style={{
                                      left: b.left - 1,
                                      top: b.top - 1,
                                      width: b.width + 2,
                                      height: b.height + 2,
                                      background: isActive ? 'rgba(16,185,129,0.38)' : 'rgba(250,204,21,0.38)',
                                      mixBlendMode: 'multiply',
                                      outline: isActive ? '2px solid rgb(5 150 105)' : undefined,
                                  }}
                              />
                          );
                      }),
            )}
        </div>
    );
}
