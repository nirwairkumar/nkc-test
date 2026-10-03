/**
 * The example paper and the typing tables that run through
 * testoza.com/hindi-online-test-maker: the hero, the typing demo, the AI language
 * demo, the exam screen and the crawler text all read these, so they agree
 * everywhere. Dependency-free (the Cloudflare worker imports the guide text).
 *
 * Every Roman → Hindi pair below was checked against Google Input Tools (the
 * transliteration service TestoZa's Hindi typing calls, components/ui/IMEInput.tsx,
 * itc=hi-t-i0-und, 5 suggestions) on 3 October 2026. The service can change its
 * suggestions over time; the guide says "at the time of writing".
 */

/** The paper the exam-screen demo and the hero use. */
export const PAPER = {
    title: 'सामान्य विज्ञान टेस्ट 4: प्रकाश',
    titleEn: 'General Science Test 4: Light',
    questions: 25,
    minutes: 15,
    right: 2,
    wrong: 0.5,
} as const;

export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface BilingualQuestion {
    hi: { text: string; options: Record<OptionKey, string> };
    en: { text: string; options: Record<OptionKey, string> };
    answer: OptionKey;
}

/**
 * Six questions from the paper, in Hindi and English. Terms follow the NCERT
 * Class 10 Hindi-medium science book (प्रकाश – परावर्तन तथा अपवर्तन).
 */
export const QUESTIONS: BilingualQuestion[] = [
    {
        hi: {
            text: 'निर्वात में प्रकाश की चाल कितनी होती है?',
            options: { A: '3 × 10⁸ मीटर/सेकंड', B: '3 × 10⁶ मीटर/सेकंड', C: '3 × 10⁵ मीटर/सेकंड', D: '3 × 10¹⁰ मीटर/सेकंड' },
        },
        en: {
            text: 'What is the speed of light in a vacuum?',
            options: { A: '3 × 10⁸ m/s', B: '3 × 10⁶ m/s', C: '3 × 10⁵ m/s', D: '3 × 10¹⁰ m/s' },
        },
        answer: 'A',
    },
    {
        hi: {
            text: 'किसी गोलीय दर्पण की वक्रता त्रिज्या 20 सेमी है। इसकी फोकस दूरी कितनी है?',
            options: { A: '40 सेमी', B: '20 सेमी', C: '10 सेमी', D: '5 सेमी' },
        },
        en: {
            text: 'A spherical mirror has a radius of curvature of 20 cm. What is its focal length?',
            options: { A: '40 cm', B: '20 cm', C: '10 cm', D: '5 cm' },
        },
        answer: 'C',
    },
    {
        hi: {
            text: 'कौन-सा दर्पण सदैव सीधा, आभासी और छोटा प्रतिबिंब बनाता है?',
            options: { A: 'समतल दर्पण', B: 'अवतल दर्पण', C: 'उत्तल दर्पण', D: 'इनमें से कोई नहीं' },
        },
        en: {
            text: 'Which mirror always forms an erect, virtual and diminished image?',
            options: { A: 'Plane mirror', B: 'Concave mirror', C: 'Convex mirror', D: 'None of these' },
        },
        answer: 'C',
    },
    {
        hi: {
            text: 'लेंस की क्षमता का SI मात्रक क्या है?',
            options: { A: 'डाइऑप्टर', B: 'मीटर', C: 'वाट', D: 'जूल' },
        },
        en: {
            text: 'What is the SI unit of the power of a lens?',
            options: { A: 'Dioptre', B: 'Metre', C: 'Watt', D: 'Joule' },
        },
        answer: 'A',
    },
    {
        hi: {
            text: 'निम्नलिखित में से कौन-सा कथन सत्य है?',
            options: {
                A: 'अवतल लेंस सदैव वास्तविक प्रतिबिंब बनाता है।',
                B: 'उत्तल लेंस प्रकाश की किरणों को अभिसरित करता है।',
                C: 'समतल दर्पण की फोकस दूरी शून्य होती है।',
                D: 'प्रकाश सदैव वक्र रेखा में चलता है।',
            },
        },
        en: {
            text: 'Which of the following statements is true?',
            options: {
                A: 'A concave lens always forms a real image.',
                B: 'A convex lens converges rays of light.',
                C: 'The focal length of a plane mirror is zero.',
                D: 'Light always travels in a curved line.',
            },
        },
        answer: 'B',
    },
    {
        hi: {
            text: 'प्रकाश का अपवर्तन क्यों होता है?',
            options: {
                A: 'एक माध्यम से दूसरे माध्यम में जाने पर प्रकाश की चाल बदल जाती है',
                B: 'प्रकाश परावर्तित हो जाता है',
                C: 'प्रकाश का रंग बदल जाता है',
                D: 'माध्यम का ताप बढ़ जाता है',
            },
        },
        en: {
            text: 'Why does light refract?',
            options: {
                A: 'Its speed changes when it passes from one medium to another',
                B: 'It is reflected',
                C: 'Its colour changes',
                D: 'The medium gets hotter',
            },
        },
        answer: 'A',
    },
];

