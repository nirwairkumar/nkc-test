/**
 * Shared facts for testoza.com/prevent-cheating-in-online-exams: the example exam, the
 * ways candidates cheat (the methods explorer and its crawler table), the sample batch
 * for the copying check, and the setup planner's recommendations. The guide text, the
 * widgets and the crawler HTML all read these, so they always agree. Dependency-free
 * (the Cloudflare worker bundles the guide text that imports this file).
 *
 * Product behaviour described here was checked against the code on 4 October 2026:
 * pages/TestPage.tsx (visibilitychange → "Tab Switching / Navigation", fullscreenchange
 * → "Exited Full Screen", copy/cut/paste and contextmenu guards, Fisher–Yates question
 * shuffle), backend routers/tests/read.py (answer key stripped until the candidate has
 * submitted and any scheduled end time has passed), routers/join.py and
 * services/exam_sessions.py (roll + PIN, one device per seat, server clock, results
 * release), components/exams/MonitorPanel.tsx ("Need a look": no signal, warnings,
 * changed device).
 */

/** The example exam on the page (hero, sandbox, copying check). */
export const EXAM = {
    institute: 'Vidya Coaching Centre',
    batch: 'NEET 2027 · B',
    sitting: 'Weekly Test 6',
    paper: 'Biology: Human Physiology',
    questions: 30,
    minutes: 40,
    right: 4,
    wrong: 1,
} as const;

export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface Question {
    text: string;
    options: Record<OptionKey, string>;
    answer: OptionKey;
}

/** Questions on the candidate's screen (NCERT Class 11 human physiology). */
export const QUESTIONS: Question[] = [
    {
        text: 'Which part of the human brain coordinates balance and posture?',
        options: { A: 'Cerebrum', B: 'Cerebellum', C: 'Medulla oblongata', D: 'Hypothalamus' },
        answer: 'B',
    },
    {
        text: 'Which blood vessel carries oxygenated blood from the lungs to the heart?',
        options: { A: 'Pulmonary artery', B: 'Pulmonary vein', C: 'Aorta', D: 'Vena cava' },
        answer: 'B',
    },
    {
        text: 'The structural and functional unit of the kidney is the',
        options: { A: 'Neuron', B: 'Alveolus', C: 'Nephron', D: 'Villus' },
        answer: 'C',
    },
    {
        text: 'Which enzyme in saliva begins the digestion of starch?',
        options: { A: 'Pepsin', B: 'Trypsin', C: 'Salivary amylase', D: 'Lipase' },
        answer: 'C',
    },
    {
        text: 'Insulin is secreted by the',
        options: { A: 'Alpha cells of the pancreas', B: 'Beta cells of the pancreas', C: 'Adrenal cortex', D: 'Thyroid gland' },
        answer: 'B',
    },
    {
        text: 'The normal pH of human blood is close to',
        options: { A: '6.4', B: '7.0', C: '7.4', D: '8.4' },
        answer: 'C',
    },
];

/* ── How candidates cheat ─────────────────────────────────────────────── */

export type Place = 'home' | 'room';

/**
 * What happens to a method, at home or in a supervised room:
 * blocked (it doesn't work), flagged (it works but you are told), partly (stopped for
 * most people, not all), unseen (nothing on the exam device can know), room (a person
 * in the room stops it), setup (the way the exam is set up stops it).
 */
export type Verdict = 'blocked' | 'flagged' | 'partly' | 'unseen' | 'room' | 'setup';

export const VERDICT_LABEL: Record<Verdict, string> = {
    blocked: 'Blocked',
    flagged: 'Flagged to you',
    partly: 'Partly stopped',
    unseen: 'Not seen',
    room: 'Stopped by the room',
    setup: 'Stopped by the setup',
};

export interface Method {
    id: string;
    group: string;
    name: string;
    how: string;
    verdict: Record<Place, Verdict>;
    /** What the browser and TestoZa do about it. */
    sees: string;
    /** What to do. */
    fix: string;
}

export const METHOD_GROUPS = ['Looking it up', 'Getting help', 'Getting the answers early', 'Gaming the test'] as const;

