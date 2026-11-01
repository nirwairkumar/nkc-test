import React from 'react';
import { ChevronRight, KeyRound, Layers, PenLine, Upload } from 'lucide-react';
import { IconTile, Panel, type Tone } from './dashboardUi';

interface CreateCardProps {
    onUploadPaper: () => void;
    onTypeQuestions: () => void;
    onCombine: () => void;
    /** Give a saved test to a batch with a 6-digit code (an exam session). */
    onJoinCode?: () => void;
    className?: string;
}

/** The ways educators actually make a paper, and the join-code way of giving one. */
export default function CreateCard({ onUploadPaper, onTypeQuestions, onCombine, onJoinCode, className = '' }: CreateCardProps) {
    const options: { icon: React.ComponentType<{ className?: string }>; tone: Tone; title: string; body: string; onClick: () => void }[] = [
        { icon: Upload, tone: 'violet', title: 'Upload a question paper', body: 'PDF or photo. AI types it in.', onClick: onUploadPaper },
        { icon: PenLine, tone: 'sky', title: 'Type or paste questions', body: 'With the maths keyboard.', onClick: onTypeQuestions },
        { icon: Layers, tone: 'amber', title: 'Combine two papers', body: 'Paper I + II with a break.', onClick: onCombine },
    ];
    if (onJoinCode) {
        options.push({ icon: KeyRound, tone: 'emerald', title: 'Give a test with a code', body: 'They type it at testoza.com/join.', onClick: onJoinCode });
    }

    return (
        <Panel id="create-heading" title="Make a new test" className={className}>
            <ul className="divide-y divide-slate-100">
                {options.map(o => (
                    <li key={o.title}>
                        <button
                            type="button"
                            onClick={o.onClick}
                            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 cursor-pointer"
                        >
                            <IconTile icon={o.icon} tone={o.tone} size="sm" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] font-semibold text-slate-900">{o.title}</span>
                                <span className="block truncate text-[12.5px] text-slate-500">{o.body}</span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                        </button>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}
