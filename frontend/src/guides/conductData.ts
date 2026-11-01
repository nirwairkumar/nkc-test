/**
 * The example exam that runs through testoza.com/how-to-conduct-online-exam: the
 * hero phone, the New exam sheet, the rules demo, the exam-day demo and the crawler
 * text all use these, so the numbers agree everywhere. Dependency-free (the
 * Cloudflare worker imports the guide text that reads it).
 */

export const EXAM = {
    institute: 'Sunrise Academy',
    batch: '12-A',
    /** The sitting's name, as the exam room shows it. */
    sitting: 'Unit Test 3',
    /** The question paper (a test in TestoZa). */
    paper: 'Physics: Current Electricity',
    questions: 20,
    minutes: 30,
    right: 4,
    wrong: 1,
    lateEntry: 5,
    /** Candidates on the batch list. */
    roster: 24,
    code: '731506',
} as const;

/** "731 506" */
export const spacedCode = (code: string = EXAM.code) => `${code.slice(0, 3)} ${code.slice(3)}`;

/** Marking scheme, as on the question cards. */
export const maxMarks = EXAM.questions * EXAM.right;

/** Papers the New exam sheet offers (the teacher's tests). */
export const PAPERS = [
    { id: 'phy', title: EXAM.paper, questions: EXAM.questions, minutes: EXAM.minutes },
    { id: 'chem', title: 'Chemistry Weekly Test 8', questions: 25, minutes: 40 },
    { id: 'mock', title: 'NEET Full Mock 4', questions: 180, minutes: 180 },
] as const;

/** Batches the sheet offers: name, candidates on the list, how many have PINs. */
export const BATCHES = [
    { id: '12a', name: EXAM.batch, students: EXAM.roster, withPin: EXAM.roster },
    { id: '12b', name: '12-B', students: 31, withPin: 0 },
    { id: 'drop', name: 'NEET Dropper A', students: 58, withPin: 58 },
] as const;

/** Time per question in well-known Indian exams (published patterns). */
export const EXAM_PATTERNS = [
    { exam: 'NEET-UG', questions: 180, minutes: 180, marking: '+4 / −1' },
    { exam: 'JEE Main (one paper)', questions: 75, minutes: 180, marking: '+4 / −1' },
    { exam: 'CUET-UG (one subject)', questions: 50, minutes: 60, marking: '+5 / −1' },
    { exam: 'SSC CGL Tier 1', questions: 100, minutes: 60, marking: '+2 / −0.5' },
] as const;

export const perQuestion = (minutes: number, questions: number) => {
    const s = Math.round((minutes * 60) / questions);
    return s >= 60 && s % 60 === 0 ? `${s / 60} min` : s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;
};

/** The exam controller's checklist (the guide's checklist section and its widget). */
export const CHECKLIST = [
    {
        when: 'A week before',
        items: [
            'The paper is final, and a second teacher has answered it once without the key.',
            'Every question has its marks and negative marks; sections are named.',
            'The batch list is in: roll numbers and names, pasted from your sheet.',
            'If candidates check in with a PIN, the slips are printed and cut.',
        ],
    },
    {
        when: 'Two days before',
        items: [
            'Dry run with three phones, including the oldest one you can find.',
            'On one phone, switch apps, lock the screen and rejoin on another device.',
            'Check the dry run’s marks against the key by hand for two papers.',
            'Send candidates the instructions message.',
        ],
    },
    {
        when: 'On the day',
        items: [
            'The code is on the board or projector; the lobby opens 30 minutes before.',
            'Chargers and a power bank are in the room; the Wi-Fi password is on the board.',
            'Absentees are known before you tap Start.',
            'Watch “Need a look” in the exam room; give extra time only for real problems.',
        ],
    },
    {
        when: 'After',
        items: [
            'End the exam, so every started paper is filed.',
            'Check the questions most candidates got wrong before releasing results.',
            'Release results; send the rank list and report cards.',
            'Set up the re-test for absentees.',
        ],
    },
];