export const METHODS: Method[] = [
    {
        id: 'search',
        group: 'Looking it up',
        name: 'Searching the question in another tab or app',
        how: 'The candidate leaves the exam, searches the question, and comes back.',
        verdict: { home: 'flagged', room: 'room' },
        sees: 'Leaving the exam hides the page, and the browser reports that. With app-switch detection on, TestoZa shows the candidate a warning and counts it; past your limit the paper submits itself.',
        fix: 'App-switch detection with two or three warnings, and questions that a search box can’t answer in one go.',
    },
    {
        id: 'chatbot',
        group: 'Looking it up',
        name: 'Asking ChatGPT or Gemini on the same phone',
        how: 'The candidate opens a chatbot, types or pastes the question, and copies back the answer.',
        verdict: { home: 'flagged', room: 'room' },
        sees: 'Opening the chatbot means leaving the exam, which is counted. With copy and paste off, the question has to be retyped, which costs time a tight paper doesn’t have.',
        fix: 'App-switch detection, copy and paste off, and a time limit with no slack. The AI section below covers the rest.',
    },
    {
        id: 'second-device',
        group: 'Looking it up',
        name: 'A second phone or laptop',
        how: 'The exam runs on one device; the search or the chatbot runs on another.',
        verdict: { home: 'unseen', room: 'room' },
        sees: 'Nothing on the exam device changes, so no software on it can know. This is the limit of every phone-based exam.',
        fix: 'At home, design it out: tight time, questions that need working, two versions of the paper. For exams that decide something, a supervised room with phones in bags.',
    },
    {
        id: 'lens',
        group: 'Looking it up',
        name: 'Circle to Search or Google Lens on the same phone',
        how: 'On many Android phones, a long press draws a search sheet over the exam and reads the question off the screen.',
        verdict: { home: 'unseen', room: 'room' },
        sees: 'The sheet opens over the exam without hiding it, so the page usually isn’t told. If the candidate then opens a result in another app, the exam is hidden and that is counted.',
        fix: 'Questions that need working or a careful look at a figure, a time limit with no slack, and supervision when it matters.',
    },
    {
        id: 'split',
        group: 'Looking it up',
        name: 'Split screen, a floating window or a second monitor',
        how: 'The exam stays on screen while another app or window sits beside it.',
        verdict: { home: 'unseen', room: 'room' },
        sees: 'A page that is still partly on screen counts as visible, so the browser doesn’t report split screen, floating windows or a second monitor. On a computer, putting a window beside the exam usually means leaving full screen, and that is counted.',
        fix: 'Force full screen on computers and Android phones, and watch screens in a lab.',
    },
    {
        id: 'notes',
        group: 'Looking it up',
        name: 'Notes, books or a formula sheet',
        how: 'Paper on the desk or under the phone.',
        verdict: { home: 'unseen', room: 'room' },
        sees: 'No web page can see the desk.',
        fix: 'At home, treat the test as open-book and write questions for that: application, not recall. In a room, clear desks.',
    },
    {
        id: 'group-chat',
        group: 'Getting help',
        name: 'Asking the class group during the exam',
        how: 'A screenshot goes to WhatsApp or Telegram and someone replies with the answer.',
        verdict: { home: 'flagged', room: 'room' },
        sees: 'Switching to the chat app hides the exam and is counted. The screenshot itself isn’t: browsers don’t tell web pages about screenshots.',
        fix: 'App-switch detection, a shuffled question order so that “Q14” means a different question to each candidate, and results only after everyone has finished.',
    },
    {
        id: 'friend',
        group: 'Getting help',
        name: 'A friend, sibling or tutor sitting beside',
        how: 'Someone else reads the screen and helps, or answers.',
        verdict: { home: 'unseen', room: 'room' },
        sees: 'Nothing changes on the screen.',
        fix: 'Only a supervised room stops this. At home, keep the stakes low, and follow a surprising score with a short oral check.',
    },
    {
        id: 'proxy',
        group: 'Getting help',
        name: 'Someone else takes the test',
        how: 'A friend or paid stand-in sits the exam under the candidate’s name.',
        verdict: { home: 'partly', room: 'room' },
        sees: 'With roll number + PIN check-in, only someone holding the printed slip can get in, and a seat can be open on one device at a time: if the same roll number joins on another phone, the first is logged out and the exam room shows “Changed device”. Nothing stops a candidate handing over their own slip at home.',
        fix: 'Roll number + PIN for anything that matters, and an ID check at the door for a supervised exam.',
    },
    {
        id: 'remote',
        group: 'Getting help',
        name: 'A helper watching through screen sharing',
        how: 'A screen-sharing or remote-desktop app lets someone elsewhere see the screen, or even answer.',
        verdict: { home: 'unseen', room: 'room' },
        sees: 'A web page can’t see which other apps are running, so this isn’t reported.',
        fix: 'For exams that decide something, a supervised room or a lab whose computers you control.',
    },
    {
        id: 'early',
        group: 'Getting the answers early',
        name: 'Early finishers pass the answers on',
        how: 'The first candidate to finish sees the answer key or a score breakdown and posts it to the group.',
        verdict: { home: 'setup', room: 'setup' },
        sees: 'In a TestoZa sitting, candidates never receive the answer key, and results can wait until the exam ends for everyone. On a scheduled exam link, the key stays hidden until the end time.',
        fix: 'Results “When the exam ends” or “When I release them”, and a fixed closing time.',
    },
    {
        id: 'source',
        group: 'Getting the answers early',
        name: 'Reading the answer key from the page',
        how: 'In some quiz tools the correct answers travel to the browser with the questions, where browser developer tools can read them.',
        verdict: { home: 'blocked', room: 'blocked' },
        sees: 'TestoZa removes the answers before the paper is sent and marks it on the server, so there is nothing to read, and a score changed on the phone is ignored.',
        fix: 'Ask any tool you use whether answers are sent to the browser. If a quiz can mark an answer with the internet switched off, they are.',
    },
    {
        id: 'leak',
        group: 'Getting the answers early',
        name: 'The paper leaks before the exam',
        how: 'A link or a screenshot of the questions goes round the day before.',
        verdict: { home: 'setup', room: 'setup' },
        sees: 'In a sitting, the questions are sent only when the exam starts; until then candidates wait in a lobby, and the join code works only while its exam is open.',
        fix: 'Run important exams as a sitting with a join code, make a fresh paper for each batch, and never reuse a paper that has been out.',
    },
    {
        id: 'retake',
        group: 'Gaming the test',
        name: 'Taking it twice, under another name',
        how: 'The candidate does a first attempt to see the questions, then a clean one.',
        verdict: { home: 'setup', room: 'setup' },
        sees: 'In a sitting, each candidate can submit once: the database refuses a second paper. With roll-number check-in and walk-ins off, a made-up name can’t get in.',
        fix: 'A sitting with the batch list loaded and walk-ins off.',
    },
    {
        id: 'network',
        group: 'Gaming the test',
        name: '“My internet went off” for extra time',
        how: 'The candidate claims a network failure to get the clock reset or more time.',
        verdict: { home: 'setup', room: 'setup' },
        sees: 'The clock runs on the server, not the phone. Answers are saved every 20 seconds and the candidate can carry on from another phone, and the exam room shows “No signal for 3:20”, so you can see whether the story fits.',
        fix: 'Give extra time from the exam room only when the room shows a real gap.',
    },
    {
        id: 'copy',
        group: 'Gaming the test',
        name: 'Copying the question into a translator or AI',
        how: 'Select, copy, paste into another app.',
        verdict: { home: 'blocked', room: 'blocked' },
        sees: 'With copy and paste off, nothing is copied and the candidate sees “Copy/Paste is disabled for this test.” It doesn’t stop someone retyping the question or photographing it.',
        fix: 'Copy and paste off, with a time limit.',
    },
];

