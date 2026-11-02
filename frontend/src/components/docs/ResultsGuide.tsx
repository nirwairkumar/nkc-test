import React from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle, ArrowDown, ArrowRight, ArrowUpRight, BarChart3, FileText, Info, Layers, Lightbulb, Play,
} from 'lucide-react';
import { RESULTS_HELP, clockOf, youtubeThumb, youtubeUrl } from '@/lib/helpVideos';

/*
 * User guide: /user-guide/view-results-guide ("Understanding Results")
 * Every number on the Results panel, the Full report and All submissions. The (?) card on the
 * Results panel links here. Screenshots: public/user-guide/results/*.webp, real screens of a
 * staged 48-candidate SSC mock with numbered callouts (same numbers as each legend below).
 * Facts here are checked against TestResultsPanel.tsx, ReportCards.tsx, resultsReport.ts and
 * AllSubmissionsPage.tsx; update them together.
 */

const IMG = '/user-guide/results/';
const CARD = 'rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)] dark:bg-[#16181c] dark:ring-white/10';
const H2 = 'mt-14 scroll-mt-24 text-[24px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white';
const H3 = 'mt-9 scroll-mt-24 text-[18px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-white';
const P = 'mt-3 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300';
const B = 'font-semibold text-slate-900 dark:text-white';
const LINK = 'font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400';

const TOC: [string, string][] = [
    ['where', 'Where your results live'],
    ['open', 'Open the Results panel'],
    ['panel', 'The Results panel at a glance'],
    ['counts', 'Started, writing, submitted, dropped'],
    ['ranks', 'How ranks are decided'],
    ['excel', 'Filters and the Excel file'],
    ['sheet', 'One candidate’s answer sheet'],
    ['report', 'The Full report'],
    ['spread', 'Read the shape of the marks'],
    ['why', 'Why a question went wrong'],
    ['all', 'All submissions: the long view'],
    ['routine', 'A five-minute routine'],
    ['faq', 'Common questions'],
];

