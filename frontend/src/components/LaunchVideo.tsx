/**
 * The TestoZa walkthrough film (1:42): make a test, run it in class, see results.
 *
 * Nothing downloads until the viewer presses play — the page only loads a 22 KB poster.
 * Slow or data-saver connections get the 480p file (3.9 MB, ~0.3 Mbps), everyone else
 * the 720p one (8.5 MB, ~0.7 Mbps). Both are faststart MP4s in public/videos, so
 * playback begins before the file finishes downloading.
 *
 * The "trim" files are cut from the 1080p master (videos/testoza-launch/renders/
 * video-v4.mp4) with 8% of empty background taken off each side, so the frame is
 * 1612x1080, not 16:9, and the picture fills more of the width. More than 8% clips
 * the "testoza.com/join" line. The 16:9 originals beside them are kept unchanged.
 */
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { analytics } from '@/lib/analytics/tracker';

export const LAUNCH_VIDEO = {
    poster: '/videos/testoza-launch-trim-poster.webp',
    hd: '/videos/testoza-launch-trim-720p.mp4', // 1074x720
    sd: '/videos/testoza-launch-trim-480p.mp4', // 716x480
    duration: '1:42',
};

const isPhone = () => window.matchMedia?.('(max-width: 767px)').matches ?? false;

/**
 * 720p unless the connection says it's slow. Phones also drop to 480p below 1.5 Mbps.
 * iPhones don't report their connection, so they get 720p; Android Chrome does.
 */
function pickQuality(phone: boolean): 'sd' | 'hd' {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string; downlink?: number } }).connection;
    const slow = !!conn?.saveData
        || /(^|-)(2g|3g)$/.test(conn?.effectiveType ?? '')
        || (phone && typeof conn?.downlink === 'number' && conn.downlink > 0 && conn.downlink < 1.5); // Mbps
    return slow ? 'sd' : 'hd';
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
    const [quality] = useState(() => pickQuality(isPhone()));
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
        <div className={`relative aspect-[1074/720] w-full overflow-hidden bg-[#060913] ${className}`}>
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