/* ── The copying check ────────────────────────────────────────────────── */

/** Answer key of the 12 questions in the sample batch. */
export const BATCH_KEY: OptionKey[] = ['B', 'B', 'C', 'C', 'B', 'C', 'A', 'D', 'A', 'C', 'B', 'D'];

export interface Candidate {
    id: string;
    name: string;
    roll: string;
    /** One letter per question, '-' for skipped. */
    answers: string;
    minutes: number;
    warnings: number;
}

/**
 * A made-up batch. Rohan and Kabir give the same wrong option on six questions (1 in 729
 * by chance under the even-spread assumption): copying. Aisha and Dev are strong
 * students who share right answers, which proves nothing. No other pair shares more
 * than one wrong answer. Scores at +4/−1: Aisha 48, Dev 43, Meera 39, Tanvi 29,
 * Arjun 29, Zoya 28, Rohan 18, Kabir 13 (of 48).
 */
export const BATCH: Candidate[] = [
    { id: 'aisha', name: 'Aisha Khan', roll: 'B-01', answers: 'BBCCBCADACBD', minutes: 31, warnings: 0 },
    { id: 'dev', name: 'Dev Sharma', roll: 'B-02', answers: 'BBCCBCADACBA', minutes: 34, warnings: 0 },
    { id: 'rohan', name: 'Rohan Verma', roll: 'B-03', answers: 'BDCABACDBCCD', minutes: 19, warnings: 2 },
    { id: 'kabir', name: 'Kabir Singh', roll: 'B-04', answers: 'BDCABACDBCCA', minutes: 21, warnings: 1 },
    { id: 'meera', name: 'Meera Pillai', roll: 'B-05', answers: 'BBCC-CABACBD', minutes: 38, warnings: 0 },
    { id: 'tanvi', name: 'Tanvi Rao', roll: 'B-06', answers: 'ABCDBCADBCB-', minutes: 37, warnings: 0 },
    { id: 'arjun', name: 'Arjun Nair', roll: 'B-07', answers: 'BCCCDCAD-CBC', minutes: 36, warnings: 1 },
    { id: 'zoya', name: 'Zoya Ahmed', roll: 'B-08', answers: 'CBACBCBDACAD', minutes: 39, warnings: 0 },
];