/** A bilingual field exactly as the AI writes it: the first language, a line break, the second. */
export const bilingual = (first: string, second: string) => `${first}\n${second}`;

/** The question stem the typing demo and the hero type, word by word. */
export const STEM_ROMAN = ['nimnalikhit', 'mein', 'se', 'kaun', 'sa', 'kathan', 'satya', 'hai'] as const;
export const STEM_HINDI = ['निम्नलिखित', 'में', 'से', 'कौन', 'सा', 'कथन', 'सत्य', 'है'] as const;

/** The hero's question: "nirvat mein prakash ki chaal kitni hoti hai" (Q1). */
export const HERO_ROMAN = ['nirvat', 'mein', 'prakash', 'ki', 'chaal', 'kitni', 'hoti', 'hai'] as const;
export const HERO_HINDI = ['निर्वात', 'में', 'प्रकाश', 'की', 'चाल', 'कितनी', 'होती', 'है'] as const;

/** Spellings that give the right word first time (checked against the service). */
export const SPELLINGS: { roman: string; hindi: string; note: string }[] = [
    { roman: 'prashn', hindi: 'प्रश्न', note: 'Half letters join on their own' },
    { roman: 'uttar', hindi: 'उत्तर', note: 'Double the letter for त्त' },
    { roman: 'gyan', hindi: 'ज्ञान', note: 'gy gives ज्ञ' },
    { roman: 'kshetra', hindi: 'क्षेत्र', note: 'ksh gives क्ष' },
    { roman: 'krishi', hindi: 'कृषि', note: 'ri after a consonant gives ृ' },
    { roman: 'rishi', hindi: 'ऋषि', note: 'ri at the start gives ऋ' },
    { roman: 'shri', hindi: 'श्री', note: 'shr gives श्र' },
    { roman: 'nimnalikhit', hindi: 'निम्नलिखित', note: 'Long words work in one go' },
    { roman: 'nahi', hindi: 'नहीं', note: 'The nasal sign comes by itself' },
    { roman: 'pariksha', hindi: 'परीक्षा', note: 'The long ी is guessed for you' },
    { roman: 'rashtrapati', hindi: 'राष्ट्रपति', note: 'ष्ट्र in one go' },
    { roman: 'gurutvakarshan', hindi: 'गुरुत्वाकर्षण', note: 'Science terms work too' },
];

/**
 * Words whose first suggestion isn't the one a teacher usually means. Spelling the
 * long vowel out (aa, oo, ee) or picking from the suggestion bar fixes them.
 */
export const FIRST_GUESSES: { typed: string; got: string; meant: string; fix: string }[] = [
    { typed: 'kam', got: 'काम', meant: 'कम', fix: '2nd in the bar' },
    { typed: 'grah', got: 'गृह', meant: 'ग्रह', fix: 'Type graha' },
    { typed: 'vigyan', got: 'विज्ञानं', meant: 'विज्ञान', fix: 'Type vigyaan' },
    { typed: 'karan', got: 'कारन', meant: 'कारण', fix: 'Type kaaran' },
    { typed: 'shunya', got: 'शुन्य', meant: 'शून्य', fix: 'Type shoonya' },
    { typed: 'duri', got: 'दुरी', meant: 'दूरी', fix: 'Type doori' },
    { typed: 'gaon', got: 'गाओं', meant: 'गाँव', fix: 'Type gaanv' },
    { typed: 'dhara', got: 'धरा', meant: 'धारा', fix: '2nd in the bar' },
];

/** The Unicode check's examples. Kruti Dev 010 / DevLys key codes for the same Hindi. */
export const LEGACY_SAMPLES = [
    { label: 'Unicode Hindi', text: 'भारत की राजधानी' },
    { label: 'Kruti Dev text', text: 'Hkkjr dh jkt/kkuh' },
    { label: 'Another Kruti Dev line', text: 'lkekU; Kku' },
] as const;

/** Bilingual exams Hindi-medium students sit (published patterns, see the guide's sources). */
export const EXAM_LANGUAGES = [
    { exam: 'NEET-UG', language: 'Hindi-medium candidates get one booklet with every question in Hindi and English; the English version is final', pattern: '180 questions, 180 min, +4 / −1' },
    { exam: 'SSC CGL Tier 1', language: 'Hindi and English, except the English Comprehension section', pattern: '100 questions, 60 min, +2 / −0.5' },
    { exam: 'RRB NTPC CBT 1', language: '15 languages, Hindi among them', pattern: '100 questions, 90 min, −1/3 per wrong answer' },
    { exam: 'CTET', language: 'Hindi and English', pattern: '150 questions, 150 min, no negative marking' },
] as const;
