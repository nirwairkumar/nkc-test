# 02 · The plan to 31 December

**54 days. One person. Online only: no visits, no calls.**

## The one rule

Every task until 31 December must feed **Engine 1**, **Engine 2** or the **Money line**. If it doesn't, it waits until January, however good the idea is.

---

## Engine 1 · Every exam brings the next educator

TestoZa's real growth loop: an educator runs an exam → 20 to 300 candidates use TestoZa → some of them teach too, and the educator runs another exam. Right now the loop leaks at three points: 55% of educators never send their test, half don't run a second exam, and 0 candidates ever become educators.

| # | What | Why | Who |
|---|---|---|---|
| 1.1 | **Wake up the 77 educators who built a test but never got a candidate.** Automatic emails on day 1, 3 and 7 after a test is saved and not sent: "Your test is ready. Free until 31 December. Send it in 2 minutes." | Cheapest growth there is. They already did the hard part | Claude builds (automatic emails already exist) |
| 1.2 | **"Run it again" after every exam.** When an educator stops an exam, offer "Copy this test for next week" and "Schedule it" | Turns one exam into a weekly habit. Half come back today without being asked | Claude builds |
| 1.3 | **An invite card on candidates' result page** (never on the exam screen): "Do you teach or coach? Make a test like this. Free until 31 December." | 80% of your visitors are candidates. Some are tuition teachers, B.Ed. trainees, future TRE teachers | Claude builds |
| 1.4 | **Referral reward that costs nothing today:** "Invite an educator. When they run an exam with 10+ candidates, you both get 1 month free in 2027 (up to 12)." | The referral page has been live since 27 Oct with 0 uses. A reward gives a reason | Claude builds the reward; you decide the wording |
| 1.5 | **Weekly "your class this week" email** to educators who ran an exam: who wrote, average score, weakest question, "set next week's test" | Brings them back on Monday morning | Claude builds |

## Engine 2 · Be the answer when an educator asks an AI

ChatGPT is your best educator channel (44 of 126 educators, and growing every week). Gemini, Perplexity, Copilot and Claude send nothing yet. On 7 November all of them could read your site for the first time (checked: every AI crawler gets through).

| # | What | Time |
|---|---|---|
| 2.1 | **Bing Webmaster Tools**: add testoza.com and app.testoza.com, submit the sitemap. ChatGPT search and Copilot use Bing's index | 15 min, once |
| 2.2 | **Put the offer where educators land.** The homepage badge still says "The Educator's Choice" and /quiz-creator says "Free to start". Both should say "Every feature free until 31 December 2026" and link to /pricing. These two pages made 65 of your 126 educators | Claude, 30 min |
| 2.3 | **Listings on sites AI assistants read** (self-serve forms, no calls). Two a day: G2, Capterra (one free listing also covers GetApp and Software Advice), AlternativeTo (as an alternative to Google Forms, ClassMarker, Testmoz, Kahoot), SaaSHub, SourceForge, Futurepedia, There's An AI For That, Toolify, Crunchbase, Product Hunt (launch one Tuesday in late November). Same short description everywhere | 20 min a day |
| 2.4 | **Public answers, optional.** Where educators ask "how do I conduct an online test with negative marking" (Quora, Reddit, Facebook groups), write a genuinely useful answer and link only when it fits. You aren't contacting anyone; you're answering in public | 2 a day if you like it |
| 2.5 | **Check the AI answers once a month** with the 20 prompts in file 04 | 1 hour a month |

## Money line · Founding 2027

Full design in file 03. The dates:

- [ ] **By 15 Nov:** decide the founding price.
- [ ] **By 17 Nov:** Claude adds the plan and a card on /pricing. **Test a real ₹1 payment end to end** before announcing (Razorpay must be in live mode).
- [ ] **By 1 Dec:** publish 2027 prices on /pricing and email every educator. **The new pricing page promises 30 days' notice, so this date is fixed.**
- [ ] **24 to 31 Dec:** "Founding price ends on 31 December" banner and one last email.

---

## This week (9 to 15 November): make the infrastructure safe · about 45 minutes · about ₹3,000 a month

