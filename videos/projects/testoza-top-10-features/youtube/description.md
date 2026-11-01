# YouTube upload pack — TestoZa: Top 10 Features

## Files

| What | File | Notes |
|---|---|---|
| Video (English voice) | `videos/exports/testoza-top10-features-en-v1.mp4` | 4:45, 1920×1080, 30 fps, AAC 320 kbps, −14 LUFS |
| Thumbnail (English) | `youtube/thumbnail-en.png` (or `.jpg`, smaller) | 1280×720; source `youtube/thumbnail-src/` (`node youtube/thumbnail-src/shot.mjs`) |
| Hindi audio track | `videos/exports/testoza-top10-features-hindi-audio-v1.wav` | 48 kHz stereo WAV, same length as the video, −14 LUFS |
| Tamil audio track | `videos/exports/testoza-top10-features-tamil-audio-v1.wav` | 〃 |
| Telugu audio track | `videos/exports/testoza-top10-features-telugu-audio-v1.wav` | 〃 |
| Kannada audio track | `videos/exports/testoza-top10-features-kannada-audio-v1.wav` | 〃 |
| Malayalam audio track | `videos/exports/testoza-top10-features-malayalam-audio-v1.wav` | 〃 |
| Subtitles | `youtube/captions-en.srt`, `youtube/{hi,ta,te,kn,ml}/captions-<lang>.srt` | Upload each "With timing". Nothing is burned into the picture. |
| Chapters | in the description below (also `youtube/chapters.txt`) | |

The picture has no words on it (only the app's own screens, the numbers 01–10, the logo and
testoza.com), so the same video works under every audio track.

## Title (recommended, 91 characters)

Top 10 TestoZa Features for Teachers | AI Test Maker, Anti-Cheating Exams & Instant Results

Alternatives:
1. 10 Features That Make Online Exams Easy for Teachers — PDF to Test, Join Code, Live Results | TestoZa
2. TestoZa Top 10 Features: Turn Any Question Paper Into a Cheat-Proof Online Exam

## Description (paste as is)

Turn a question paper into an online test, run it as a cheat-proof exam on any phone, and get ranked results the moment students submit. Here are the 10 TestoZa features teachers and coaching institutes use every week — each one shown for real, with exactly how to use it.

Watch in हिंदी, தமிழ், తెలుగు, ಕನ್ನಡ or മലയാളം: ⚙ Settings → Audio track

The 10 features
1. Generate with AI — upload a PDF or photos of your paper; questions, options and the answer key are read for you
2. Maths & science equations with Sy Pad — fractions, powers and formulas, no code to learn
3. Type in Hindi or any of 119 languages — type in English letters, each word converts as you press space
4. Real exam patterns — +4/−1 marking, JEE Advanced partial marks, sections with their own timers
5. Go live in one click — an anti-cheating exam room: full screen, tab-switch detection, auto-submit after 3 warnings, copy-paste and right-click blocked, shuffled questions
6. Share anywhere — copy the link, share to your class WhatsApp group, or give a 6-digit join code at testoza.com/join
7. Collect candidate details — name, roll number, batch, school… before they start
8. An exam room on any phone — no app, no sign-up
9. Watch the exam live — who has started, who is writing, who has submitted, who dropped
10. Instant results — the student's score and solution key, ranks for the whole batch, Excel download in one click

Chapters
0:00 Intro
0:19 1. Generate a test with AI
0:53 2. Maths & science equations (Sy Pad)
1:23 3. Type in Hindi & 119 languages
1:43 4. Exam patterns: marking & timed sections
2:12 5. Go live in one click + anti-cheating
2:50 6. Share by link, WhatsApp or join code
3:07 7. Collect candidate details
3:19 8. Exam on any phone — no app, no sign-up
3:50 9. Watch the exam live
4:07 10. Instant results, ranks & Excel
4:26 That's all ten

Try it at https://testoza.com

#OnlineExam #TeachersOfIndia #TestoZa

## Tags (paste as is)

online exam platform, online test maker, AI test generator, PDF to online test, question paper to online test, conduct online exam, anti cheating online exam, online exam with join code, mobile online exam, online test for coaching institute, NEET mock test maker, JEE mock test software, SSC mock test, JEE Advanced partial marking, maths equation in online test, Hindi online test maker, online exam results Excel, TestoZa

## Studio settings

