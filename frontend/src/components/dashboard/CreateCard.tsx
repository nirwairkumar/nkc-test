import React from 'react';
import { ChevronRight, Layers, PenLine, Upload } from 'lucide-react';
import { CARD, IconTile, type Tone } from './dashboardUi';

interface CreateCardProps {
    onUploadPaper: () => void;
    onTypeQuestions: () => void;
    onCombine: () => void;
}

/** The three ways teachers actually make a paper — no separate AI studio, tool grid or badges. */
export default function CreateCard({ onUploadPaper, onTypeQuestions, onCombine }: CreateCardProps) {
    const options: { icon: React.ComponentType<{ className?: string }>; tone: Tone; title: string; body: string; onClick: () => void }[] = [
        { icon: Upload, tone: 'violet', title: 'Upload a question paper', body: 'PDF, Word or a photo. AI types it in, with maths and diagrams.', onClick: onUploadPaper },
        { icon: PenLine, tone: 'sky', title: 'Type or paste questions', body: 'Write your own, with the maths keyboard.', onClick: onTypeQuestions },
        { icon: Layers, tone: 'amber', title: 'Combine two papers', body: 'Paper I + Paper II with a break, like JEE Advanced.', onClick: onCombine },
    ];

    return (
        <section aria-labelledby="create-heading" className={`${CARD} overflow-hidden`}>
            <h2 id="create-heading" className="px-4 pt-4 text-[17px] font-semibold tracking-[-0.01em] text-slate-900 sm:px-5">
                Make a new test
            </h2>
            <ul className="mt-2 divide-y divide-slate-100">
                {options.map(o => (
                    <li key={o.title}>
                        <button
                            type="button"
                            onClick={o.onClick}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:px-5 cursor-pointer"
                        >
                            <IconTile icon={o.icon} tone={o.tone} />
                            <span className="min-w-0 flex-1">
                                <span className="block text-[15px] font-semibold text-slate-900">{o.title}</span>
                                <span className="block text-[13px] leading-snug text-slate-600">{o.body}</span>
                            </span>
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