export interface PairCompare {
    sameRight: number;
    /** Same wrong option on the same question: the evidence that matters. */
    sameWrong: number;
    /** Both wrong, with different options. */
    bothWrongDiff: number;
    /** Chance two independent candidates match on every both-wrong question, if wrong answers spread evenly over the three wrong options. */
    chance: number;
}

export function comparePair(a: Candidate, b: Candidate, key: string[] = BATCH_KEY): PairCompare {
    let sameRight = 0;
    let sameWrong = 0;
    let bothWrongDiff = 0;
    key.forEach((k, i) => {
        const x = a.answers[i];
        const y = b.answers[i];
        if (x === '-' || y === '-') return;
        if (x === k && y === k) sameRight++;
        else if (x !== k && y !== k) {
            if (x === y) sameWrong++;
            else bothWrongDiff++;
        }
    });
    return { sameRight, sameWrong, bothWrongDiff, chance: Math.pow(1 / 3, sameWrong) };
}

/** "1 in 2,187" */
export const oneIn = (p: number) => `1 in ${Math.round(1 / p).toLocaleString('en-IN')}`;

/* ── Setups by exam ───────────────────────────────────────────────────── */

export type Stakes = 'quiz' | 'weekly' | 'mock' | 'term' | 'recruit';

export const STAKES: { id: Stakes; label: string; short: string }[] = [
    { id: 'quiz', label: 'Class quiz or practice', short: 'Quiz' },
    { id: 'weekly', label: 'Weekly or chapter test', short: 'Weekly' },
    { id: 'mock', label: 'Full mock (JEE, NEET, SSC…)', short: 'Mock' },
    { id: 'term', label: 'Term exam or scholarship test', short: 'Term' },
    { id: 'recruit', label: 'Recruitment or screening test', short: 'Hiring' },
];

export interface Setup {
    checkIn: string;
    rules: string[];
    policy: string;
    results: string;
    paper: string;
    room: string;
    verdict: string;
}

export function setupFor(stakes: Stakes, place: Place): Setup {
    const home = place === 'home';
    switch (stakes) {
        case 'quiz':
            return {
                checkIn: 'Name only',
                rules: ['App-switch detection (optional)'],
                policy: 'Warn only',
                results: 'Straight after submitting',
                paper: 'Any paper; shuffle the order if candidates sit together.',
                room: home ? 'Nobody needed.' : 'Your usual class.',
                verdict: 'Cheating on a practice quiz only cheats the candidate. Keep it fast and friendly.',
            };
        case 'weekly':
            return {
                checkIn: 'Roll number',
                rules: ['App-switch detection', 'Copy and paste off', 'Shuffle question order'],
                policy: '3 warnings, then submit',
                results: 'When the exam ends',
                paper: 'Mostly application questions; a time limit close to the real exam’s.',
                room: home ? 'Nobody needed; read the warnings afterwards.' : 'One teacher in the room.',
                verdict: 'Enough to stop the casual searching and group-chat answers that spoil a weekly rank list.',
            };
        case 'mock':
            return {
                checkIn: 'Roll number + PIN',
                rules: ['Full screen (computers and Android)', 'App-switch detection', 'Copy, paste and right-click off', 'Shuffle question order'],
                policy: '3 warnings, then submit',
                results: 'When the exam ends',
                paper: 'Real pattern and timing; two versions if the batch sits together at home.',
                room: home ? 'Watch the exam room for “Need a look”.' : 'Invigilators walking the room; phones not in use away.',
                verdict: home ? 'Good for practice ranks. Don’t give prizes or scholarships on a mock taken at home.' : 'A mock you can rank and reward on.',
            };
        case 'term':
            return {
                checkIn: 'Roll number + PIN',
                rules: ['Full screen (computers and Android)', 'App-switch detection', 'Copy, paste and right-click off', 'Block the back button', 'Shuffle question order'],
                policy: '2 warnings, then submit',
                results: 'When I release them',
                paper: 'Two versions of the paper, one per half of the batch.',
                room: home ? 'Don’t: hold it in a supervised room or lab.' : 'Invigilators, an ID or slip check at the door, desks clear.',
                verdict: home ? 'At home this can only be a screening. Marks that go on a report card belong in a supervised room.' : 'As close to a paper exam’s fairness as a phone exam gets.',
            };
        case 'recruit':
            return {
                checkIn: 'Roll number + PIN (application number as roll)',
                rules: ['Full screen (computers and Android)', 'App-switch detection', 'Copy, paste and right-click off', 'Block the back button', 'Shuffle question order'],
                policy: '2 warnings, then submit',
                results: 'When I release them',
                paper: 'A fresh paper for each drive; never one that has been out.',
                room: home ? 'Use it as a first filter, then re-test the shortlist in person.' : 'A supervised lab or hall, with an ID check against the application.',
                verdict: home ? 'Fine for shortlisting. Confirm with an interview or an in-person round before you hire.' : 'Fit for a selection round.',
            };
    }
}
