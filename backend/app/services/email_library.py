"""
The ready-made emails of admin → Email Broadcast.

Each email is written for one stage of one kind of person (SQL public.email_people):

  stage : new (no test yet) · drafted (a test nobody took) · tried (only themselves, or
          1–4 answers) · quiet (5+ answers, nothing for 21 days) · active (5+ answers)
  who   : educator · institution · corporate (company email) · student · no_role

Emails of a `track` go out in `step` order, `wait_days` after the person's previous email
of that track; a person who moves on (makes a test, gets results) leaves the track by
itself because their stage changes. The backend copies these into public.email_templates
once; edits made in admin are kept there. "Restore original" copies the text below again.

Body format (rendered by services/email_render.py):
  blank line = new paragraph · "- " = bullet · **bold** · [text](link) ·
  a paragraph that is only [[Button text]](link) = a button ·
  {first_name|there} = a person's detail, with what to write when it's missing.

Every claim here was checked against the product on 2026-10-24 (My Tests "Conduct exam",
••• → "Get a join code", testoza.com/join, exam rooms with Projector, rank list on
WhatsApp, report cards, AI import from PDF / Word / photo, the CBT-style exam screen with
the question palette). Never write "free": pricing is changing.
"""

from typing import Any, Dict, List

EDU = ["educator", "institution"]

SIGN = "Nirwair\nTestoZa"
SIGN_FOUNDER = "Nirwair\nFounder, TestoZa"

