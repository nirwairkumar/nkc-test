/**
 * Hindi suggestions for a word typed in English letters, the way TestoZa's
 * components/ui/IMEInput.tsx gets them: Google Input Tools, itc=hi-t-i0-und, five
 * suggestions, the first one used. If the service can't be reached (offline, blocked),
 * the demo falls back to BUILT_IN: the service's own answers for the words this page
 * suggests, recorded on 3 October 2026, so the guided path works anywhere. A word in
 * neither stays in English letters, as it does in the app when the connection drops.
 */

export type SuggestSource = 'google' | 'built-in';

const BUILT_IN: Record<string, string[]> = {
    nimnalikhit: ['निम्नलिखित', 'निम्नालिखित', 'निम्नलिखीत', 'निम्निलिखित', 'निम्नलखित'],
    mein: ['में', 'मैं', 'मेँ', 'मे', 'मैन'],
    se: ['से', 'सी', 'स', 'सै', 'सॅ'],
    kaun: ['कौन', 'कौं', 'कौण', 'कउन', 'कॉन'],
    sa: ['सा', 'से', 'स', 'सॅ', 'सै'],
    kathan: ['कथन', 'कथं', 'कथान', 'कठिन', 'कठन'],
    satya: ['सत्य', 'सत्या', 'सतय', 'सतया', 'सत्ये'],
    hai: ['है', 'हैं', 'ही', 'हाई', 'हे'],
    nirvat: ['निर्वात', 'नीरवत', 'निर्वत', 'निरवत', 'निरवट'],
    prakash: ['प्रकाश', 'प्रकाष', 'प्रकश', 'परकाश', 'प्राकश'],
    ki: ['की', 'कि', 'कई', 'को', 'क़ि'],
    chaal: ['चाल', 'छाल', 'छल', 'काल', 'चॉल'],
    kitni: ['कितनी', 'कितनि', 'किटनी', 'कीटनी', 'कीतनी'],
    hoti: ['होती', 'होति', 'होतीं', 'छोटी', 'होटी'],
    kam: ['काम', 'कम', 'कॉम', 'कं', 'कर्म'],
    grah: ['गृह', 'ग्रह', 'ग्राह', 'गरह', 'ग़ृह'],
    graha: ['ग्रह', 'गृह', 'ग्रहा', 'ग्राह', 'गृहा'],
    vigyan: ['विज्ञानं', 'विज्ञान', 'विग्यान', 'विञान', 'विज्ञन'],
    vigyaan: ['विज्ञान', 'विग्यान', 'विञान', 'विञाअण', 'विगयाँ'],
    karan: ['कारन', 'कारण', 'करण', 'करें', 'करन'],
    kaaran: ['कारण', 'कारन', 'काऱण', 'कारं', 'कारें'],
    shunya: ['शुन्य', 'शून्य', 'षून्य', 'शून्या', 'शुन्या'],
    shoonya: ['शून्य', 'षून्य', 'शुन्य', 'शून्या', 'शूण्य'],
    duri: ['दुरी', 'दूरी', 'दूरि', 'दुरि', 'डरी'],
    doori: ['दूरी', 'दूरि', 'दुरी', 'डोरी', 'डूरी'],
    dhara: ['धरा', 'धारा', 'द्वारा', 'द्धारा', 'धरे'],
    hriday: ['ह्रदय', 'हृदय', 'ह्रिदय', 'हरिदय', 'हरिदाय'],
    gaon: ['गाओं', 'गाऊँ', 'गायन', 'गाऊं', 'गांव'],
    gaanv: ['गाँव', 'गांव', 'गॉंव', 'गॉँव', 'ग़ाँव'],
    prashn: ['प्रश्न', 'प्रष्न', 'प्रशन', 'प्राशन', 'पृश्न'],
    uttar: ['उत्तर', 'उत्तार', 'ुत्तर', 'उतर', 'ऊत्तर'],
    gyan: ['ज्ञान', 'ग्यान', 'ञं', 'ज्ञन', 'गयां'],
    kshetra: ['क्षेत्र', 'क्षेत्रा', 'क्शेत्र', 'क्षैत्र', 'क्षेत्रे'],
    krishi: ['कृषि', 'कृशि', 'कृषी', 'क़ृषि', 'कृशी'],
    rishi: ['ऋषि', 'रिषि', 'ऋषी', 'रिषी', 'ऋशि'],
    shri: ['श्री', 'श्रीं', 'शरी', 'श्रि', 'शृ'],
    pariksha: ['परीक्षा', 'परिक्षा', 'परीक्शा', 'पारीक्षा', 'पऱीक्षा'],
    rashtrapati: ['राष्ट्रपति', 'राश्ट्रपति', 'राष्ट्रपती', 'राष्टरपति', 'राषट्रपति'],
    gurutvakarshan: ['गुरुत्वाकर्षण', 'गुरूत्वाकर्षण', 'गुरुत्वकर्षण', 'गुरुतवाकर्षण', 'गुरूत्वाकर्शण'],
    nahi: ['नहीं', 'नही', 'नहि', 'नाही', 'नहीँ'],
    si: ['सी', 'सि', 'सई', 'सो', 'सै'],
    km: ['कम', 'कं', 'कर्म', 'क्म', 'क़म'],
    namaste: ['नमस्ते', 'नमसते', 'नामस्ते', 'नमस्तें', 'नमस्ति'],
    bharat: ['भारत', 'भरत', 'भरात', 'भगत', 'भरैत'],
    hindi: ['हिंदी', 'हिन्दी', 'हिन्दि', 'हिँदी', 'हिंदि'],
    darpan: ['दर्पण', 'दर्पन', 'दरपन', 'दर्पं', 'दरपण'],
    pratibimb: ['प्रतिबिम्ब', 'प्रतिबिंब', 'प्रातिबिम्ब', 'परतिबिम्ब', 'प्रतिबिंम्ब'],
    uttal: ['उत्तल', 'उत्ताल', 'ुट्टल', 'ुत्तल', 'ुत्ताल'],
    avtal: ['अवतल', 'अवताल', 'ावताल', 'ावटल', 'ावतल'],
    lens: ['लेंस', 'लेन्स', 'लैंस', 'लेनस', 'लेस'],
    fokas: ['फोकस', 'फ़ोकस', 'फॉक्स', 'फोकास', 'फॉकस'],
    aur: ['और', 'ओर', 'औऱ', 'अउर', 'ौर'],
    ya: ['या', 'य', 'ये', 'ए', 'आ'],
    sahi: ['सही', 'सहि', 'साही', 'साहि', 'सभी'],
    galat: ['गलत', 'ग़लत', 'गळत', 'गालात', 'गालत'],
    vikalp: ['विकल्प', 'विकलप', 'विक्लप', 'वीकल्प', 'विक्ल्प'],
    sabhi: ['सभी', 'सभि', 'सबहि', 'सबही', 'सभ्य'],
    koi: ['कोई', 'कोइ', 'की', 'कि', 'कई'],
};

