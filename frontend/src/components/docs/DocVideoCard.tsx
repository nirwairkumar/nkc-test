import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, Play } from 'lucide-react';
import {
    type DocVideo, type DocVideos, VIDEO_LANG_LABEL, clockOfSeconds, videoClock,
    youtubeEmbedUrl, youtubeShortUrl, youtubeThumbUrl, youtubeWatchUrl,
} from '@/docs/userGuide';

/**
 * The docs page's YouTube video, played in place. Until the reader presses play it is only a
 * thumbnail (no YouTube script, no cookies); then the privacy-enhanced player loads. A
 * chapter starts the player at that time. The worker's CSP allows www.youtube-nocookie.com
 * in frame-src for this.
 */
export default function DocVideoCard({ videos }: { videos: DocVideos }) {
    const { main, start, more } = videos;
    const [playAt, setPlayAt] = useState<number | null>(null);
    const playing = playAt !== null;

    // The docs column is 430–750 px wide depending on the sidebars, not on the screen, so the
    // layout follows the card's own width: thumbnail beside the text from 600 px, above it below.
    const ref = useRef<HTMLElement>(null);
    const [wide, setWide] = useState(false);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => setWide(el.clientWidth >= 600);
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const beside = wide && !playing;

    return (
        <section ref={ref} aria-label="Video tutorial" className="not-prose mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#121316]">
            <div className={beside ? 'flex' : ''}>
                {playing ? (
                    <div className="aspect-video w-full bg-black">
                        <iframe
                            key={playAt}
                            src={`${youtubeEmbedUrl(main.id, playAt)}&autoplay=1&playsinline=1`}
                            title={main.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            referrerPolicy="strict-origin-when-cross-origin"
                            className="h-full w-full border-0"
                        />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setPlayAt(start ?? 0)}
                        aria-label={`Play video: ${main.title}`}
                        className={`group relative block aspect-video shrink-0 bg-slate-900 ${beside ? 'w-[264px] self-start' : 'w-full'}`}
                    >
                        <img
                            src={youtubeThumbUrl(main.id)}
                            width={1280}
                            height={720}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-hover:scale-110">
                                <Play className="ml-0.5 h-5 w-5 fill-current" />
                            </span>
                        </span>
                        <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-white">
                            {videoClock(main.duration)}
                        </span>
                    </button>
                )}

                <div className={`min-w-0 flex-1 ${wide ? 'p-5' : 'p-4'}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">Prefer to watch?</p>
                    <p className="mt-1 text-[15px] font-semibold leading-snug text-slate-900 dark:text-white">{main.title}</p>
                    <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                        {videoClock(main.duration)} on YouTube{main.lang ? `, ${VIDEO_LANG_LABEL[main.lang]}` : ''}
                        {start ? `. This page’s part starts at ${clockOfSeconds(start)}.` : ''}
                    </p>
                    {main.chapters && (
                        // Narrow: one row that scrolls sideways, so the card doesn't push the steps a screen down.
                        <ul className={`mt-3 flex gap-1.5 ${wide ? 'flex-wrap' : '-mx-4 overflow-x-auto px-4 pb-1'}`}>
                            {main.chapters.map((c) => (
                                <li key={c.at} className="shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setPlayAt(c.at)}
                                        className={`inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[12.5px] transition-colors ${
                                            playAt === c.at || (!playing && start === c.at)
                                                ? 'border-emerald-500/60 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                                                : 'border-slate-200 text-slate-700 hover:border-emerald-500/60 hover:text-emerald-700 dark:border-slate-800 dark:text-slate-300 dark:hover:text-emerald-400'
                                        }`}
                                    >
                                        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">{clockOfSeconds(c.at)}</span>
                                        {c.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <a
                        href={youtubeWatchUrl(main.id, playAt ?? start)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                        Watch on YouTube <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                </div>
            </div>

            {more.length > 0 && (
                <div className={`border-t border-slate-200 py-3 dark:border-slate-800 ${wide ? 'px-5' : 'px-4'}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">More videos</p>
                    <ul className="mt-2 space-y-1.5">
                        {more.map((v) => (
                            <MoreVideo key={v.id} video={v} />
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

function MoreVideo({ video: v }: { video: DocVideo }) {
    const meta = [videoClock(v.duration), v.short ? 'Short' : '', v.lang ? VIDEO_LANG_LABEL[v.lang] : ''].filter(Boolean).join(' · ');
    return (
        <li>
            <a
                href={v.short ? youtubeShortUrl(v.id) : youtubeWatchUrl(v.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2 text-[13.5px] leading-snug"
            >
                <Play className="mt-[3px] h-3 w-3 shrink-0 fill-red-600 text-red-600" />
                <span>
                    <span className="text-slate-800 group-hover:text-emerald-700 group-hover:underline dark:text-slate-200 dark:group-hover:text-emerald-400">{v.title}</span>
                    <span className="text-slate-500 dark:text-slate-400"> · {meta}</span>
                </span>
            </a>
        </li>
    );
}