LIBRARY: List[Dict[str, Any]] = [
    # ── Signed up, no test yet ──────────────────────────────────────────────
    {
        "key": "new-edu-1-paper", "sort": 100, "track": "new-edu", "step": 1, "wait_days": 0,
        "stages": ["new"], "audiences": EDU, "min_days_joined": 1, "min_days_quiet": 1,
        "name": "Your paper becomes a test",
        "subject": "Your next test, without typing it again",
        "preheader": "Upload the paper you already have. TestoZa reads it for you.",
        "why": "First nudge after sign-up. The biggest blocker for a pen-and-paper teacher is retyping "
               "questions, so this email removes it. One button, one ask.",
        "body": f"""Hi {{first_name|there}},

You signed up for TestoZa but haven't made a test yet. That's normal. Most teachers already have their questions on paper, and nobody wants to type them twice.

You don't have to. Upload the question paper as a PDF or Word file, or take a photo of it. TestoZa reads the questions and options and turns them into an online test in a minute or two. You check it, fix anything, and it's ready.

[[Turn a paper into a test]]({{app}}/generate-with-ai)

Try it with last week's paper. If something comes out wrong, reply and tell us. A real person reads every reply.

{SIGN}""",
    },
    {
        "key": "new-edu-2-cbt", "sort": 100, "track": "new-edu", "step": 2, "wait_days": 6,
        "stages": ["new"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 3,
        "name": "Their real exam is on a computer",
        "subject": "Your students' real exam is on a computer",
        "preheader": "Let them meet that screen before exam day, not in the exam hall.",
        "why": "The strongest reason to start: the student's exam has already moved to a computer. "
               "It doesn't ask the teacher to give up paper, only to add one online test a week.",
        "body": f"""Hi {{first_name|there}},

JEE Main, JEE Advanced, CUET, SSC, banking and railway exams are all taken on a computer now. Many students see that screen for the first time in the exam hall: the question palette, Save & Next, Mark for Review, the clock in the corner. Precious minutes go in getting used to it.

TestoZa opens your test in the same layout, with the question palette on the right and a running timer. Your students get used to the format with your questions, and you keep teaching the way you do.

You don't need to give up paper tests. Start with one short online test a week.

[[Make one practice test]]({{app}}/generate-with-ai)

{SIGN}""",
    },
    {
        "key": "new-edu-3-ask", "sort": 100, "track": "new-edu", "step": 3, "wait_days": 10,
        "stages": ["new"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 7,
        "name": "What stopped you?",
        "subject": "Can I ask what stopped you?",
        "preheader": "One line is enough. Your answer decides what we fix next.",
        "why": "Last email of this track. No button on purpose: a reply is the ask. Replies tell us what "
               "to fix, and they also help our emails land in the inbox instead of Promotions.",
        "body": f"""Hi {{first_name|there}},

You signed up for TestoZa a while ago but haven't made a test. I'd like to know why. Not to sell you anything: your answer decides what we fix next.

Was it one of these?

- My questions are in a format it couldn't read
- My students don't have phones or computers for tests
- I didn't have time to try it
- Something else

Just reply with a number, or a line. I read every reply.

{SIGN_FOUNDER}""",
    },

    # ── Made a test, nobody has taken it ────────────────────────────────────
    {
        "key": "drafted-edu-1-share", "sort": 200, "track": "drafted-edu", "step": 1, "wait_days": 0,
        "stages": ["drafted"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 2,
        "name": "Your test is ready for students",
        "subject": "{test_title|Your test} is ready for students",
        "preheader": "Two ways to get it to them. Both take a minute.",
        "why": "They did the hard part (making the test) and stopped before the payoff. Most don't know "
               "how students actually get the test, so the email shows exactly that.",
        "body": f"""Hi {{first_name|there}},

You made **{{test_title|a test}}** on TestoZa, but no one has taken it yet. Here are the two easiest ways to get answers in.

**1. Send the link.** Open My Tests and tap Conduct exam. You get a secure link: send it to your class WhatsApp group. Students open it on their phone. There's no app to install.

**2. Give a code in class.** In the exam's ••• menu, tap Get a join code. Write the six digits on the board. Students open testoza.com/join, type the code and start.

[[Open My Tests]]({{app}}/my-tests)

Every answer is marked for you, and scores appear on My Tests as students submit.

{SIGN}""",
    },
    {
        "key": "drafted-edu-2-small", "sort": 200, "track": "drafted-edu", "step": 2, "wait_days": 7,
        "stages": ["drafted"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 3,
        "name": "Start with ten minutes",
        "subject": "Try it in class for ten minutes",
        "preheader": "Ten questions, ten minutes, marks before the bell.",
        "why": "Makes the first exam feel small and safe, and answers the two worries teachers raise "
               "first: copying, and students without phones.",
        "body": f"""Hi {{first_name|there}},

The easiest first exam is a small one. Ten questions, ten minutes, at the start of your next class.

Students open the link or type the join code, answer on their phone and submit. TestoZa marks every answer, negative marks included, and you see who scored what before the class ends.

Two things teachers ask first:

- **What about copying?** In the test's Settings, TestoZa can warn students, or submit for them, when they leave the exam to switch apps.
- **No phones in class?** Send the link as homework instead. The timer still runs.

[[Open My Tests]]({{app}}/my-tests)

{SIGN}""",
    },
    {
        "key": "drafted-edu-3-help", "sort": 200, "track": "drafted-edu", "step": 3, "wait_days": 10,
        "stages": ["drafted"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 7,
        "name": "We'll set it up with you",
        "subject": "Want us to set up your first exam with you?",
        "preheader": "Reply with the date and class size. We'll send the exact steps.",
        "why": "A personal offer of help. The people who answer it are the best leads we have, so answer "
               "them the same day.",
        "body": f"""Hi {{first_name|there}},

**{{test_title|Your test}}** is still waiting for its first student. If setting up the exam is the hard part, let us do it with you.

Reply with three things:

- the date and time of your next test
- how many students will take it
- whether they'll use phones, a computer lab, or write from home

We'll reply with the exact steps for your class, or help you on WhatsApp if that's easier.

{SIGN_FOUNDER}""",
    },

    # ── Tried it alone, or 1–4 answers ──────────────────────────────────────
    {
        "key": "tried-edu-1-class", "sort": 300, "track": "tried-edu", "step": 1, "wait_days": 0,
        "stages": ["tried"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 2,
        "name": "Now try it with the whole class",
        "subject": "You've tried it. Now try it with your class",
        "preheader": "What you get when 30 students take the same test at once.",
        "why": "They've seen the exam screen but not the payoff, which only shows with a full class: "
               "instant marks and a rank list.",
        "body": f"""Hi {{first_name|there}},

You've tried TestoZa yourself. Good. The part that saves you hours only shows up when a whole class takes the same test:

- every answer marked the moment they submit, negative marks included
- a rank list with every student's score
- no papers to collect, carry home or check

Send **{{test_title|your test}}** to the class WhatsApp group, or give a join code in class.

[[Send it to your class]]({{app}}/my-tests)

{SIGN}""",
    },
    {
        "key": "tried-edu-2-room", "sort": 300, "track": "tried-edu", "step": 2, "wait_days": 7,
        "stages": ["tried"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 3,
        "name": "Run it like a real exam",
        "subject": "Run your next test like a real exam",
        "preheader": "Code on the projector, everyone starts together, results to parents.",
        "why": "Shows exam rooms to people who've used the basic link. This is what makes a coaching "
               "institute's weekly mock feel professional.",
        "body": f"""Hi {{first_name|there}},

For a weekly test or a monthly mock, TestoZa has exam rooms:

- Open the exam and tap Projector. The join code fills the screen, with the names of students as they join.
- Tap Start exam now and everyone's timer starts together.
- If a phone dies mid-exam, the student joins again on any phone with the same roll number, and their saved answers come back.
- After the exam, send the rank list to the class on WhatsApp, or each result to the parent.

[[Read the 5-minute guide]]({{app}}/user-guide/live-exam-sessions)

{SIGN}""",
    },
    {
        "key": "tried-edu-3-ask", "sort": 300, "track": "tried-edu", "step": 3, "wait_days": 10,
        "stages": ["tried"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 7,
        "name": "What would make it weekly?",
        "subject": "What would make TestoZa worth using every week?",
        "preheader": "You tried it. Tell us what's missing. One line is enough.",
        "why": "People who tried it and stopped know exactly what's missing. A reply is the ask.",
        "body": f"""Hi {{first_name|there}},

You tried TestoZa, but haven't run a full class test yet. Something stopped you, and I'd like to know what.

Was it the questions, the exam screen, your students' phones, the results, or just time? Hit reply and tell me in a line. If it's something we can fix, we'll fix it, and I'll write back when it's done.

{SIGN_FOUNDER}""",
    },

    # ── Ran a real exam, then went quiet ────────────────────────────────────
    {
        "key": "quiet-edu-1-results", "sort": 400, "track": "quiet-edu", "step": 1, "wait_days": 0,
        "stages": ["quiet"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 21,
        "name": "Your last exam, and the next one",
        "subject": "{top_test_results} students took {top_test_title|your test}",
        "preheader": "Their marks are still saved. The next test takes a few minutes.",
        "why": "They got real value once. Remind them of their own number, make the next test easy, "
               "and invite the honest reason they stopped.",
        "body": f"""Hi {{first_name|there}},

{{top_test_results}} students took **{{top_test_title|your test}}** on TestoZa. Their marks and ranks are still saved in your account.

If you're planning the next test, the quickest way is to upload the next paper (PDF, Word or a photo) and send it the same way.

[[Make the next test]]({{app}}/generate-with-ai)

And if something about the last exam didn't go well, reply and tell me. That's the email I most want to get.

{SIGN_FOUNDER}""",
    },
    {
        "key": "quiet-edu-2-new", "sort": 400, "track": "quiet-edu", "step": 2, "wait_days": 14,
        "stages": ["quiet"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 28,
        "name": "What's new since your last exam",
        "subject": "A few things we've added since your last exam",
        "preheader": "Join codes, section timers, report cards and more.",
        "why": "Gives a lapsed user a reason to look again. UPDATE THE LIST EVERY MONTH: only things that "
               "are live, newest first, at most five.",
        "body": f"""Hi {{first_name|there}},

A few things are new on TestoZa since your last exam:

- **Join codes.** Students open testoza.com/join and type six digits instead of a long link.
- **Section timers.** Give each section its own time, the way SSC and bank exams do.
- **Report cards.** One A4 page per student with marks, rank, and strong and weak topics.
- **You choose what students see** after the exam: just the marks, the answer key, topic analysis, or your uploaded solutions.
- **Type in Hindi, Marathi, Bengali and more.** Type in English letters and TestoZa writes them in the script.

[[Open TestoZa]]({{app}}/dashboard)

{SIGN}""",
    },
    {
        "key": "quiet-edu-3-last", "sort": 400, "track": "quiet-edu", "step": 3, "wait_days": 14,
        "stages": ["quiet"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 42,
        "name": "Should I stop writing?",
        "subject": "Should I stop writing to you?",
        "preheader": "No hard feelings either way. One word is enough.",
        "why": "An honest last email. It often gets the most replies of the track, and it keeps our list "
               "clean: people who say stop are taken off.",
        "body": f"""Hi {{first_name|there}},

I've written a couple of times since your last exam on TestoZa and haven't heard back. That's completely fine.

If online tests aren't for you right now, there's nothing to do: this is the last email of this kind.

If they are and something got in the way, reply with one word, "help", and we'll get you set up for your next exam.

{SIGN_FOUNDER}""",
    },

    # ── Running exams regularly ─────────────────────────────────────────────
    {
        "key": "active-edu-1-thanks", "sort": 500, "track": "active-edu", "step": 1, "wait_days": 0,
        "stages": ["active"], "audiences": EDU, "min_days_joined": 7, "min_days_quiet": 0,
        "name": "Thank you, and one question",
        "subject": "Thank you, {first_name|and a question}",
        "preheader": "{results} answer sheets marked so far. What would save you more time?",
        "why": "Our best users hear from us least. A thank-you with their own number, and a question "
               "whose answers go straight into what we build next.",
        "body": f"""Hi {{first_name|there}},

Your students have handed in **{{results}}** answer sheets on TestoZa so far. Thank you for trusting us with your exams.

One question: what's the one thing that would save you the most time on exam day? Reply in a line. The best answers become our next features, and I'll tell you when yours ships.

{SIGN_FOUNDER}""",
    },
    {
        "key": "active-edu-2-settings", "sort": 500, "track": "active-edu", "step": 2, "wait_days": 21,
        "stages": ["active"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 0,
        "name": "Settings experienced teachers use",
        "subject": "Four settings experienced teachers use",
        "preheader": "Section timers, marking, what students see, and anti-cheating.",
        "why": "Deepens use among people who already run exams. Each item is a real setting on the test.",
        "body": f"""Hi {{first_name|there}},

You run exams on TestoZa regularly, so here are four settings worth knowing:

- **Section timers.** Lock each section to its own time, like SSC and bank exams.
- **Marking.** Set marks and negative marks per question, per section or for the whole test, including JEE Advanced-style partial marks.
- **What students see after.** Just the marks, the answer key, topic analysis, or your uploaded solutions.
- **Anti-cheating.** Warn, limit or auto-submit when a student leaves the exam screen.

All of them are in each test's Settings.

[[Open My Tests]]({{app}}/my-tests)

{SIGN}""",
    },
    {
        "key": "active-edu-3-refer", "sort": 500, "track": "active-edu", "step": 3, "wait_days": 30,
        "stages": ["active"], "audiences": EDU, "min_days_joined": 0, "min_days_quiet": 0,
        "name": "Know a teacher still checking by hand?",
        "subject": "Know a teacher still checking papers by hand?",
        "preheader": "Teachers trust a teacher more than they trust us.",
        "why": "A teacher's word reaches other teachers better than any ad. Ask only people who run "
               "exams regularly, and only once.",
        "body": f"""Hi {{first_name|there}},

Teachers trust other teachers far more than they trust us. If you know someone who still spends evenings checking test papers, would you forward them this email?

They can start at testoza.com with a paper they already have. And if they mention your name when they write to us, we'll help them set up their first exam ourselves.

[[See TestoZa]]({{site}})

Thank you for helping.

{SIGN}""",
    },

    # ── Institutions ────────────────────────────────────────────────────────
    {
        "key": "inst-batches", "sort": 600, "track": None, "step": 1, "wait_days": 0,
        "stages": ["tried", "active", "quiet"], "audiences": ["institution"], "min_days_joined": 3, "min_days_quiet": 0,
        "name": "One paper for every batch",
        "subject": "One paper, every batch, separate rank lists",
        "preheader": "Batches, roll-number check-in with PINs, and report cards.",
        "why": "For coaching institutes and schools that already run tests. Batches and exam rooms are "
               "what make TestoZa fit an institute's week.",
        "body": f"""Hi {{first_name|there}},

If you run the same test for several batches, TestoZa can keep them apart:

- **Batches.** Paste your student list from Excel: roll number, name, parent's phone.
- **Check-in with roll number and PIN.** Print PIN slips, three to an A4 sheet, so no one can sit an exam for a friend.
- **One exam per batch.** Each with its own code, rank list and absent list.
- **Report cards.** One page per student with your logo, ready to print or send to parents.

[[Set up your first batch]]({{app}}/batches)

{SIGN}""",
    },

    # ── Company email (training, hiring) ────────────────────────────────────
    {
        "key": "corp-1-assess", "sort": 700, "track": "corp", "step": 1, "wait_days": 0,
        "stages": ["new", "drafted", "tried"], "audiences": ["corporate"], "min_days_joined": 1, "min_days_quiet": 2,
        "name": "Assessments from your own material",
        "subject": "Assessments from your own training material",
        "preheader": "Upload a PDF or Word file. Get a timed, auto-marked assessment.",
        "why": "People who signed up with a company email usually want training checks or screening "
               "tests, not school exams. Check the list first: a school with its own domain can land here.",
        "body": f"""Hi {{first_name|there}},

You signed up for TestoZa with your work email, so I'm guessing you want to test people, not students: a check after training, or a screening test before an interview.

Upload your training material or an existing question set (PDF or Word). TestoZa turns it into a timed, auto-marked assessment. Send the link, or a six-digit join code. People take it in a browser, with no account and no app, and you get a rank list with each person's score.

[[Make an assessment]]({{app}}/generate-with-ai)

{SIGN}""",
    },
    {
        "key": "corp-2-ask", "sort": 700, "track": "corp", "step": 2, "wait_days": 10,
        "stages": ["new", "drafted", "tried"], "audiences": ["corporate"], "min_days_joined": 0, "min_days_quiet": 5,
        "name": "What are you assessing?",
        "subject": "What are you assessing?",
        "preheader": "Tell us in a line and we'll show you the fastest way.",
        "why": "A reply ask. Company users have specific needs; the answer tells us whether we fit.",
        "body": f"""Hi {{first_name|there}},

Quick question: what do you want to assess, and how many people?

Reply in a line (for example "safety training, 200 staff a month" or "screening test for freshers"). I'll tell you honestly whether TestoZa fits, and the fastest way to set it up if it does.

{SIGN_FOUNDER}""",
    },

    # ── Students ────────────────────────────────────────────────────────────
    {
        "key": "student-1-practice", "sort": 800, "track": "student-new", "step": 1, "wait_days": 0,
        "stages": ["new"], "audiences": ["student"], "min_days_joined": 1, "min_days_quiet": 1,
        "name": "Practise on the exam screen",
        "subject": "Practise on the screen your exam uses",
        "preheader": "Turn your notes or a chapter into a timed test.",
        "why": "Students who sign up themselves are preparing for an exam. Give them one useful thing to "
               "do. Never send students more than one email a month.",
        "body": f"""Hi {{first_name|there}},

If your exam is on a computer (JEE, CUET, SSC, banking, railways), it helps to practise on the same kind of screen: question palette, Save & Next, a clock that keeps running.

On TestoZa you can make that practice yourself. Upload your notes, a chapter PDF or a photo of questions, and get a timed test that's marked the moment you submit.

[[Make a practice test]]({{app}}/generate-with-ai)

All the best for your preparation.

{SIGN}""",
    },
    {
        "key": "student-2-share", "sort": 800, "track": "student-made", "step": 1, "wait_days": 0,
        "stages": ["drafted", "tried"], "audiences": ["student"], "min_days_joined": 0, "min_days_quiet": 3,
        "name": "Test your friends",
        "subject": "Send your test to your study group",
        "preheader": "See who scores highest. It's marked for you.",
        "why": "Students who made a test can bring friends in. Each friend who takes it sees TestoZa. "
               "Keep it to one email.",
        "body": f"""Hi {{first_name|there}},

You made **{{test_title|a test}}** on TestoZa. Practice is more fun with friends: send it to your study group and see who scores highest.

Open My Tests and tap Conduct exam to get a link. Everyone's answers are marked the moment they submit, and you see the rank list.

[[Open My Tests]]({{app}}/my-tests)

{SIGN}""",
    },

    # ── No role yet ─────────────────────────────────────────────────────────
    {
        "key": "norole-1-who", "sort": 900, "track": "norole", "step": 1, "wait_days": 0,
        "stages": ["new"], "audiences": ["no_role"], "min_days_joined": 2, "min_days_quiet": 2,
        "name": "Tell us who you are",
        "subject": "Quick question: are you a teacher or a student?",
        "preheader": "One tap, so we only send what's useful to you.",
        "why": "They skipped choosing a role, so we can't tell what they need. One tap fixes that and "
               "moves them into the right track.",
        "body": f"""Hi {{first_name|there}},

Thanks for signing up to TestoZa. You didn't tell us who you are, so we don't know what would help you.

Are you a teacher, an institute, a student, or something else? It takes one tap, and then we'll only send what's useful to you.

[[Choose your role]]({{app}}/onboarding)

Or just reply with one word.

{SIGN}""",
    },
    {
        "key": "norole-2-what", "sort": 900, "track": "norole", "step": 2, "wait_days": 10,
        "stages": ["new"], "audiences": ["no_role"], "min_days_joined": 0, "min_days_quiet": 5,
        "name": "TestoZa in 30 seconds",
        "subject": "What TestoZa does, in 30 seconds",
        "preheader": "Paper to online test, marked for you, on any phone.",
        "why": "A short explanation for people who signed up without knowing what TestoZa is.",
        "body": f"""Hi {{first_name|there}},

In case you're wondering what TestoZa is for, here it is in three lines:

- **Make a test in minutes.** Upload a question paper (PDF, Word or a photo) and TestoZa turns it into an online test.
- **Give it on any phone.** Send a link on WhatsApp or give a six-digit code. No app, no sign-up for students.
- **Marked for you.** Scores and a rank list appear as students submit.

[[Make your first test]]({{app}}/generate-with-ai)

{SIGN}""",
    },

    # ── One-off: Survey 1.0 (app.testoza.com/survey/v1, read in admin → Support) ──
    # Links to app.testoza.com get utm_source=email, which the survey page stores as where
    # the answer came from. Each person gets each of these once.
    {
        "key": "survey-v1-not-sent", "sort": 940, "track": None, "step": 1, "wait_days": 0,
        "stages": ["drafted", "tried"], "audiences": EDU, "min_days_joined": 2, "min_days_quiet": 0,
        "name": "Survey: what stopped your test",
        "subject": "What stopped your test? (1 minute)",
        "preheader": "A few taps, no name needed. Your answer decides what we fix next.",
        "why": "For educators who made a test that never reached a whole class (nobody took it, or 1–4 "
               "answers). Survey 1.0 asks for ONE main reason, then one follow-up, so every reply points "
               "at a fix. Answers land in admin → Support → Survey 1.0.",
        "body": f"""Hi {{first_name|there}},

You made {{test_title|a test}} on TestoZa, but it hasn't reached a whole class yet. I'd like to know why.

Not to push you. Your answer decides what we build next, and the teachers who stop are the ones who can tell us what is wrong.

It's a few questions, about one minute, and most are a single tap. You don't need to give your name.

[[Answer in 1 minute]]({{app}}/survey/v1)

"It didn't work for me" is the most useful answer you can give. If you'd rather just reply to this email, that works too.

{SIGN_FOUNDER}""",
    },
    {
        "key": "survey-v1-running", "sort": 941, "track": None, "step": 1, "wait_days": 0,
        "stages": ["active", "quiet"], "audiences": EDU, "min_days_joined": 2, "min_days_quiet": 0,
        "name": "Survey: what would help you run more exams",
        "subject": "One minute to make TestoZa better?",
        "preheader": "You've run exams on TestoZa. Tell us what to fix first.",
        "why": "For educators who have run exams with 5 or more students. The same Survey 1.0 asks what "
               "stopped them giving more tests, or giving them to more students. Answers land in "
               "admin → Support → Survey 1.0.",
        "body": f"""Hi {{first_name|there}},

You've run exams on TestoZa, so you know where it helps and where it gets in the way.

We're deciding what to fix next, and I'd like your view. What stopped you giving more tests, or giving them to more students?

It's a few questions, about one minute, and most are a single tap. You don't need to give your name.

[[Answer in 1 minute]]({{app}}/survey/v1)

Thank you for trusting TestoZa with your class. If you'd rather just reply to this email, I read every reply.

{SIGN_FOUNDER}""",
    },

    # ── One-off: product news (edit before every send) ──────────────────────
    {
        "key": "news-monthly", "sort": 950, "track": None, "step": 1, "wait_days": 0,
        "stages": ["tried", "quiet", "active"], "audiences": EDU, "min_days_joined": 14, "min_days_quiet": 0,
        "name": "Monthly product news (edit first)",
        "subject": "What's new on TestoZa this month",
        "preheader": "Three things we built from your feedback.",
        "why": "A short monthly note for people who have used TestoZa. EDIT IT BEFORE EVERY SEND, then "
               "save it as a new email (Duplicate) so each month's news is sent once to each person.",
        "body": f"""Hi {{first_name|there}},

Here's what's new on TestoZa this month:

- **Feature one.** One line on what it does for a teacher.
- **Feature two.** One line.
- **Feature three.** One line.

[[See what's new]]({{app}}/dashboard)

Thank you for the feedback that shaped these. Keep it coming: just reply.

{SIGN}""",
    },
]

BY_KEY: Dict[str, Dict[str, Any]] = {t["key"]: t for t in LIBRARY}

# Fields copied into public.email_templates.
FIELDS = (
    "key", "name", "track", "step", "wait_days", "stages", "audiences", "min_days_joined", "min_days_quiet",
    "subject", "preheader", "body", "why", "sort",
)


def as_row(t: Dict[str, Any]) -> Dict[str, Any]:
    return {**{f: t.get(f) for f in FIELDS}, "is_builtin": True}