const cache = new Map<string, string[]>();

/** True for a word the app would send: letters only (IMEInput: /^[a-zA-Z]+$/). */
export const isPlainWord = (w: string) => /^[a-zA-Z]+$/.test(w);

/**
 * The service's suggestions for `word`, the first being the one the app types in.
 * Resolves to null when there are none (the word then stays in English letters).
 */
export async function suggest(word: string): Promise<{ list: string[]; source: SuggestSource } | null> {
    const key = word.toLowerCase();
    const hit = cache.get(key);
    if (hit) return { list: hit, source: 'google' };
    try {
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=hi-t-i0-und&num=5`, { signal: ctrl.signal });
        window.clearTimeout(timer);
        const data = await res.json();
        const list: unknown = data?.[0] === 'SUCCESS' ? data?.[1]?.[0]?.[1] : null;
        if (Array.isArray(list) && list.length && list.every((s) => typeof s === 'string')) {
            cache.set(key, list as string[]);
            return { list: list as string[], source: 'google' };
        }
    } catch {
        // Offline, blocked or slow: fall through to the recorded answers.
    }
    const built = BUILT_IN[key];
    return built ? { list: built, source: 'built-in' } : null;
}

/** The first suggestion straight from the recorded list (the hero's script). */
export const firstBuiltIn = (word: string) => BUILT_IN[word.toLowerCase()]?.[0] ?? word;
export const builtInList = (word: string) => BUILT_IN[word.toLowerCase()] ?? [];
