/**
 * The TestoZa walkthrough film (1:42): make a test, run it in class, see results.
 *
 * Nothing downloads until the viewer presses play — the page only loads a 26 KB poster.
 * Phones and slow or data-saver connections get the 480p file (3.9 MB, ~0.3 Mbps),
 * larger screens the 720p one (8.5 MB, ~0.7 Mbps). Both are faststart MP4s in
 * public/videos, so playback begins before the file finishes downloading.
 */
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { analytics } from '@/lib/analytics/tracker';

export const LAUNCH_VIDEO = {
    poster: '/videos/testoza-launch-poster.webp',
    hd: '/videos/testoza-launch-720p.mp4',
    sd: '/videos/testoza-launch-480p.mp4',
    duration: '1:42',
};

function pickQuality(): 'sd' | 'hd' {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const slow = !!conn?.saveData || /(^|-)(2g|3g)$/.test(conn?.effectiveType ?? '');
    const phone = window.matchMedia?.('(max-width: 767px)').matches ?? false;
    return slow || phone ? 'sd' : 'hd';
}

export interface LaunchVideoHandle {
    play: () => void;
}

interface LaunchVideoProps {
    /** Where the player sits, for analytics (e.g. "ads_landing", "dashboard"). */
    where: string;
    /** Label on the poster, beside the running time. */
    label?: string;
    className?: string;
}

const LaunchVideo = forwardRef<LaunchVideoHandle, LaunchVideoProps>(function LaunchVideo(
    { where, label = 'Watch how it works', className = '' },
    ref,
) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [quality] = useState(pickQuality);
    const [started, setStarted] = useState(false);

    // play() must run inside the tap itself, or iPhones refuse to start with sound.
    const start = () => {
        const video = videoRef.current;
        if (!video) return;
        video.play().catch(() => { /* the native controls stay available */ });
        if (!started) {
            setStarted(true);
            analytics.track('launch_video_play', { where, quality });
        }
    };

    useImperativeHandle(ref, () => ({ play: start }));

    return (
        <div className={`relative aspect-video w-full overflow-hidden bg-[#060913] ${className}`}>
            <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full"
                src={LAUNCH_VIDEO[quality]}
                poster={LAUNCH_VIDEO.poster}
                preload="none"
                playsInline
                controls={started}
                controlsList="nodownload"
                onEnded={() => analytics.track('launch_video_complete', { where, quality })}
            />
            {!started && (
                <button
                    type="button"
                    onClick={start}
                    aria-label={`Play video: ${label}, ${LAUNCH_VIDEO.duration}`}
                    className="group absolute inset-0 flex cursor-pointer items-center justify-center bg-gradient-to-t from-black/45 via-transparent to-transparent focus-visible:outline-none"
                >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-sky-600 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55)] ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-sky-400/70 motion-safe:group-active:scale-95 sm:h-[72px] sm:w-[72px]">
                        <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
                    </span>
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[13px] font-semibold text-white backdrop-blur-md sm:bottom-4 sm:left-4">
                        {label}
                        <span className="font-medium tabular-nums text-white/70">{LAUNCH_VIDEO.duration}</span>
                    </span>
                </button>
            )}
        </div>
    );
});

export default LaunchVideo;
