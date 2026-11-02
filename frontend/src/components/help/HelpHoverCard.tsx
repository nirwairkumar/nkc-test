import React, { useRef, useState } from 'react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import { ArrowUpRight, BookOpen, HelpCircle, Play } from 'lucide-react';
import { analytics } from '@/lib/analytics/tracker';
import { type HelpTopic, clockOf, youtubeThumb, youtubeUrl } from '@/lib/helpVideos';

/**
 * A (?) button that shows a tutorial video and the matching user guide.
 * Mouse: opens on hover. Touch: tap to open, tap again or outside to close.
 * Keyboard: focus opens it. Every link opens in a new tab so the page underneath stays put.
 */
export default function HelpHoverCard({
    topic,
    where,
    label,
    className = '',
}: {
    topic: HelpTopic;
    /** Where the button sits, for analytics (e.g. "results_panel"). */
    where: string;
    /** Accessible name of the (?) button. */
    label: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const pointer = useRef<string>('mouse');
    const wasOpen = useRef(false);
    const { video, guide } = topic;
    // Clicks only. A "help seen" event would mark every session engaged.
    const track = (what: string, at?: number) =>
        analytics.track('help_open', at ? { where, what, at } : { where, what });

    return (
        <HoverCardPrimitive.Root open={open} onOpenChange={setOpen} openDelay={120} closeDelay={200}>
            <HoverCardPrimitive.Trigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    className={className}
                    onPointerDown={(e) => { pointer.current = e.pointerType; wasOpen.current = open; }}
                    // Radix ignores touch for hover, so a tap toggles it here.
                    onPointerUp={(e) => { if (e.pointerType !== 'mouse') setOpen(!wasOpen.current); }}
                    onClick={(e) => {
                        if (e.detail === 0) setOpen(o => !o); // keyboard
                        else if (pointer.current === 'mouse') setOpen(true);
                    }}
                >
                    <HelpCircle className="h-4 w-4" />
                </button>
            </HoverCardPrimitive.Trigger>
            <HoverCardPrimitive.Portal>
                <HoverCardPrimitive.Content
                    side="bottom"
                    align="end"
                    sideOffset={8}
                    collisionPadding={12}
                    className="z-[60] w-[300px] max-w-[calc(100vw-24px)] rounded-2xl bg-white p-3 text-slate-900 shadow-[0_18px_48px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/10 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 dark:bg-slate-900 dark:text-white dark:ring-white/10"
                >
                    <a
                        href={youtubeUrl(video.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track('video')}
                        className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                        <span className="relative block aspect-video overflow-hidden rounded-xl bg-slate-900">
                            <img
                                src={youtubeThumb(video.id, 'mq')}
                                srcSet={`${youtubeThumb(video.id, 'mq')} 320w, ${youtubeThumb(video.id, 'maxres')} 1280w`}
                                sizes="276px"
                                width={320}
                                height={180}
                                alt=""
                                decoding="async"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                            <span className="absolute inset-0 flex items-center justify-center">
                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-hover:scale-110">
                                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                                </span>
                            </span>
                            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                                {video.duration}
                            </span>
                        </span>
                        <span className="mt-2.5 block text-[14px] font-semibold leading-snug group-hover:text-sky-700 dark:group-hover:text-sky-300">
                            Watch: {video.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400">
                            Video on YouTube <ArrowUpRight className="h-3 w-3" />
                        </span>
                    </a>

                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Jump to</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {video.chapters.slice(0, 3).map(c => (
                            <li key={c.at}>
                                <a
                                    href={youtubeUrl(video.id, c.at)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => track('chapter', c.at)}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-700 transition-colors hover:bg-sky-50 hover:text-sky-800 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-sky-500/20"
                                >
                                    <span className="tabular-nums text-slate-500 dark:text-slate-400">{clockOf(c.at)}</span>
                                    {c.label}
                                </a>
                            </li>
                        ))}
                    </ul>

                    <a
                        href={guide.path}
                        target="_blank"
                        rel="noopener"
                        onClick={() => track('guide')}
                        className="group mt-3 flex items-center gap-3 rounded-xl border-t border-slate-100 px-1 pt-3 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10"
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                            <BookOpen className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">Prefer reading? {guide.title}</span>
                            <span className="block text-[14px] font-semibold leading-snug group-hover:text-sky-700 dark:group-hover:text-sky-300">
                                Read the full guide
                            </span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-sky-700 dark:group-hover:text-sky-300" />
                    </a>
                </HoverCardPrimitive.Content>
            </HoverCardPrimitive.Portal>
        </HoverCardPrimitive.Root>
    );
}
