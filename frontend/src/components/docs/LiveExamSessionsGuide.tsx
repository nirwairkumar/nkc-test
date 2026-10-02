import React from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle, Check, Clock, Copy, GraduationCap, KeyRound, Lock, MonitorPlay, Plus, RotateCcw, Send,
    ShieldCheck, Smartphone, Users, WifiOff,
} from 'lucide-react';
import QrCode from '@/components/exams/QrCode';

/*
 * User guide: /user-guide/live-exam-sessions
 * Explains exam sessions (join codes, batches, PINs, live monitor, results) for teachers
 * and institutes. The small replicas reuse the real screens' class names.
 */

const CARD = 'rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)] dark:bg-[#16181c] dark:ring-white/10';
const H2 = 'mt-12 scroll-mt-24 text-[24px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white';
const P = 'mt-3 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300';

export default function LiveExamSessionsGuide() {
    return (
        <div className="not-prose">
            <p className="text-[17px] leading-relaxed text-slate-600 dark:text-slate-300">
                Give an exam with a <strong className="text-slate-900 dark:text-white">6-digit code</strong> instead of a long link.
                Candidates open <strong className="text-slate-900 dark:text-white">testoza.com/join</strong> on any phone, type the code
                and start. There are two ways to use it: a code for a test that is already live (nothing to set up), or a full
                exam room with a lobby, roll numbers, a live monitor and a rank list.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                    { icon: KeyRound, title: 'No long links', body: 'A code candidates can type from the board in five seconds.' },
                    { icon: ShieldCheck, title: 'The right candidate', body: 'Roll number and PIN, one attempt each, checked by the server.' },
                    { icon: Users, title: 'One paper, many batches', body: 'Batch A on Monday, Batch B on Thursday, separate results.' },
                ].map(f => (
                    <div key={f.title} className={`${CARD} p-4`}>
                        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"><f.icon className="h-[18px] w-[18px]" /></span>
                        <p className="mt-3 text-[15px] font-semibold text-slate-900 dark:text-white">{f.title}</p>
                        <p className="mt-1 text-[14px] leading-snug text-slate-600 dark:text-slate-400">{f.body}</p>
                    </div>
                ))}
            </div>

            <nav className={`${CARD} mt-8 p-5`} aria-label="On this page">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">On this page</p>
                <ol className="mt-2 grid gap-1.5 text-[15px] sm:grid-cols-2">
                    {[
                        ['quick', 'The quick way: a code for a live test'],
                        ['which', 'Quick code or exam room?'],
                        ['words', 'Three words to know'],
                        ['batch', '1. Make a batch and add candidates'],
                        ['pins', '2. Give candidates PINs (optional)'],
                        ['create', '3. Create the exam'],
                        ['day', '4. On exam day'],
                        ['monitor', '5. Watch the exam live'],
                        ['results', '6. Results, rank list and report cards'],
                        ['students', 'What candidates see'],
                        ['safety', 'What TestoZa enforces for you'],
                        ['faq', 'Questions teachers ask'],
                    ].map(([id, label]) => (
                        <li key={id}><a href={`#${id}`} className="text-sky-700 hover:underline dark:text-sky-400">{label}</a></li>
                    ))}
                </ol>
            </nav>

            {/* ── Quick code ────────────────────────────────────────────── */}
            <h2 id="quick" className={H2}>The quick way: a code for a live test</h2>
            <p className={P}>
                Already started a test as an online exam? Give it a code in two taps. Nothing else changes: same paper, same
                settings, same results page.
            </p>
            <ol className="mt-4 space-y-3">
                <Step n={1} title="Open the ••• menu of the live exam">On your dashboard under <strong>Live now</strong>, or in <strong>My Tests</strong>.</Step>
                <Step n={2} title="Tap “Get a join code”">A new line appears under the exam link. The WhatsApp message now carries the code too.</Step>
                <Step n={3} title="Tell candidates the code">Write it on the board or say it out loud. They open testoza.com/join, type it and land on the same exam page as the link.</Step>
            </ol>
            <div className={`${CARD} mt-5 p-4`}>
                <p className="mb-1.5 text-xs font-medium text-slate-500">Exam link — send this to your candidates</p>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700 dark:bg-white/5 dark:text-slate-300">
                    <span className="min-w-0 flex-1 truncate">testoza.com/test/physics-mock-3-k8x2q</span>
                    <Copy className="h-4 w-4 shrink-0 text-sky-600" />
                </div>
                <p className="mb-1.5 mt-3 text-xs font-medium text-slate-500">
                    Or tell candidates: go to <span className="font-semibold text-slate-700 dark:text-slate-200">testoza.com/join</span> and enter
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1.5 pl-3 dark:bg-white/10">
                    <KeyRound className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="min-w-0 flex-1 text-[20px] font-bold tracking-[0.12em] text-slate-900 tabular-nums dark:text-white">482 913</span>
                    <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-sky-700 shadow-sm ring-1 ring-slate-900/5 dark:bg-white/10 dark:text-sky-300"><Copy className="h-3.5 w-3.5" /> Copy</span>
                </div>
                <p className="mt-3 text-[12px] text-slate-500">What you see under a live exam after tapping “Get a join code”.</p>
            </div>
            <Note>The code stops working the moment you stop the exam. Use the link or the code — both open the same exam.</Note>

            {/* ── Which ─────────────────────────────────────────────────── */}
            <h2 id="which" className={H2}>Quick code or exam room?</h2>
            <div className={`${CARD} mt-4 overflow-x-auto`}>
                <table className="w-full min-w-[520px] text-left text-[14px]">
                    <thead className="bg-slate-50 text-[12px] uppercase tracking-[0.08em] text-slate-500 dark:bg-white/5">
                        <tr><th className="px-4 py-2.5 font-semibold" scope="col">You want</th><th className="px-4 py-2.5 font-semibold" scope="col">Quick code</th><th className="px-4 py-2.5 font-semibold" scope="col">Exam room</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-white/10 dark:text-slate-300">
                        {[
                            ['A code instead of a long link', true, true],
                            ['Nothing to set up', true, false],
                            ['Same paper for many batches, separate rank lists', false, true],
                            ['Lobby, start together, live monitor, more time', false, true],
                            ['Roll number + PIN check-in, absent list', false, true],
                            ['Rank list, report cards, results to parents', false, true],
                        ].map(([what, quick, room]) => (
                            <tr key={what as string}>
                                <td className="px-4 py-2.5">{what}</td>
                                <td className="px-4 py-2.5">{quick ? <Check className="h-4 w-4 text-emerald-600" aria-label="Yes" /> : <span className="text-slate-400" aria-label="No">—</span>}</td>
                                <td className="px-4 py-2.5">{room ? <Check className="h-4 w-4 text-emerald-600" aria-label="Yes" /> : <span className="text-slate-400" aria-label="No">—</span>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className={P}>
                Start with the quick code. Move to exam rooms when you run the same paper for several batches or send results to
                parents. The rest of this page is about exam rooms; batches and PINs are optional extras.
            </p>

            {/* ── Words ─────────────────────────────────────────────────── */}
            <h2 id="words" className={H2}>Three words to know</h2>
            <dl className="mt-4 space-y-3">
                <Term word="Paper" icon={Copy}>A test you made in TestoZa: the questions, marks and sections. You write it once.</Term>
                <Term word="Exam (sitting)" icon={Clock}>One time a batch sits that paper. It has its own code, start time, check-in rule and rank list. The same paper can be sat many times.</Term>
                <Term word="Batch" icon={GraduationCap}>A class or timing with a candidate list, like “JEE 2027 – Morning”. Batches are optional but let candidates check in by roll number and show you who was absent.</Term>
            </dl>

            {/* ── Batch ─────────────────────────────────────────────────── */}
            <h2 id="batch" className={H2}>1. Make a batch and add candidates</h2>
            <p className={P}>
                Open <Link to="/batches" className="font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-400">Batches</Link> in the menu,
                tap <Kbd>New batch</Kbd>, then <Kbd>Add candidates</Kbd>. There are three ways to add them:
            </p>
            <ul className="mt-3 space-y-2 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
                <Li><strong className="text-slate-900 dark:text-white">Paste</strong> — copy the roll-number, name and phone columns from Excel and paste. Lines like <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[14px] dark:bg-white/10">23A017, Rahul Kumar, 9876543210</code> also work.</Li>
                <Li><strong className="text-slate-900 dark:text-white">Excel / CSV</strong> — upload the sheet. Columns named “Roll No”, “Name” and “Parent Phone” are found automatically.</Li>
                <Li><strong className="text-slate-900 dark:text-white">One by one</strong> — for a new admission.</Li>
            </ul>
            <Note>Adding the same roll number again updates that candidate instead of making a copy. Parent phone numbers are optional, but they let you send each result to the parent on WhatsApp.</Note>

            {/* ── PINs ──────────────────────────────────────────────────── */}
            <h2 id="pins" className={H2}>2. Give candidates PINs (optional)</h2>
            <p className={P}>
                For mocks that go to parents, candidates check in with their roll number and a 4-digit PIN, the way JEE and NEET
                computer-based tests ask for an application number and password. On the batch page tap <Kbd>PINs</Kbd> →
                <Kbd>Make PINs and print slips</Kbd>. You get cut-out slips, three across an A4 sheet.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[['Rahul Kumar', '23A017', '4829'], ['Priya Sharma', '23A018', '7316'], ['Aman Verma', '23A019', '5092']].map(([name, roll, pin]) => (
                    <div key={roll} className="rounded-xl border border-dashed border-slate-300 bg-white p-4 dark:border-white/20 dark:bg-[#16181c]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">JEE 2027 — Morning</p>
                        <p className="mt-1 text-[15px] font-semibold text-slate-900 dark:text-white">{name}</p>
                        <p className="text-[13px] text-slate-600 dark:text-slate-400">Roll {roll}</p>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">PIN</p>
                        <p className="text-[28px] font-bold leading-none tracking-[0.25em] text-slate-900 tabular-nums dark:text-white">{pin}</p>
                    </div>
                ))}
            </div>
            <Note tone="warning">PINs are shown only once, on the slips. TestoZa stores only a scrambled copy and never shows a PIN again. If a candidate loses a slip, tap <strong>New PIN</strong> next to their name.</Note>

            {/* ── Create ────────────────────────────────────────────────── */}
            <h2 id="create" className={H2}>3. Create the exam</h2>
            <p className={P}>
                Open <Link to="/exams" className="font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-400">Exams</Link> and tap <Kbd>New exam</Kbd>
                (or <em>Give with a join code</em> from a test’s menu on your dashboard). Only two things are needed: the
                question paper and when it starts. Everything else sits under <Kbd>More options</Kbd> with safe defaults
                (no batch, name check-in, 15 min late entry, results when the exam ends).
            </p>
            <div className={`${CARD} mt-4 divide-y divide-slate-100 overflow-hidden dark:divide-white/10`}>
                <Setting name="Question paper" value="Any test you made that has questions." />
                <Setting name="Starts" value="Now, or a date and time. Candidates can wait in the lobby from 30 minutes before." />
                <Setting name="Batch (more options)" value="Optional. Needed for roll-number check-in and the absentee list." />
                <Setting name="Late entry" value="How long after the start new candidates may still join (default 15 min)." />
                <Setting name="Start" value="On time (automatic) or I tap Start (everyone’s timer starts together)." />
                <Setting name="Check in with" value="Name only · Roll number · Roll number + PIN." />
                <Setting name="Show results" value="When the exam ends (recommended) · right after submitting · when I release them." />
            </div>
            <p className={P}>Tap <Kbd>Create exam and get the code</Kbd>. You get the code, a QR code and a WhatsApp message ready to send.</p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className={`${CARD} p-5`}>
                    <p className="text-[13px] text-slate-500">Candidates open <span className="font-semibold text-slate-800 dark:text-slate-200">testoza.com/join</span> and type</p>
                    <p className="mt-1 text-[48px] font-bold leading-none tracking-[0.06em] text-slate-900 tabular-nums dark:text-white">482 913</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200"><Copy className="h-4 w-4 text-sky-600" /> Code</span>
                        <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 text-[13px] font-semibold text-white">WhatsApp</span>
                        <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200"><MonitorPlay className="h-4 w-4 text-sky-600" /> Projector</span>
                    </div>
                    <p className="mt-3 text-[12px] text-slate-500">The exam room shows the code like this.</p>
                </div>
                <div className="rounded-2xl bg-[#e5ddd5] p-4 dark:bg-[#0b141a]">
                    <div className="ml-auto max-w-[320px] whitespace-pre-line rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[13.5px] leading-snug text-slate-900 shadow-sm dark:bg-[#005c4b] dark:text-white">
                        {'📝 *Physics Mock Test 3*\nJEE 2027 — Morning · Sat 4 Oct, 10:00 · 60 min\n\n1. Open testoza.com/join\n2. Enter code *482 913*\n3. Type your roll number and the PIN on your slip'}
                    </div>
                    <p className="mt-3 text-center text-[12px] text-slate-600 dark:text-slate-400">The message you send to the batch group</p>
                </div>
            </div>

            {/* ── Exam day ──────────────────────────────────────────────── */}
            <h2 id="day" className={H2}>4. On exam day</h2>
            <ol className="mt-4 space-y-3">
                <Step n={1} title="Put the code on the projector">Open the exam and tap <Kbd>Projector</Kbd>. The code, QR code and the names of candidates who have joined fill the screen. Nothing private (no marks) is shown on it.</Step>
                <Step n={2} title="Candidates join and wait">They see “You’re in” and a countdown, or “Waiting for your teacher to start”. You see “23 of 40 in the lobby”.</Step>
                <Step n={3} title="Start">With <em>On time</em> the exam starts by itself. With <em>I tap Start</em>, tap <Kbd>Start exam now</Kbd> and every candidate gets a Start button at the same moment. Their timer begins when they tap it.</Step>
            </ol>
            <div className="mt-6 flex justify-center">
                <PhoneReplica />
            </div>

            {/* ── Monitor ───────────────────────────────────────────────── */}
            <h2 id="monitor" className={H2}>5. Watch the exam live</h2>
            <p className={P}>The <strong className="text-slate-900 dark:text-white">Candidates</strong> tab refreshes every few seconds. Anyone who needs a look comes to the top.</p>
            <ul className={`${CARD} mt-4 divide-y divide-slate-100 overflow-hidden dark:divide-white/10`}>
                <MonitorRow name="Rahul Kumar" roll="23A017" status={<span className="text-emerald-700 dark:text-emerald-400">Writing · 34:12 left</span>} answered={21} progress={70} />
                <MonitorRow name="Priya Sharma" roll="23A018" status={<span className="inline-flex items-center gap-1 text-amber-700"><WifiOff className="h-3.5 w-3.5" /> No signal for 2:10</span>} answered={14} progress={45}
                    flags={<span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[12px] font-medium text-violet-700 ring-1 ring-inset ring-violet-600/15"><Smartphone className="h-3 w-3" />Changed device</span>} />
                <MonitorRow name="Aman Verma" roll="23A019" status={<span className="text-emerald-700 dark:text-emerald-400">Writing · 34:12 left</span>} answered={18} progress={60}
                    flags={<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20"><AlertTriangle className="h-3 w-3" />2 warnings</span>} />
                <MonitorRow name="Sara Khan" roll="23A020" status={<span className="text-slate-600 dark:text-slate-400">Submitted 10:47</span>} answered={30} />
            </ul>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Action icon={Plus} title="More time">For one candidate (power cut, phone trouble) or for everyone still writing. It reaches their screen within 20 seconds.</Action>
                <Action icon={Send} title="Submit their exam now">Their screen submits by itself with whatever they have answered.</Action>
                <Action icon={Smartphone} title="Phone died?">The candidate joins again on any device with the same roll number (and PIN). The answers they had saved come back and the timer carries on.</Action>
                <Action icon={KeyRound} title="Forgot the PIN?">Tap <strong>New PIN</strong> on their row and read it out. The old one stops working.</Action>
            </div>
            <Note>“Warnings” count leaving full screen or switching apps, using the anti-cheating settings of the paper. “Changed device” means the candidate joined again from another phone — fine after a dead battery, worth a look otherwise.</Note>

            {/* ── Results ───────────────────────────────────────────────── */}
            <h2 id="results" className={H2}>6. Results, rank list and report cards</h2>
            <p className={P}>
                When the exam closes (or you tap <Kbd>End exam</Kbd>), anyone who started but never submitted has their last saved
                answers submitted for them, so a dead phone never means a zero. The <strong className="text-slate-900 dark:text-white">Results</strong> tab then shows:
            </p>
            <ul className="mt-3 space-y-2 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
                <Li>Average, highest and lowest marks, and the class average for each section (Physics, Chemistry, Maths…).</Li>
                <Li>The rank list. Equal marks share a rank; fewer wrong answers, then fewer skipped, then less time break ties.</Li>
                <Li><strong className="text-slate-900 dark:text-white">Copy rank list / Send on WhatsApp</strong> — a ready message with medals for the top three and the absent candidates at the end.</Li>
                <Li><strong className="text-slate-900 dark:text-white">Excel</strong> — every candidate with section marks, time taken and warnings.</Li>
                <Li><strong className="text-slate-900 dark:text-white">Parent</strong> — a WhatsApp message to that candidate’s parent with marks, rank and section marks. Absent candidates get a “please contact us about a re-test” note.</Li>
                <Li><strong className="text-slate-900 dark:text-white">Report cards</strong> — one A4 page per candidate with your institute’s logo, marks, rank, section table, strong and weak topics and a remark. Print, or save as PDF.</Li>
                <Li><strong className="text-slate-900 dark:text-white">Re-test for absentees</strong> — the same paper with a new code. Candidates who already sat it can’t join.</Li>
            </ul>
            <div className="mt-5 flex justify-center">
                <div className="w-full max-w-sm rounded-2xl bg-[#e5ddd5] p-4 dark:bg-[#0b141a]">
                    <div className="ml-auto whitespace-pre-line rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[13.5px] leading-snug text-slate-900 shadow-sm dark:bg-[#005c4b] dark:text-white">
                        {'🏆 *Physics Mock Test 3* — JEE 2027 — Morning\n38 candidates · Average 71/120\n\n🥇 Sara Khan (23A020) — 114/120 (95%)\n🥈 Rahul Kumar (23A017) — 104/120 (87%)\n🥉 Aman Verma (23A019) — 96/120 (80%)\n4. Priya Sharma (23A018) — 83/120 (69%)\n…\n\nAbsent: Kabir Das, Meera Iyer'}
                    </div>
                </div>
            </div>

            {/* ── Students ──────────────────────────────────────────────── */}
            <h2 id="students" className={H2}>What candidates see</h2>
            <ol className="mt-4 space-y-3">
                <Step n={1} title="testoza.com/join">Six boxes for the code, with the phone’s number pad. No account, no email, no OTP.</Step>
                <Step n={2} title="Their details">The exam name, your institute, time and number of questions, then name / roll number / PIN — whatever you chose.</Step>
                <Step n={3} title="The lobby">“You’re in, Rahul”, a countdown or “Waiting for your teacher”, how many have joined, and tips: keep the page open, charge the phone.</Step>
                <Step n={4} title="The exam">The normal TestoZa exam screen, in full screen if your paper asks for it. Answers are saved to the server every 20 seconds.</Step>
                <Step n={5} title="Submitted">“Submitted at 10:47”. Their marks, rank, section marks and strong / weak topics appear on the same page once results are released.</Step>
            </ol>

            {/* ── Safety ────────────────────────────────────────────────── */}
            <h2 id="safety" className={H2}>What TestoZa enforces for you</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Rule icon={Check} title="One attempt per candidate">The database itself refuses a second submission for the same candidate in a sitting.</Rule>
                <Rule icon={Lock} title="Answers stay hidden">With “when the exam ends”, nobody sees the answer key or results while others are still writing.</Rule>
                <Rule icon={Clock} title="Server time, not phone time">Countdowns use TestoZa’s clock, so a phone set to the wrong time changes nothing. Nobody can write after the closing time.</Rule>
                <Rule icon={KeyRound} title="Codes expire">A code works only while its exam is open, and guessing is rate-limited. After the exam the same number can go to someone else.</Rule>
                <Rule icon={ShieldCheck} title="Marks checked on the server">Scores are worked out by TestoZa from the answer key, never taken from the candidate’s phone.</Rule>
                <Rule icon={RotateCcw} title="Nothing lost">Late or offline submissions within 15 minutes are accepted and marked late; unsent answers are collected at the end.</Rule>
            </div>

            {/* ── FAQ ───────────────────────────────────────────────────── */}
            <h2 id="faq" className={H2}>Questions teachers ask</h2>
            <div className="mt-4 space-y-3">
                <Faq q="Is the old “Conduct exam” link still there?">Yes. It still works the way it did, and you can add a code to it with “Get a join code”. Exam rooms are for exams you run with a batch.</Faq>
                <Faq q="Is it only for students?">No. Anyone can be a candidate: school and coaching students, job applicants in a recruitment test, or staff in a training quiz. Use name check-in, or put the application numbers in a batch as roll numbers.</Faq>
                <Faq q="Which check-in should I use?">Name only for a quick class quiz. Roll number for weekly tests. Roll number + PIN for monthly mocks and anything that goes to parents — it is the only one that stops a friend typing someone else’s roll number.</Faq>
                <Faq q="A candidate came late. What happens?">They can join until the late-entry time. They get the full duration, but nobody can write past the exam’s closing time. If they need longer, give them more time from their row.</Faq>
                <Faq q="Can I use the same paper for my evening batch?">Yes. Create another exam with the same paper and the evening batch. Each has its own code and rank list.</Faq>
                <Faq q="Do candidates need the app or an account?">No. Any phone or computer with a browser works. Candidates never sign up.</Faq>
                <Faq q="Where do I change anti-cheating (full screen, tab switching)?">On the paper itself: open the test’s Settings. Every exam of that paper uses those settings.</Faq>
            </div>
        </div>
    );
}

/* ── Small pieces ──────────────────────────────────────────────────────────── */

function Kbd({ children }: { children: React.ReactNode }) {
    return <span className="mx-0.5 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[14px] font-semibold text-slate-800 dark:bg-white/10 dark:text-slate-100">{children}</span>;
}

function Li({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex gap-2.5">
            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
            <span>{children}</span>
        </li>
    );
}

function Note({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warning' }) {
    return (
        <p className={`mt-5 rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${tone === 'warning'
            ? 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-200'
            : 'bg-sky-50 text-sky-900 ring-1 ring-inset ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-200'}`}>
            {children}
        </p>
    );
}

function Term({ word, icon: Icon, children }: { word: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
    return (
        <div className={`${CARD} flex gap-3 p-4`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"><Icon className="h-[18px] w-[18px]" /></span>
            <div>
                <dt className="text-[15px] font-semibold text-slate-900 dark:text-white">{word}</dt>
                <dd className="mt-0.5 text-[15px] leading-snug text-slate-600 dark:text-slate-400">{children}</dd>
            </div>
        </div>
    );
}

function Setting({ name, value }: { name: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
            <span className="w-40 shrink-0 text-[15px] font-semibold text-slate-900 dark:text-white">{name}</span>
            <span className="text-[15px] text-slate-600 dark:text-slate-400">{value}</span>
        </div>
    );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <li className={`${CARD} flex gap-3.5 p-4`}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white">{n}</span>
            <div>
                <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</p>
                <p className="mt-0.5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">{children}</p>
            </div>
        </li>
    );
}

function Action({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
    return (
        <div className={`${CARD} p-4`}>
            <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900 dark:text-white"><Icon className="h-4 w-4 text-sky-600" /> {title}</p>
            <p className="mt-1 text-[14px] leading-snug text-slate-600 dark:text-slate-400">{children}</p>
        </div>
    );
}

function Rule({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
    return (
        <div className={`${CARD} flex gap-3 p-4`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><Icon className="h-4 w-4" /></span>
            <div>
                <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</p>
                <p className="mt-0.5 text-[14px] leading-snug text-slate-600 dark:text-slate-400">{children}</p>
            </div>
        </div>
    );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
    return (
        <details className={`${CARD} group p-4`}>
            <summary className="cursor-pointer list-none text-[16px] font-semibold text-slate-900 marker:hidden dark:text-white">
                <span className="mr-2 inline-block text-sky-600 transition-transform group-open:rotate-90">›</span>{q}
            </summary>
            <p className="mt-2 pl-5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">{children}</p>
        </details>
    );
}

function MonitorRow({ name, roll, status, answered, progress, flags }: {
    name: string; roll: string; status: React.ReactNode; answered: number; progress?: number; flags?: React.ReactNode;
}) {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2);
    return (
        <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[13px] font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">{initials}</span>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">{name}</span>
                    <span className="text-[13px] text-slate-500">{roll}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
                    {status}
                    <span className="text-slate-500">{answered} answered</span>
                    {flags}
                </div>
                {progress !== undefined && (
                    <div className="mt-1.5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </div>
        </li>
    );
}

function PhoneReplica() {
    return (
        <div className="w-[290px] rounded-[44px] bg-slate-900 p-3 shadow-2xl ring-1 ring-black/10">
            <div className="overflow-hidden rounded-[34px] bg-[#f2f2f7] bg-[radial-gradient(600px_220px_at_50%_-80px,rgba(14,165,233,0.14),transparent)] px-4 pb-6 pt-8">
                <div className="mx-auto mb-5 h-5 w-24 rounded-full bg-slate-900" aria-hidden="true" />
                <div className="text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-white">
                        <Check className="h-7 w-7" strokeWidth={3} />
                    </span>
                    <p className="mt-3 text-[20px] font-bold tracking-[-0.02em] text-slate-900">You're in, Rahul</p>
                    <p className="text-[13px] text-slate-600">Physics Mock Test 3</p>
                </div>
                <div className="mt-4 rounded-[18px] bg-white p-4 text-center shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Starts in</p>
                    <p className="mt-1 text-[38px] font-bold leading-none tracking-[-0.03em] text-slate-900 tabular-nums">4:52</p>
                    <p className="mt-1.5 text-[12px] text-slate-600">at 10:00 am</p>
                    <p className="mt-3 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-3 text-[12px] text-slate-600"><Users className="h-3.5 w-3.5 text-slate-400" /> 23 of 40 joined</p>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                    <QrCode value="https://testoza.com/join/482913" size={64} />
                    <p className="text-[11px] leading-snug text-slate-500">Candidates can also<br />scan the projector QR</p>
                </div>
            </div>
        </div>
    );
}
