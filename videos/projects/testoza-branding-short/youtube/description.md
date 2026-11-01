# YouTube upload pack — TestoZa Short: Branding Tests (logo + institute name)

## Files

| What | File | Notes |
|---|---|---|
| Short (English voice) | `videos/exports/testoza-branding-short-english-v1.mp4` | 0:48, 1080×1920 (9:16), 30 fps, AAC 320 kbps, −14 LUFS |
| Thumbnail (English) | `youtube/thumbnail-en.png` (or `.jpg`, smaller) | 1080×1920 for the Short; `youtube/thumbnail-en-wide.png` 1280×720 if a 16:9 one is asked for. Source `youtube/thumbnail-src/` (`node youtube/thumbnail-src/shot.mjs`) |
| Hindi audio track | `videos/exports/testoza-branding-short-hindi-audio-v1.wav` | 48 kHz stereo 16-bit WAV, same length as the video, −14 LUFS |
| Tamil audio track | `videos/exports/testoza-branding-short-tamil-audio-v1.wav` | 〃 |
| Telugu audio track | `videos/exports/testoza-branding-short-telugu-audio-v1.wav` | 〃 |
| Kannada audio track | `videos/exports/testoza-branding-short-kannada-audio-v1.wav` | 〃 |
| Malayalam audio track | `videos/exports/testoza-branding-short-malayalam-audio-v1.wav` | 〃 |
| Subtitles | `youtube/captions-en.srt`, `youtube/{hi,ta,te,kn,ml}/captions-<lang>.srt` | Upload each "With timing". Nothing is burned into the picture. |