| # | Do this | Why |
|---|---|---|
| 1 | **Google Cloud → Billing.** If you see "Free trial", click Activate/Upgrade to a full (pay-as-you-go) account. Then Budgets & alerts: ₹10,000 a month, emails at 50%, 90%, 100% | When free-trial credit runs out, Google pauses the project. Your backend would stop, possibly during an exam. Credit was about ₹4,760 on 3 Nov |
| 2 | **Cloudflare → Workers & Pages → Plans → Workers Paid ($5 a month)** | The free plan stops at 100,000 requests a day. One 350-candidate exam used about 25,000 in an hour. Past the limit, every exam call fails until midnight UTC |
| 3 | **Supabase → Billing → Pro ($25 a month)** | Free has no automatic backups. One bad day without backups ends the company |
| 4 | **Apply for Google for Startups Cloud credits** (cloud.google.com/startup) and look for partner perks through Nirmaan, your incubator | AI import is about 92% of your cloud bill. Credits are runway |

Check each one off only when you've seen the confirmation screen.

## Week by week

| Week | Focus | Ship | Watch |
|---|---|---|---|
| **9 to 15 Nov** | Set up | Infra payments. Push the new /pricing page. Offer line on homepage and /quiz-creator (2.2). Bing Webmaster (2.1). Decide founding price | Fill the scoreboard baseline |
| **16 to 22 Nov** | Wake up | Emails to dormant educators (1.1). Invite card on result pages (1.3). Founding offer live. 10 listings | Educators with their first candidates |
| **23 to 29 Nov** | Second exam | "Run it again" (1.2). Referral reward (1.4). 10 listings. Product Hunt launch | Returning conductors |
| **30 Nov to 6 Dec** | Announce 2027 | 2027 prices on /pricing + email to every educator. Weekly class email (1.5) | Founding customers |
| **7 to 13 Dec** | Exam season | Pre-boards and JEE Main mocks: write 3 short, specific answers to what educators ask AI ("conduct a JEE Main mock online with negative marking") and put them where 2.3/2.4 reach | Answer sheets |
| **14 to 20 Dec** | Exam season | Same. Run the 20 AI prompts | Answer sheets |
| **21 to 27 Dec** | Last call | Founding banner with days left. One last email | Payments |
| **28 to 31 Dec** | Close | Fill the 31 December checkpoint (file 04). Decide January with numbers, not feelings | |

## A normal day

| Time | What |
|---|---|
| 09:00 to 09:20 | Look at yesterday's numbers in admin. Write three of them in a notebook |
| 09:20 to 12:00 | Build only this week's item |
| 12:00 to 13:00 | Help inbox and feedback. Answer every educator the same day |
| 14:00 to 15:00 | Engine 2: two listings, optional public answers |
| 15:00 to 18:00 | Build or fix |
| 18:00 to 18:15 | Write tomorrow's three tasks. Close the laptop |

Sunday: 30 minutes on the scoreboard (run `python TestoZa/Growth-Reset-Nov2026/scripts/weekly_numbers.py`). Nothing new starts on Monday until it's filled.

## The stop list (until 31 December)

- **LinkedIn daily posting.** 1 visit in 30 days. Keep the page. Post once a week only when you have real news ("312 answer sheets this week from 6 countries").
- **New long YouTube videos, dubs and brand films.** Keep the 15 you have; they work as help on your guide pages. If you make anything, make a 30-second Short from a real screen (the DPP Short got 442 views; long tutorials got 5 to 12).
- **New SEO guides.** You have 40+. Google is slow and they made about 10 educators. That time goes to listings and the two pages that work.
- **The 100-page SEO plan and the 90-video plan** you were following: pause both. They're 2027 plans, for after the engines work.
- **Free tools** (MCQ generator, OMR checker and so on): 2027.
- **Panna PDF tools.**
- **Any new feature** that doesn't feed an engine or the money line.

## Before a big exam (1,000+ candidates at the same moment)

Ask Claude to check the infrastructure the day before, and keep the admin "exam ops" page open during the exam. A crash in front of a big institute costs more than any feature earns.

## If a good intern joins from your form

Give them one job, not three: **within 24 hours of every new educator sign-up, send a short, friendly message: "Your test is ready. When does your class write it? I can help you send it in 2 minutes."** Your own October report found the stall is "the exam is next week", and a nudge at the right moment fixes that. You don't have to be the one who sends it.

## Money for runway (online applications)

Check each on its official page; terms change.

- **Google for Startups Cloud Program** (cloud.google.com/startup): Google Cloud credits in tiers.
- **Nirmaan, IIT Madras** (your footer address): pre-incubation support and partner perks.
- **Startup India Seed Fund Scheme** (seedfund.startupindia.gov.in): grants through approved incubators. DPIIT recognition first (online).

## January, decided by the scoreboard

- **Base targets hit:** switch on 2027 plans, keep the free plan, keep both engines, add one person for outreach.
- **One engine moved, one didn't:** double the one that moved.
- **Nothing moved:** look at the scoreboard with someone you trust before deciding anything. Not alone at night.
