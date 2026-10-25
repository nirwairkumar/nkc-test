import React from 'react';
import { ChevronDown, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { PILL_BTN, Panel, WhatsAppIcon } from './dashboardUi';
import { copyText } from './format';

/** The note an educator sends before the first online test, so the class isn't surprised. */
function announcementText(signedBy: string) {
    return [
        'Dear all,',
        '',
        'From this week, our tests will be online. 📱',
        '',
        '• You will get the exam link in this group before the test.',
        '• Open it on any phone or computer. No app, no sign-up.',
        '• Enter your name and roll no, then tap Start.',
        '• Answers are checked automatically, so results come faster.',
        ...(signedBy ? ['', `— ${signedBy}`] : []),
    ].join('\n');
}

/** The worries that stop a first online exam, each with a short, true answer. */
export default function DoubtsCard({ signedBy }: { signedBy: string }) {
    const note = announcementText(signedBy);
    const copyNote = async () => {
        const ok = await copyText(note);
        if (ok) toast.success('Note copied. Paste it in your class group.');
        else toast.error('Could not copy the note');
    };

    const items: { q: string; a: React.ReactNode }[] = [
        {
            q: 'Not every candidate has a phone.',
            a: 'Use the computer lab, or set a start and end time so they write from home on a family phone. The same link works on any phone or computer.',
        },
        {
            q: 'Do they need an app or an account?',
            a: 'No. They open the link in the browser, type their name (and roll no if you ask for it) and start. You can turn on sign-in later if you want it.',
        },
        {
            q: 'How do I stop cheating?',
            a: 'In the exam’s Settings, turn on full screen, tab-switch alerts and the copy-paste block, and shuffle the questions so neighbours get a different order.',
        },
        {
            q: 'What if the internet goes off mid-exam?',
            a: 'Their answers are kept on the phone while the connection is down, so nobody loses their work.',
        },
        {
            q: 'How do I get the marks out?',
            a: 'Marks and ranks appear as each candidate submits. Send the rank list to your WhatsApp group in one tap, or download everything as Excel.',
        },
        {
            q: 'How do I tell my class it’s online now?',
            a: (
                <>
                    <p>Send this note to your class or parents’ group a day before:</p>
                    <pre className="mt-2.5 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-[13px] leading-relaxed text-slate-700 ring-1 ring-inset ring-slate-900/[0.05]">{note}</pre>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(note)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366]/10 px-3.5 text-[13px] font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366]/20"
                        >
                            <WhatsAppIcon /> Send on WhatsApp
                        </a>
                        <button type="button" onClick={copyNote} className={PILL_BTN}>
                            <Copy className="h-4 w-4 text-sky-600" /> Copy note
                        </button>
                    </div>
                </>
            ),
        },
    ];
    const half = Math.ceil(items.length / 2);

    return (
        <Panel id="doubts-heading" title="Before your first online exam" note="Short answers to what holds most educators back">
            <div className="grid px-5 lg:grid-cols-2 lg:gap-x-10">
                {[items.slice(0, half), items.slice(half)].map((col, c) => (
                    <div key={c} className={c === 0 ? 'border-b border-slate-100 lg:border-b-0' : ''}>
                        {col.map(({ q, a }) => (
                            <details key={q} className="group border-b border-slate-100 last:border-b-0">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[14px] font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                                    {q}
                                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="-mt-1 pb-4 text-[13.5px] leading-relaxed text-slate-600">{a}</div>
                            </details>
                        ))}
                    </div>
                ))}
            </div>
        </Panel>
    );
}