The picture has no words on it (only the app's own screens, the TestoZa logo and testoza.com), so
the same video works under every audio track. The institute shown ("Apex Academy", its logo) is
made up for this video.

## Title (recommended, 62 characters)

Put Your Institute's Logo on Every Online Test | TestoZa #shorts

Alternatives:
1. Add Your Coaching Logo & Name to Online Exams in Under a Minute #shorts
2. Branded Online Tests for Your Institute — Laptop & Phone #shorts

## Description (paste as is)

Your institute's logo and name on every online test — on laptops and phones. Step by step: open your test, tap Institution branding, add your logo, type your institute's name, pick a colour and a font, add your questions, save and go live. Students join with the link or a 6-digit code and see your brand at the top of every question.

Try it at https://testoza.com

#shorts #OnlineExam #TestoZa #CoachingInstitute #TeachersOfIndia

## Tags (paste as is)

institute branding online test, add logo to online test, online exam with institute logo, white label online test, coaching institute online exam, online test maker for coaching, branded online exam, custom logo quiz, online test for schools, online exam on mobile, join code online exam, online test maker India, TestoZa, shorts

## Studio settings

Details
- Upload as a Short (vertical, under 3 minutes: it is detected automatically).
- Thumbnail: Shorts thumbnails are picked in the YouTube app (Edit → Thumbnail → upload `youtube/thumbnail-en.jpg`, or choose a frame; the hook frame at 0:02 shows the laptop + phone with the logo).
- Audience: No, it's not made for kids.
- Show more → Video language: English. Category: Education.
- Show more → Altered or synthetic content: **No** is fine — the narrator is an AI voice (Gemini text-to-speech) over real screen recordings; it does not depict a real person or event. Choose Yes only if you want to disclose the AI voice anyway.
- Related video: the Top 10 Features video.
- Comments: on.

Languages (left menu → Languages)
1. Set the original language to English.
2. Add language → **Hindi**:
   - Audio → Add → upload `testoza-branding-short-hindi-audio-v1.wav` → Publish.
   - Subtitles → Add → Upload file → With timing → `youtube/hi/captions-hi.srt` → Publish.
   - Title & description → Add → paste the Hindi title and description below → Publish.
3. Repeat for **Tamil** (ta), **Telugu** (te), **Kannada** (kn), **Malayalam** (ml) with their WAV, SRT, title and description.
4. English subtitles: Add language → English → Subtitles → Upload file → With timing → `youtube/captions-en.srt`.
5. If the channel shows no "Audio" option for this Short (multi-language audio is rolling out by channel and format), upload each language as its own Short instead: mux the WAV onto the picture with
   `ffmpeg -i testoza-branding-short-english-v1.mp4 -i testoza-branding-short-hindi-audio-v1.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k testoza-branding-short-hindi-v1.mp4`
   and use the translated title/description below.

Pinned comment
Want your own logo on your tests? Try it at testoza.com 👇 (Hindi, Tamil, Telugu, Kannada and Malayalam audio: ⋮ → Audio track)

---

## हिंदी (Hindi)

**Title:** हर Online Test पर आपके Institute का Logo और नाम | TestoZa #shorts

**Description:**
हर online test पर आपके institute का logo और नाम — laptop पर भी, phone पर भी। Step by step: test खोलिए, Institution branding पर tap कीजिए, अपना logo डालिए, institute का नाम लिखिए, colour और font चुनिए, questions जोड़िए, save कीजिए और exam live कीजिए। Students link या 6 अंकों के code से join करते हैं और हर question के ऊपर आपका brand देखते हैं।

Try कीजिए: https://testoza.com

#shorts #OnlineExam #TestoZa

## தமிழ் (Tamil)

**Title:** ஒவ்வொரு Online Test-லயும் உங்க Institute Logo & பேர் | TestoZa #shorts

**Description:**
ஒவ்வொரு online test-லயும் உங்க institute-ஓட logo-வும் பேரும் — laptop-லயும், phone-லயும். Step by step: test-ஐ open பண்ணுங்க, Institution branding-ஐ tap பண்ணுங்க, logo போடுங்க, institute பேரை type பண்ணுங்க, colour, font தேர்ந்தெடுங்க, questions சேருங்க, save பண்ணி exam-ஐ live ஆக்குங்க. Students link அல்லது 6 இலக்க code மூலம் join பண்ணி, ஒவ்வொரு question மேலயும் உங்க brand-ஐ பார்ப்பாங்க.

Try பண்ணுங்க: https://testoza.com

#shorts #OnlineExam #TestoZa

## తెలుగు (Telugu)

**Title:** ప్రతి Online Test మీద మీ Institute Logo & పేరు | TestoZa #shorts

**Description:**
ప్రతి online test మీద మీ institute logo, పేరు — laptop లోనూ, phone లోనూ. Step by step: test open చేయండి, Institution branding tap చేయండి, logo వేయండి, institute పేరు type చేయండి, colour, font ఎంచుకోండి, questions add చేసి save చేయండి, exam live చేయండి. Students link లేదా 6 అంకెల code తో join అయి, ప్రతి question పైన మీ brand చూస్తారు.

Try చేయండి: https://testoza.com

#shorts #OnlineExam #TestoZa

## ಕನ್ನಡ (Kannada)

**Title:** ಪ್ರತಿ Online Test ಮೇಲೆ ನಿಮ್ಮ Institute Logo & ಹೆಸರು | TestoZa #shorts

**Description:**
ಪ್ರತಿ online test ಮೇಲೆ ನಿಮ್ಮ institute ನ logo ಮತ್ತು ಹೆಸರು — laptop ನಲ್ಲೂ, phone ನಲ್ಲೂ. Step by step: test open ಮಾಡಿ, Institution branding tap ಮಾಡಿ, logo ಹಾಕಿ, institute ಹೆಸರು type ಮಾಡಿ, colour ಮತ್ತು font ಆರಿಸಿ, questions add ಮಾಡಿ save ಮಾಡಿ, exam live ಮಾಡಿ. Students link ಅಥವಾ 6 ಅಂಕಿಯ code ಮೂಲಕ join ಆಗಿ, ಪ್ರತಿ question ಮೇಲೆ ನಿಮ್ಮ brand ನೋಡ್ತಾರೆ.

Try ಮಾಡಿ: https://testoza.com

#shorts #OnlineExam #TestoZa

## മലയാളം (Malayalam)

**Title:** ഓരോ Online Test-ലും നിങ്ങളുടെ Institute Logo & പേര് | TestoZa #shorts

**Description:**
ഓരോ online test-ലും നിങ്ങളുടെ institute-ന്റെ logo-യും പേരും — laptop-ലും phone-ലും. Step by step: test open ചെയ്യൂ, Institution branding tap ചെയ്യൂ, logo ഇടൂ, institute-ന്റെ പേര് type ചെയ്യൂ, colour, font തിരഞ്ഞെടുക്കൂ, questions ചേർത്ത് save ചെയ്യൂ, exam live ആക്കൂ. Students link അല്ലെങ്കിൽ 6 അക്ക code വഴി join ചെയ്ത്, ഓരോ question-ന്റെയും മുകളിൽ നിങ്ങളുടെ brand കാണും.

Try ചെയ്യൂ: https://testoza.com

#shorts #OnlineExam #TestoZa