export default function ResultsGuide() {
    return (
        <div className="not-prose">
            <p className="text-[17px] leading-relaxed text-slate-600 dark:text-slate-300">
                When a candidate presses Submit, TestoZa marks the paper on the spot. The results then live in three places:
                the <strong className={B}>Results panel</strong>, the <strong className={B}>Full report</strong> and{' '}
                <strong className={B}>All submissions</strong>. This guide walks through each one: what every number means,
                and what to do with it the next morning.
            </p>

            <VideoCard />

            <nav className={`${CARD} mt-8 p-5`} aria-label="On this page">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">On this page</p>
                <ol className="mt-2 grid list-decimal gap-1.5 pl-5 text-[15px] marker:text-slate-400 sm:grid-cols-2">
                    {TOC.map(([id, label]) => (
                        <li key={id}><a href={`#${id}`} className="text-sky-700 hover:underline dark:text-sky-400">{label}</a></li>
                    ))}
                </ol>
            </nav>

            {/* ── Where ─────────────────────────────────────────────────── */}
            <h2 id="where" className={H2}>Where your results live</h2>
            <p className={P}>
                Three pages, three jobs. Use the panel while the exam runs, the report to plan your next class, and All
                submissions to see how the batch moves over weeks.
            </p>
            <ResultsMap />

            {/* ── Open ──────────────────────────────────────────────────── */}
            <h2 id="open" className={H2}>Open the Results panel</h2>
            <ol className="mt-4 space-y-3">
                <Step n={1} title="Go to My Tests">
                    Or your <Link to="/dashboard" className={LINK}>Dashboard</Link>, where a live exam has its own card.
                </Step>
                <Step n={2} title="Find the test">
                    Finished exams move to <strong className={B}>Ended exams</strong>, and their results stay saved there.
                </Step>
                <Step n={3} title="Tap Results">
                    The panel slides in from the right. You can also find Results in a test’s <strong className={B}>•••</strong> menu.
                </Step>
            </ol>
            <Shot src="open-results.webp" w={1400} h={484} alt="My Tests, Ended exams: each exam has a Results button" caption="My Tests → Ended exams. The Results button is highlighted." />
            <Callout kind="tip">
                The panel works during a live exam too. While it is open and on screen it refreshes itself every 30 seconds,
                so you can watch submissions arrive.
            </Callout>

            {/* ── Panel ─────────────────────────────────────────────────── */}
            <h2 id="panel" className={H2}>The Results panel at a glance</h2>
            <p className={P}>Here is the panel for a weekly mock that 52 candidates started. The numbers on the picture match the list below.</p>
            <Shot src="panel.webp" w={1343} h={1090} alt="The Results panel: exam status, Full report button, four counts, Rank switch, search, refresh, Excel, average, highest, lowest, the Submitted filter, and the answer sheet and delete buttons on each row" />
            <Legend items={[
                ['Status and paper', <><em>Live now</em>, <em>Opens 5:30 PM</em> (scheduled) or <em>Exam ended</em>, then the number of questions, total marks and minutes.</>],
                ['Full report', 'The whole-class analysis. It appears once at least one candidate has submitted.'],
                ['The four counts', <>Started, Writing now, Submitted and Dropped. They are also tabs: tap one to list those candidates. <a href="#counts" className={LINK}>What each one means</a>.</>],
                ['Rank', <>Off: newest submission first. On: sorted by merit. <a href="#ranks" className={LINK}>How ties are broken</a>.</>],
                ['Search, Refresh, Excel', 'Search appears once more than 8 candidates have started. Excel downloads exactly what the table shows.'],
                ['Average, highest, lowest', 'Marks of the candidates in the table below, so they follow your filters.'],
                ['Submitted filter', 'Pick a day to see only the results from that day. Tests that aren’t run as a live exam also get a Mode filter (Public, Unlisted, Private).'],
                ['Answer sheet', 'One candidate’s full result: every question, their answer and the time they spent.'],
                ['Delete', 'Removes that result so the candidate can take the test again. It can’t be undone.'],
            ]} />

            <h3 className={H3}>The columns</h3>
            <Table
                head={['Column', 'What it shows']}
                rows={[
                    ['Candidate', 'The name they typed in Candidate inputs, with anything else they typed (roll number, batch) underneath.'],
                    ['Score', 'Marks out of the total, and the percentage under it.'],
                    ['Answers', <><span className="font-semibold text-emerald-600">✓</span> right, <span className="font-semibold text-red-600">✗</span> wrong, <span className="font-semibold text-slate-400">—</span> left blank.</>],
                    ['Time taken', 'From the moment they started to the moment they submitted.'],
                    ['Submitted', 'Date and time of submission. The heading is also the day filter.'],
                ]}
            />

            {/* ── Counts ────────────────────────────────────────────────── */}
            <h2 id="counts" className={H2}>Started, writing, submitted, dropped</h2>
            <p className={P}>
                Every candidate who opens the exam is counted once, in one of three places. On paper you only knew who handed in
                a copy. Here you also see who is still writing and who left halfway.
            </p>
            <CandidateFlow />
            <Table
                head={['Count', 'Who is in it']}
                rows={[
                    ['Started', 'Everyone who opened the exam. Started = Writing now + Submitted + Dropped.'],
                    ['Writing now', 'Answered or moved in the last 3 minutes. The busiest writers are listed first.'],
                    ['Submitted', 'Pressed Submit. Their marks are final and in the table.'],
                    ['Dropped', 'Started but didn’t submit: they closed the exam, or have been quiet for more than 3 minutes.'],
                ]}
            />
            <Shot src="panel-dropped.webp" w={1343} h={920} alt="The Dropped tab: four candidates, each with how many questions they answered and why they dropped" />
            <Legend items={[
                ['The Dropped tab', 'Tap any of the four counts to list those candidates.'],
                ['No activity since…', 'Their phone went quiet: lost network, a flat battery, or the phone was put away.'],
                ['Closed the exam at…', 'They left the exam page.'],
                ['How far they got', 'Questions answered, also shown by the yellow bar.'],
            ]} />
            <Callout kind="tip">
                During a live exam, someone who sits in Dropped for a minute may just have a weak signal. Give it a few minutes
                before you call. Once the exam has ended, Dropped is your list of candidates to check on.
            </Callout>

            {/* ── Ranks ─────────────────────────────────────────────────── */}
            <h2 id="ranks" className={H2}>How ranks are decided</h2>
            <p className={P}>
                Turn on <strong className={B}>Rank</strong> and the panel sorts candidates by four rules. Each rule only settles a tie
                left by the rule before it, like the merit list of a real exam. Rank is off when you open the panel.
            </p>
            <RankLadder />
            <Callout kind="note" title="The Full report shares ranks">
                The Full report uses the first three rules only. Candidates who are still level after them share a rank: 1, 2, 2, 4.
                That is why two candidates can be 2 and 3 in the panel but both 2 in the report.
            </Callout>

            {/* ── Excel ─────────────────────────────────────────────────── */}
            <h2 id="excel" className={H2}>Filters and the Excel file</h2>
            <p className={P}>
                The Submitted (and Mode) filters change the table, the average, highest and lowest, the ranks and the Excel file.
                The four counts at the top always count everyone. <strong className={B}>Excel</strong> downloads what the table shows,
                and the file name says which filter and order you used, for example{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[14px] text-slate-800 dark:bg-white/10 dark:text-slate-200">SSC CGL Weekly Mock 12_results_ranked.xlsx</code>.
            </p>
            <Table
                head={['Columns', 'What you get']}
                rows={[
                    ['Candidate', 'Rank (when Rank is on), then each Candidate input: Name, Roll No and so on.'],
                    ['When', 'Date, Time, Time Taken.'],
                    ['Each section', 'Correct, Wrong, Marks (−ve), Marks (+ve). Only for tests with sections.'],
                    ['Overall', 'Total Questions, Total Correct, Total Incorrect, Total +ve Score, Total −ve Score, Total Partial Mark, Final Score, Percentage.'],
                    ['Each question', 'Student Ans, Correct Ans, Status, Score. Only for tests without sections.'],
                ]}
            />
            <Callout kind="note">
                The Full report has its own Excel button with two sheets: <strong className={B}>Rank list</strong> and{' '}
                <strong className={B}>Questions</strong> (right, partly right, wrong, left blank, % right and the most-picked wrong
                option for every question). If Excel says it is a premium feature, your plan doesn’t include exports; see{' '}
                <Link to="/pricing" className={LINK}>Pricing</Link>.
            </Callout>

            {/* ── Answer sheet ──────────────────────────────────────────── */}
            <h2 id="sheet" className={H2}>One candidate’s answer sheet</h2>
            <p className={P}>
                Tap the chart icon on a row in the panel, or a name in the Full report’s rank list. It opens that candidate’s copy,
                marked, with more detail than a paper copy ever had.
            </p>
            <Shot src="answer-sheet.webp" w={1346} h={1000} alt="A candidate's answer sheet, Overview tab: start and submit time, candidate inputs, total marks, correct, wrong, partial, skipped and a breakdown by subject" />
            <Legend items={[
                ['Who and when', 'When they started and submitted, and what they typed in Candidate inputs.'],
                ['Three tabs', 'Overview, Topic Performance (right and wrong answers grouped by topic) and Questions breakdown.'],
                ['Marks', 'Total marks and percentage, and how many were correct, wrong, partly correct and skipped.'],
                ['By subject', 'Marks and counts for each section of the paper.'],
            ]} />
            <Shot src="answer-sheet-questions.webp" w={1346} h={850} alt="Questions breakdown tab: each question with time spent, marks and Correct or Wrong" />
            <Legend items={[
                ['Time spent', 'Seconds on this question. A long time on an easy question is worth a conversation.'],
                ['Marks and result', 'Marks earned (negative marks show in red) and Correct, Wrong, Partial or Skipped.'],
                ['A wrong answer', 'Tap any row to see the question, their answer and the correct answer.'],
            ]} />

            {/* ── Full report ───────────────────────────────────────────── */}
            <h2 id="report" className={H2}>The Full report</h2>
            <p className={P}>
                Open it with <strong className={B}>Full report →</strong> in the panel, or by tapping an exam in All submissions.
                It reads the whole class at once. While the exam is live it updates itself every 45 seconds. Tries from your
                own account are not counted.
            </p>
            <Shot src="report.webp" w={1400} h={971} alt="The Full report: Send rank list, Copy, Excel and Print; How the class did; How the marks spread; the takeaways; Teach these again; By section; and the rank list filter" />
            <Legend items={[
                ['Share it', 'Send rank list opens WhatsApp with the whole list already typed; you choose the group. Copy puts the same text on your clipboard. Excel gives two sheets. Print is for your file or a parents’ meeting.'],
                ['How the class did', 'Average, highest and lowest (with the candidate’s name), and Needs help: how many scored below 40%.'],
                ['How the marks spread', <>How many candidates fall in each 20% band. Red is below 40%, amber 40–59%, green 60% and above. <a href="#spread" className={LINK}>How to read it</a>.</>],
                ['In plain words', 'Who came first, how many need help, and the hardest question.'],
                ['Teach these again', 'Questions fewer than half got right, hardest first (up to five). Tap one to open it.'],
                ['By section', 'Share of answers that were right in each section. Red below 40%, amber below 75%, green 75% and above.'],
                ['Rank list filter', 'Everyone, or only those below 40%.'],
            ]} />

            <h3 className={H3}>The rank list</h3>
            <Shot src="report-ranklist.webp" w={1087} h={780} alt="The rank list: Everyone and Below 40% filters, search by name or roll number, and tied candidates sharing rank 2" />
            <Legend items={[
                ['Everyone or Below 40%', 'Below 40% is your call list for the week.'],
                ['Search', 'By name or roll number.'],
                ['Shared ranks', 'Same marks, same wrong, same blank: same rank.'],
            ]} />
            <p className={P}>Tap any row to open that candidate’s answer sheet.</p>

            {/* ── Spread ────────────────────────────────────────────────── */}
            <h2 id="spread" className={H2}>Read the shape of the marks</h2>
            <p className={P}>
                Most people skip the marks chart. Don’t: its shape tells you about the paper and the batch before you read a
                single name.
            </p>
            <SpreadShapes />

            {/* ── Why ───────────────────────────────────────────────────── */}
            <h2 id="why" className={H2}>Why a question went wrong</h2>
            <p className={P}>
                Below the rank list, <strong className={B}>Question by question</strong> shows every question as one bar: green
                right, blue partly right, red wrong, grey left blank. Switch between <em>Paper order</em> and{' '}
                <em>Hardest first</em>, and tap a question to open it.
            </p>
            <Shot src="report-question.webp" w={1120} h={705} alt="Question 13 opened: 23% got it right, 54% picked option B" />
            <Legend items={[
                ['The bar', 'Q13: only 23% right, most of the bar red.'],
                ['The correct answer', 'Ticked, with the share of candidates who picked it.'],
                ['The trap', '54% picked B (30%): they simply added the two discounts. When a wrong option is picked by at least as many as the right one, Teach these again shows “Most picked B”.'],
                ['The count', 'Right, wrong and left blank.'],
            ]} />
            <h3 className={H3}>Three patterns to look for</h3>
            <Table
                head={['What you see', 'What it means', 'What to do']}
                rows={[
                    ['One wrong option far ahead of the rest', 'A trap: the batch shares one wrong idea.', 'Reteach the concept. One example on the board fixes it for everyone.'],
                    ['A big grey part', 'Many left it blank. Time ran out, or the chapter isn’t done.', 'Check the timing, or finish the chapter first.'],
                    ['All options picked about evenly', 'Guessing. Nobody really knew it.', 'Put it on the revision list rather than a whole new lesson.'],
                ]}
            />
            <p className={P}>
                Then look at <strong className={B}>By section</strong>: the lowest bar is where next week’s extra class should go.
            </p>

            {/* ── All submissions ───────────────────────────────────────── */}
            <h2 id="all" className={H2}>All submissions: the long view</h2>
            <p className={P}>
                Open <Link to="/all-submissions" className={LINK}>All Submissions</Link> from the sidebar. It lists every exam your
                candidates wrote, newest first. Tap one to open its Full report.
            </p>
            <Shot src="all-submissions.webp" w={1400} h={966} alt="All submissions: four weekly mocks with their averages, below-40% counts and coloured bars; one test not written yet; totals" />
            <Legend items={[
                ['Class average', 'For that exam.'],
                ['Who and how', 'Candidates, how many scored below 40%, the last day it was written, and a bar: green 75% and above, amber 40–74%, red below 40%.'],
                ['WhatsApp', 'Send that exam’s rank list.'],
                ['Not written yet', 'Tests nobody has taken. Start exam sends one live.'],
                ['All your exams so far', 'Answer sheets, exams written, average score, and tests not sent yet. Your own test runs aren’t counted.'],
            ]} />
            <Callout kind="tip">
                Read the averages from the bottom up: 46%, 48%, 50%, 54%. A batch that climbs week after week is something you
                can show parents.
            </Callout>

            {/* ── Routine ───────────────────────────────────────────────── */}
            <h2 id="routine" className={H2}>A five-minute routine after every exam</h2>
            <ol className="mt-4 space-y-3">
                <Step n={1} title="Look at the average and the spread">Full report → How the class did. Is the paper fair, and is the batch together?</Step>
                <Step n={2} title="Send the rank list">Send rank list, then pick your class group in WhatsApp.</Step>
                <Step n={3} title="Open Teach these again">That is your discussion class: five questions, not twenty.</Step>
                <Step n={4} title="Filter Below 40% and call those candidates">Then check Dropped in the panel: they didn’t finish at all.</Step>
                <Step n={5} title="Download the Excel for your register">From the panel or the report, whichever columns you need.</Step>
            </ol>

            {/* ── FAQ ───────────────────────────────────────────────────── */}
            <h2 id="faq" className={H2}>Common questions</h2>
            <div className="mt-4 space-y-2.5">
                <Faq q="A candidate says they submitted, but they aren’t under Submitted.">
                    Look under Writing now and Dropped. When the time ends, the candidate sees <em>Time’s Up</em> and has to tap{' '}
                    <strong className={B}>Submit Test</strong>. Someone who closes the page at that moment stays in Dropped.
                </Faq>
                <Faq q="Why does a row say “Anonymous Candidate”?">
                    Names come from Candidate inputs. If the test didn’t ask for a name, there is nothing to show. Turn on Candidate
                    inputs (Name, Roll No) before the next exam.
                </Faq>
                <Faq q="Can a candidate take the test again?">
                    Yes: delete their result in the Results panel (the bin icon). They can then attempt it again. The deleted result
                    can’t be brought back.
                </Faq>
                <Faq q="Do the numbers update during a live exam?">
                    Yes. The panel refreshes every 30 seconds and the Full report every 45 seconds while they are open. The refresh
                    button updates them straight away.
                </Faq>
                <Faq q="Why don’t I see the Full report button?">
                    It appears once at least one candidate has submitted.
                </Faq>
                <Faq q="Why are my own test runs missing from the report?">
                    The Full report and All submissions leave out tries made from your own account, so checking your paper never
                    changes your class average.
                </Faq>
            </div>

            <div className={`${CARD} mt-10 p-5`}>
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Related</p>
                <ul className="mt-2 space-y-1.5 text-[15px]">
                    <li><Link to="/user-guide/conduct-exam" className={LINK}>Conduct Exams</Link>: go live and share the link.</li>
                    <li><Link to="/user-guide/live-exam-sessions" className={LINK}>Live Exams with a Join Code</Link>: exam rooms, live monitor and report cards.</li>
                </ul>
            </div>
        </div>
    );
}

/* ── Pieces ─────────────────────────────────────────────────────────────────── */

function VideoCard() {
    const { video } = RESULTS_HELP;
    return (
        <section aria-label="Video tutorial" className={`${CARD} mt-6 overflow-hidden sm:flex`}>
            <a
                href={youtubeUrl(video.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-video shrink-0 bg-slate-900 sm:w-[300px] sm:aspect-auto"
            >
                <img
                    src={youtubeThumb(video.id, 'maxres')}
                    width={1280}
                    height={720}
                    alt="Video: How to analyse online test results"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-hover:scale-110">
                        <Play className="ml-1 h-6 w-6 fill-current" />
                    </span>
                </span>
                <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-white">{video.duration}</span>
            </a>
            <div className="min-w-0 flex-1 p-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-400">Prefer to watch?</p>
                <p className="mt-1 text-[17px] font-semibold leading-snug text-slate-900 dark:text-white">{video.title}</p>
                <p className="mt-0.5 text-[13px] text-slate-500">{video.duration} on YouTube. The same ground as this page, on a real class of 48.</p>
                <ul className="mt-3 space-y-1">
                    {video.chapters.map(c => (
                        <li key={c.at}>
                            <a href={youtubeUrl(video.id, c.at)} target="_blank" rel="noopener noreferrer" className="group flex items-baseline gap-2.5 text-[14px]">
                                <span className="w-9 shrink-0 tabular-nums text-sky-700 dark:text-sky-400">{clockOf(c.at)}</span>
                                <span className="text-slate-700 group-hover:text-sky-700 group-hover:underline dark:text-slate-300 dark:group-hover:text-sky-400">{c.label}</span>
                            </a>
                        </li>
                    ))}
                </ul>
                <a href={youtubeUrl(video.id)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-sky-700 hover:underline dark:text-sky-400">
                    Watch on YouTube <ArrowUpRight className="h-4 w-4" />
                </a>
            </div>
        </section>
    );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[13px] font-bold text-white dark:bg-white dark:text-slate-900">{n}</span>
            <div className="min-w-0 pt-0.5">
                <p className="text-[16px] font-semibold text-slate-900 dark:text-white">{title}</p>
                <p className="mt-0.5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">{children}</p>
            </div>
        </li>
    );
}

/** A screenshot. Callout numbers on the picture match the Legend that follows it. */
function Shot({ src, w, h, alt, caption }: { src: string; w: number; h: number; alt: string; caption?: string }) {
    return (
        <figure className="mt-6">
            <a href={IMG + src} target="_blank" rel="noopener" title="Open full size" className="block overflow-hidden rounded-xl bg-white ring-1 ring-slate-900/10 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] dark:ring-white/10">
                <img src={IMG + src} width={w} height={h} alt={alt} loading="lazy" decoding="async" className="block h-auto w-full" />
            </a>
            {caption && <figcaption className="mt-2 text-[13px] text-slate-500">{caption}</figcaption>}
        </figure>
    );
}

function Legend({ items }: { items: [string, React.ReactNode][] }) {
    return (
        <ol className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {items.map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[12px] font-bold text-white" aria-hidden="true">{i + 1}</span>
                    <p className="min-w-0 text-[15px] leading-snug text-slate-600 dark:text-slate-400">
                        <span className="sr-only">{i + 1}. </span>
                        <strong className={B}>{/[.…?]$/.test(title) ? title : `${title}.`}</strong> {body}
                    </p>
                </li>
            ))}
        </ol>
    );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
    return (
        <div className={`${CARD} mt-5 overflow-x-auto`}>
            <table className="w-full text-left text-[14px]">
                <thead className="bg-slate-50 text-[12px] uppercase tracking-[0.08em] text-slate-500 dark:bg-white/5">
                    <tr>{head.map(h => <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-white/10 dark:text-slate-300">
                    {rows.map((r, i) => (
                        <tr key={i} className="align-top">
                            {r.map((c, j) => <td key={j} className={`px-4 py-2.5 leading-snug ${j === 0 ? 'font-semibold text-slate-900 dark:text-white' : ''}`}>{c}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Callout({ kind, title, children }: { kind: 'tip' | 'note' | 'warn'; title?: string; children: React.ReactNode }) {
    const tone = {
        tip: { Icon: Lightbulb, box: 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400', label: 'Tip' },
        note: { Icon: Info, box: 'border-sky-500 bg-sky-50/70 dark:bg-sky-500/10', icon: 'text-sky-600 dark:text-sky-400', label: 'Note' },
        warn: { Icon: AlertTriangle, box: 'border-amber-500 bg-amber-50/70 dark:bg-amber-500/10', icon: 'text-amber-600 dark:text-amber-400', label: 'Careful' },
    }[kind];
    return (
        <div className={`mt-5 flex gap-3 rounded-r-xl border-l-4 px-4 py-3.5 ${tone.box}`}>
            <tone.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} />
            <div className="min-w-0 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">{title || tone.label}</p>
                <div className="mt-0.5">{children}</div>
            </div>
        </div>
    );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
    return (
        <details className={`${CARD} group px-5 py-3.5 [&_summary::-webkit-details-marker]:hidden`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-slate-900 dark:text-white">
                {q}
                <ArrowDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">{children}</p>
        </details>
    );
}

/* ── Diagrams ───────────────────────────────────────────────────────────────── */

/** Results panel → Full report ← All submissions. */
function ResultsMap() {
    const places = [
        { Icon: BarChart3, name: 'Results panel', where: 'My Tests → Results', when: 'During and right after the exam', body: 'Who is writing now, marks, ranks, each answer sheet, Excel.', tint: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' },
        { Icon: FileText, name: 'Full report', where: 'Panel → Full report', when: 'The day after', body: 'How the class did, what to teach again, each section, the rank list for WhatsApp.', tint: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
        { Icon: Layers, name: 'All submissions', where: 'Sidebar → All Submissions', when: 'Week after week', body: 'Every exam your candidates wrote. Is the batch improving?', tint: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
    ];
    // Stacked (phones): down, then up. Side by side: right, then left. Both point at the report.
    const arrows = [
        { label: 'Full report', turn: 'rotate-90 md:rotate-0' },
        { label: 'Tap an exam', turn: '-rotate-90 md:rotate-180' },
    ];
    return (
        <div className="mt-5 grid items-stretch gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr]" role="figure" aria-label="The Results panel and All submissions both lead to the Full report">
            {places.map((p, i) => (
                <React.Fragment key={p.name}>
                    <div className={`${CARD} p-4`}>
                        <div className="flex items-center gap-2.5">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${p.tint}`}><p.Icon className="h-[18px] w-[18px]" /></span>
                            <div className="min-w-0">
                                <p className="text-[15px] font-semibold leading-tight text-slate-900 dark:text-white">{p.name}</p>
                                <p className="text-[12px] text-slate-500">{p.where}</p>
                            </div>
                        </div>
                        <p className="mt-3 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600 dark:bg-white/10 dark:text-slate-300">{p.when}</p>
                        <p className="mt-2 text-[14px] leading-snug text-slate-600 dark:text-slate-400">{p.body}</p>
                    </div>
                    {i < arrows.length && (
                        <div className="flex items-center justify-center gap-1.5 py-1 text-[12px] font-medium text-slate-500 md:flex-col md:px-1 md:py-0">
                            <ArrowRight className={`h-4 w-4 ${arrows[i].turn}`} aria-hidden="true" />
                            <span className="md:max-w-[70px] md:text-center">{arrows[i].label}</span>
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

function FlowNode({ label, n, note, tone }: { label: string; n: number; note: string; tone: string }) {
    return (
        <div className={`w-full max-w-[220px] rounded-xl px-3 py-2.5 text-center ring-1 ring-inset ${tone}`}>
            <p className="text-[22px] font-bold leading-none tabular-nums">{n}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em]">{label}</p>
            <p className="mt-1 text-[12px] leading-snug opacity-80">{note}</p>
        </div>
    );
}

/** Started → Writing now → Submitted | Dropped, with the counts from the example exam. */
function CandidateFlow() {
    const line = 'bg-slate-300 dark:bg-white/20';
    return (
        <div className={`${CARD} mt-5 px-4 py-6 sm:px-8`} role="figure" aria-label="Every candidate who starts is either writing now, submitted or dropped">
            <div className="flex flex-col items-center">
                <FlowNode label="Started" n={52} note="Opened the exam" tone="bg-slate-900 text-white ring-slate-900 dark:bg-white/10 dark:ring-white/15" />
                <span className={`h-5 w-px ${line}`} />
                <FlowNode label="Writing now" n={0} note="Active in the last 3 minutes" tone="bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300" />
                <div className="relative h-6 w-1/2" aria-hidden="true">
                    <span className={`absolute left-1/2 top-0 h-3 w-px ${line}`} />
                    <span className={`absolute inset-x-0 top-3 h-px ${line}`} />
                    <span className={`absolute left-0 top-3 h-3 w-px ${line}`} />
                    <span className={`absolute right-0 top-3 h-3 w-px ${line}`} />
                </div>
                <div className="grid w-full grid-cols-2">
                    <div className="flex flex-col items-center px-1.5">
                        <p className="mb-1.5 text-[12px] font-medium text-slate-500">Presses Submit</p>
                        <FlowNode label="Submitted" n={48} note="Marked, in the table" tone="bg-indigo-50 text-indigo-800 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300" />
                    </div>
                    <div className="flex flex-col items-center px-1.5">
                        <p className="mb-1.5 text-center text-[12px] font-medium text-slate-500">Leaves, or quiet 3+ min</p>
                        <FlowNode label="Dropped" n={4} note="Started, didn’t submit" tone="bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300" />
                    </div>
                </div>
            </div>
            <p className="mt-5 text-center text-[13px] text-slate-500">
                Started 52 = Writing now 0 + Submitted 48 + Dropped 4
            </p>
        </div>
    );
}

/** The four tie-break rules, in order. */
function RankLadder() {
    const rules = [
        { title: 'More marks', eg: '33 beats 32.5' },
        { title: 'Fewer wrong', eg: '2 wrong beats 3 wrong' },
        { title: 'Fewer left blank', eg: '1 blank beats 4 blank' },
        { title: 'Submitted first', eg: '10:19 beats 10:23', only: 'Panel only' },
    ];
    return (
        <ol className="mt-5 grid gap-2 sm:grid-cols-4" aria-label="Rank order: more marks, then fewer wrong, then fewer left blank, then submitted first">
            {rules.map((r, i) => (
                <li key={r.title} className={`${CARD} relative p-4`}>
                    <div className="flex items-center justify-between">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-[13px] font-bold text-white">{i + 1}</span>
                        {r.only && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">{r.only}</span>}
                    </div>
                    <p className="mt-2.5 text-[15px] font-semibold text-slate-900 dark:text-white">{r.title}</p>
                    <p className="mt-0.5 text-[13px] text-slate-500">{r.eg}</p>
                    {i < rules.length - 1 && (
                        <p className="mt-2 text-[12px] font-medium text-sky-700 dark:text-sky-400">Still tied? →</p>
                    )}
                </li>
            ))}
        </ol>
    );
}

/** Four marks charts in the Full report's colours: three warning shapes and the example mock. */
function SpreadShapes() {
    const bins = ['0–19', '20–39', '40–59', '60–79', '80–100'];
    const colour = (i: number) => (i < 2 ? 'bg-rose-400' : i === 2 ? 'bg-amber-400' : 'bg-emerald-500');
    const shapes = [
        { name: 'Piled on the right', counts: [0, 1, 4, 14, 21], means: 'The paper was too easy. Make the next one tougher.' },
        { name: 'Piled on the left', counts: [19, 14, 6, 2, 0], means: 'The paper was too hard, or the chapter didn’t land.' },
        { name: 'Two humps', counts: [13, 6, 2, 7, 12], means: 'The batch has split in two. A separate doubt class for the lower group pays off.' },
        { name: 'This mock: healthy', counts: [4, 7, 15, 16, 6], means: 'Most in the middle, with a tail (the 11 below 40%) that needs attention.' },
    ];
    return (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {shapes.map(s => {
                const max = Math.max(...s.counts);
                return (
                    <figure key={s.name} className={`${CARD} p-4`}>
                        <div className="flex h-24 items-end gap-1.5" role="img" aria-label={`${s.name}: ${s.counts.join(', ')} candidates from the lowest band to the highest`}>
                            {s.counts.map((c, i) => (
                                <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1 self-stretch">
                                    <span className="text-[11px] tabular-nums text-slate-500">{c}</span>
                                    <span className={`w-full rounded-t ${colour(i)}`} style={{ height: `${Math.max(3, (c / max) * 64)}px` }} />
                                </div>
                            ))}
                        </div>
                        <div className="mt-1 flex gap-1.5 border-t border-slate-100 pt-1 dark:border-white/10">
                            {bins.map(b => <span key={b} className="flex-1 text-center text-[10px] tabular-nums text-slate-400">{b}%</span>)}
                        </div>
                        <figcaption className="mt-3">
                            <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{s.name}</p>
                            <p className="mt-0.5 text-[14px] leading-snug text-slate-600 dark:text-slate-400">{s.means}</p>
                        </figcaption>
                    </figure>
                );
            })}
        </div>
    );
}
