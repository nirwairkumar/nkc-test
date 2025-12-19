
// @ts-ignore
import Sanscript from '@indic-transliteration/sanscript';

// Common Hinglish words map for instant high-quality results
const COMMON_WORDS: { [key: string]: string } = {
    // Pronouns & Helpers
    "main": "मैं", "mai": "मैं", "mei": "मैं", "me": "में", // Ambiguous me/mai
    "hu": "हूँ", "hoon": "हूँ", "hun": "हूँ",
    "tum": "तुम", "aap": "आप", "tu": "तू",
    "hum": "हम", "ham": "हम",
    "woh": "वह", "yeh": "यह", "ye": "ये", "ve": "वे",
    "mera": "मेरा", "meri": "मेरी", "mere": "मेरे",
    "ka": "का", "ki": "की", "ke": "के", "ko": "को",

    // Question words
    "kya": "क्या", "kyon": "क्यों", "kyun": "क्यों",
    "kab": "कब", "kahan": "कहाँ", "kaha": "कहाँ",
    "kidhar": "किधर", "kaise": "कैसे", "kaisa": "कैसा",
    "kaun": "कौन", "kon": "कौन",

    // Verbs (Common basic forms)
    "hai": "है", "hain": "हैं", "he": "है", "hen": "हैं",
    "tha": "था", "thi": "थी", "the": "थे",
    "hoga": "होगा", "hogi": "होगी",
    "kar": "कर", "karna": "करना", "karo": "करो",
    "ho": "हो", "raha": "रहा", "rahi": "रही", "rahe": "रहे",

    // Conjunctions/Misc
    "aur": "और", "or": "और",
    "lekin": "लेकिन", "par": "पर",
    "bhi": "भी", "hi": "ही",
    "se": "से", "ne": "ने",
    "nahi": "नहीं", "nahin": "नहीं", "ni": "नहीं",
    "haan": "हाँ", "han": "हाँ",
    "ji": "जी",

    // Common Nouns
    "hindi": "हिंदी",
    "bhasha": "भाषा",
    "bharat": "भारत",
    "desh": "देश",
    "namaste": "नमस्ते",
    "dhanyavad": "धन्यवाद",
    "log": "लोग",
    "ghar": "घर",
    "samay": "समय",
    "din": "दिन",
    "raat": "रात",
    "baat": "बात",
    "prem": "प्रेम",
    "pyaar": "प्यार",
    "pyar": "प्यार",
    "test": "टेस्ट",
    "save": "सेव",
    "question": "प्रश्न",
    "uttar": "उत्तर",
    "ans": "उत्तर", // Helper
    "option": "विकल्प"
};

const SCHEMES = ['itrans', 'hk']; // Reducing schemes to most relevant ones to reduce noise

// Generate variations of the input word for lenient parsing
const generateVariations = (word: string): string[] => {
    const variations = new Set<string>();
    variations.add(word);

    // Heuristic 1: Implicit 'a' handling for ending consonants
    // "bharat" -> "bharata" (to get full 'ta')
    if (!/[aeiou]$/i.test(word)) {
        variations.add(word + 'a');
    }

    // Heuristic 2: 'a' vs 'aa' (Most common issue)
    // "kam" -> "kaam", "nam" -> "naam"
    if (word.includes('a')) {
        variations.add(word.replace(/a/g, 'aa'));
    }

    // Heuristic 3: 'i' vs 'ee' / 'u' vs 'oo'
    if (word.endsWith('i')) {
        variations.add(word.slice(0, -1) + 'ee');
    }
    if (word.endsWith('u')) {
        variations.add(word.slice(0, -1) + 'oo');
    }

    // Heuristic 4: 'e' vs 'ai' (Common for "kaise", "mere" -> "merai"?? No, "kaise" is specific)
    // "kese" -> "kaise"
    if (word.includes('e')) {
        variations.add(word.replace(/e/g, 'ai'));
    }

    // Heuristic 5: 'o' vs 'au' (Common for "kon" -> "kaun")
    if (word.includes('o')) {
        variations.add(word.replace(/o/g, 'au'));
    }

    // Heuristic 6: 't' vs 'T', 'd' vs 'D' (Retroflex handling)
    // Capitalize first letter often triggers retroflex in ITRANS
    // "thik" -> "Thik"
    if (word.startsWith('t') || word.startsWith('d') || word.startsWith('n') || word.startsWith('s')) {
        variations.add(word.charAt(0).toUpperCase() + word.slice(1));
    }

    // Heuristic 7: 'x' -> 'ksh'
    if (word.includes('x')) {
        variations.add(word.replace(/x/g, 'ksh'));
    }

    return Array.from(variations);
};

export const transliterateWord = (word: string): string[] => {
    if (!word) return [];

    const candidates = new Set<string>();
    const lowerWord = word.toLowerCase();

    // 1. Direct Dictionary Match (Highest Priority)
    if (COMMON_WORDS[lowerWord]) {
        candidates.add(COMMON_WORDS[lowerWord]);
    }

    // 2. Generate phonetic variations and transliterate
    const variations = generateVariations(word);

    // Limit processing to prevent lag on long words
    const safeVariations = variations.slice(0, 10);

    safeVariations.forEach(v => {
        SCHEMES.forEach(scheme => {
            try {
                const res = Sanscript.t(v, scheme, 'devanagari');
                if (res && res !== v) {
                    candidates.add(res);
                }
            } catch (e) { }
        });
    });

    // 3. Fallback: Try capitalizing just the first letter for Sanscript (often maps to proper nouns better)
    if (candidates.size < 5) {
        try {
            const capRes = Sanscript.t(word.charAt(0).toUpperCase() + word.slice(1), 'itrans', 'devanagari');
            if (capRes) candidates.add(capRes);
        } catch (e) { }
    }

    return Array.from(candidates).slice(0, 8); // Return top 8 candidates
};