Details
- Thumbnail: upload `youtube/thumbnail-en.png`.
- Playlist: TestoZa tutorials (with the live-exam and chemistry videos).
- Audience: No, it's not made for kids.
- Show more → Video language: English. Caption certification: none of these apply. Category: Education.
- Show more → Altered or synthetic content: **No** is fine — the narrator is an AI voice (Gemini text-to-speech) over real screen recordings; it does not depict a real person or event. Choose Yes only if you want to disclose the AI voice anyway.
- Comments: on, sort by Top.

Languages (left menu → Languages)
1. Upload the video first; set the original language to English.
2. Add language → **Hindi**:
   - Audio → Add → upload `testoza-top10-features-hindi-audio-v1.wav` → Publish.
   - Subtitles → Add → Upload file → With timing → `youtube/hi/captions-hi.srt` → Publish.
   - Title & description → Add → paste the Hindi title and description below → Publish.
3. Repeat for **Tamil** (ta), **Telugu** (te), **Kannada** (kn), **Malayalam** (ml) with their WAV, SRT, title and description.
4. English subtitles: Add language → English → Subtitles → Upload file → With timing → `youtube/captions-en.srt`.
5. If the channel has no "Audio" option under Languages yet (multi-language audio is rolling out by channel), upload each language as its own video instead: mux the WAV onto the picture with
   `ffmpeg -i testoza-top10-features-en-v1.mp4 -i testoza-top10-features-hindi-audio-v1.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k testoza-top10-features-hi-v1.mp4`
   and use the translated title/description below.

End screen (last 18 s, 4:27–4:45): Subscribe (left), Best for viewer video (right), the logo pill sits in the middle of the end card.
Cards: 0:53 → chemistry equations video; 2:12 → the live-exam tutorial.

Pinned comment
Which feature do you want a full tutorial on next? Tell us the number 👇 (Hindi, Tamil, Telugu, Kannada and Malayalam audio: ⚙ Settings → Audio track)

---

## हिंदी (Hindi)

**Title:** TestoZa के Top 10 Features — AI से Test बनाइए, Cheating-Proof Online Exam, तुरंत Result

**Description:**
Question paper से online test बनाइए, किसी भी फ़ोन पर cheating-proof exam लीजिए, और submit होते ही ranked results पाइए। ये हैं TestoZa के 10 features जो teachers और coaching institutes हर हफ़्ते इस्तेमाल करते हैं — हर एक असली स्क्रीन पर, इस्तेमाल करने के तरीके के साथ।

0:00 शुरुआत
0:19 1. AI से test बनाइए
0:53 2. Maths और science equations (Sy Pad)
1:23 3. हिंदी और 119 भाषाओं में टाइपिंग
1:43 4. Exam patterns: marking और timed sections
2:12 5. एक click में live + anti-cheating
2:50 6. Link, WhatsApp या join code से share
3:07 7. Candidate details
3:19 8. किसी भी फ़ोन पर exam — न app, न sign-up
3:50 9. Exam को live देखिए
4:07 10. तुरंत results, ranks और Excel
4:26 ये थे दस features

Try कीजिए: https://testoza.com

## தமிழ் (Tamil)

**Title:** TestoZa Top 10 Features — AI மூலம் Test, Cheating இல்லாத Online Exam, உடனே Result

**Description:**
Question paper-ஐ online test-ஆ மாத்துங்க, எந்த phone-லயும் cheating இல்லாத exam நடத்துங்க, submit பண்ணதுமே ranked results பாருங்க. Teachers, coaching institutes ஒவ்வொரு வாரமும் use பண்ற TestoZa-வோட 10 features — ஒவ்வொண்ணும் உண்மையான screen-ல, எப்படி use பண்றதுன்னு.

0:00 அறிமுகம்
0:19 1. AI மூலம் test
0:53 2. Maths, science equations (Sy Pad)
1:23 3. தமிழ், ஹிந்தி — 119 மொழிகளில் type
1:43 4. Exam patterns: marking, timed sections
2:12 5. ஒரே click-ல live + anti-cheating
2:50 6. Link, WhatsApp, join code மூலம் share
3:07 7. Candidate details
3:19 8. எந்த phone-லயும் exam — app வேண்டாம்
3:50 9. Exam-ஐ live-ஆ பாருங்க
4:07 10. உடனே results, ranks, Excel
4:26 பத்து features-உம் முடிஞ்சது

Try பண்ணுங்க: https://testoza.com

## తెలుగు (Telugu)

