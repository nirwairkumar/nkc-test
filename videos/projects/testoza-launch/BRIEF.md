---
workflow: product-launch-video
flow: automation
storyboard: no
message: "From a question paper to a proctored exam with results, in minutes, on TestoZa"
destination: youtube
aspect: 1920x1080
language: en
audience: coaching institute owners and teachers in India
length: 60s
angle: product-walkthrough
---

## Intent

A product launch film for TestoZa (https://testoza.com) with Apple keynote energy, directed
like a Marvel set piece: big type, confident cuts, one continuous product world. The user's
words: "you are the best hollywood director, having 20 years of experience to direct the
marvel movies." Length is flexible ("may be 1 minute, less or more").

The film walks the creator's exact journey, in this order:

landing page → generate-with-ai → step 2: upload a paper and choose Extract → step 3: questions
are extracted and visibly appear → step 4: preview → edit → add one more question → save →
my tests → conduct the test → it shows in live exams → settings: switch on proctoring features →
save settings → share link → a classroom of seated students; one student receives the test link
on WhatsApp → opens it → starts the exam → (another student) submits → the result arrives as a
notification on the live exam's result button → the creator opens it → TestoZa logo.

## Customizations

- Product UI is rebuilt as HTML from the real frontend source (frontend/src): same layout,
  Tailwind classes, copy and colors. No invented screens.
- Classroom and WhatsApp beats are staged scenes; the WhatsApp chat is rebuilt faithfully.

## Notes

- The user offered the demo teacher login; we do not sign in (credentials are never typed by the
  agent). Screens come from the source code instead.
- Teacher persona from demo data: Prof. Rajesh Kumar.
- Say "candidates" for test takers in product copy (project convention).
