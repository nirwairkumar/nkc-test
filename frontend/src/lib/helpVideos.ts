/**
 * Tutorial videos on the TestoZa YouTube channel, and the user-guide page that covers the
 * same ground for people who would rather read. Used by the (?) help cards in the app and
 * by the user guide itself, so a link or a chapter time is changed in one place.
 *
 * Chapter times are the ones in the video's YouTube description (the 1.15× upload).
 */

export interface HelpChapter {
    /** Seconds from the start. */
    at: number;
    label: string;
}

export interface HelpTopic {
    video: {
        id: string;
        title: string;
        duration: string;
        chapters: HelpChapter[];
    };
    guide: {
        path: string;
        title: string;
    };
}

/** Reading results: the Results panel, the Full report and All submissions. */
export const RESULTS_HELP: HelpTopic = {
    video: {
        id: 'RWaYA4YlRYY',
        title: 'How to analyse online test results',
        duration: '6:55',
        chapters: [
            { at: 75, label: 'Results panel' },
            { at: 190, label: 'Full report' },
            { at: 265, label: 'Teach these again' },
            { at: 360, label: 'All submissions' },
            { at: 381, label: 'Five-minute routine' },
        ],
    },
    guide: {
        path: '/user-guide/view-results-guide',
        title: 'Understanding results',
    },
};

export const youtubeUrl = (id: string, at?: number) =>
    `https://www.youtube.com/watch?v=${id}${at ? `&t=${at}s` : ''}`;

/** YouTube's own thumbnails: mq is 320×180, maxres 1280×720. */
export const youtubeThumb = (id: string, size: 'mq' | 'maxres' = 'mq') =>
    `https://i.ytimg.com/vi/${id}/${size}default.jpg`;

export const clockOf = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