**Title:** TestoZa Top 10 Features — AI తో Test, Cheating లేని Online Exam, వెంటనే Result

**Description:**
Question paper ని online test గా మార్చండి, ఏ phone లోనైనా cheating లేని exam నిర్వహించండి, submit చేయగానే ranked results చూడండి. Teachers, coaching institutes ప్రతి వారం వాడే TestoZa 10 features — ప్రతిదీ నిజమైన screen మీద, ఎలా వాడాలో సహా.

0:00 పరిచయం
0:19 1. AI తో test
0:53 2. Maths, science equations (Sy Pad)
1:23 3. తెలుగు, హిందీ — 119 భాషల్లో type
1:43 4. Exam patterns: marking, timed sections
2:12 5. ఒక్క click లో live + anti-cheating
2:50 6. Link, WhatsApp, join code తో share
3:07 7. Candidate details
3:19 8. ఏ phone లోనైనా exam — app అక్కర్లేదు
3:50 9. Exam ని live గా చూడండి
4:07 10. వెంటనే results, ranks, Excel
4:26 పది features పూర్తి

Try చేయండి: https://testoza.com

## ಕನ್ನಡ (Kannada)

**Title:** TestoZa Top 10 Features — AI ಇಂದ Test, Cheating ಇಲ್ಲದ Online Exam, ತಕ್ಷಣ Result

**Description:**
Question paper ಅನ್ನು online test ಆಗಿ ಮಾಡಿ, ಯಾವ phone ನಲ್ಲಾದರೂ cheating ಇಲ್ಲದ exam ನಡೆಸಿ, submit ಆದ ತಕ್ಷಣ ranked results ನೋಡಿ. Teachers ಮತ್ತು coaching institutes ಪ್ರತಿ ವಾರ ಬಳಸುವ TestoZa ದ 10 features — ಪ್ರತಿಯೊಂದೂ ನಿಜವಾದ screen ನಲ್ಲಿ, ಹೇಗೆ ಬಳಸೋದು ಅಂತ.

0:00 ಪರಿಚಯ
0:19 1. AI ಇಂದ test
0:53 2. Maths, science equations (Sy Pad)
1:23 3. ಕನ್ನಡ, ಹಿಂದಿ — 119 ಭಾಷೆಗಳಲ್ಲಿ type
1:43 4. Exam patterns: marking, timed sections
2:12 5. ಒಂದೇ click ನಲ್ಲಿ live + anti-cheating
2:50 6. Link, WhatsApp, join code ಮೂಲಕ share
3:07 7. Candidate details
3:19 8. ಯಾವ phone ನಲ್ಲಾದರೂ exam — app ಬೇಡ
3:50 9. Exam ಅನ್ನು live ಆಗಿ ನೋಡಿ
4:07 10. ತಕ್ಷಣ results, ranks, Excel
4:26 ಹತ್ತು features ಮುಗಿದವು

Try ಮಾಡಿ: https://testoza.com

## മലയാളം (Malayalam)

**Title:** TestoZa Top 10 Features — AI കൊണ്ട് Test, Cheating ഇല്ലാത്ത Online Exam, ഉടൻ Result

**Description:**
Question paper online test ആക്കൂ, ഏത് phone-ലും cheating ഇല്ലാത്ത exam നടത്തൂ, submit ചെയ്ത ഉടൻ ranked results കാണൂ. Teachers-ഉം coaching institutes-ഉം എല്ലാ ആഴ്ചയും ഉപയോഗിക്കുന്ന TestoZa-യുടെ 10 features — ഓരോന്നും യഥാർത്ഥ screen-ൽ, എങ്ങനെ ഉപയോഗിക്കാമെന്ന് സഹിതം.

0:00 ആമുഖം
0:19 1. AI കൊണ്ട് test
0:53 2. Maths, science equations (Sy Pad)
1:23 3. മലയാളം, ഹിന്ദി — 119 ഭാഷകളിൽ type
1:43 4. Exam patterns: marking, timed sections
2:12 5. ഒറ്റ click-ൽ live + anti-cheating
2:50 6. Link, WhatsApp, join code വഴി share
3:07 7. Candidate details
3:19 8. ഏത് phone-ലും exam — app വേണ്ട
3:50 9. Exam live ആയി കാണൂ
4:07 10. ഉടൻ results, ranks, Excel
4:26 പത്ത് features-ഉം കഴിഞ്ഞു

Try ചെയ്യൂ: https://testoza.com
