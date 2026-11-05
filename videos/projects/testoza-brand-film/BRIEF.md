---
workflow: general-video
flow: automation
storyboard: no
message: "One day your students will face the real exam on a screen. Make sure it isn't their first time: TestoZa turns your paper tests into secure online mocks, on phones or in your computer lab, with results the moment they submit."
destination: youtube, tv, social
aspect: 1920x1080
language: en
audience: Indian coaching educators, government-exam institutes and faculty (SSC, banking, railways, police, state exams) still running paper and OMR mock tests
length: ~90 s
angle: brand film "First Time" (Apple-style TV commercial)
---

## Owner's brief (2026-10-31)

- Professional, production-grade TV ad campaign film, "like an Apple ad made with a great production house".
  Nothing compromised.
- Show the problems first, then the platform. Trustworthy.
- Coaching-institute students giving tests online: on phones with rough sheets, and in a computer lab;
  best classroom views, professionally seated. Fresh images made with Google's best image model.
- Soft female voice, like a product promotion; smooth, never breaking before the stops; ElevenLabs.
- Brand music of its own at the end, like Paytm's or Airtel's signature.
- Purpose: inspire Indian teachers, coaching educators and government-exam institutes to shift from
  pen and paper to secure online mock tests.
- Owner went to sleep mid-build: "choose for the best". No stops.

## Standing rules

- Never say "free" anywhere (videos live on; charges are coming).
- Real UI only for the product; every claim traceable to TestoZa's own copy.
- Google key: env only (GK), never written to disk. ElevenLabs key: videos/.env.

## Assets

- Stills: gen/img (Gemini 3 Pro Image, 2752x1536), prompts in gen/shots.mjs.
- Footage: gen/veo (Veo 3.1, 1080p, 24 fps, no audio), motion prompts in gen/veo.mjs.
- Voice: gen/vo/take-s11 (Mira, eleven_v3, one continuous take). Script: SCRIPT-en.md.
- Score: gen/music/score-a (Eleven Music v2.5 composition plan, ends on the sonic logo).
- Sonic logo: gen/music/logo-inst-b (song 5fmV7ADAkkXXQ1MGtLFw).
- Product UI: real recordings from testoza-top-10-features, testoza-live-exam, testoza-results-analysis.
