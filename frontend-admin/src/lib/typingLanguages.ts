import { useEffect, useState, useSyncExternalStore } from 'react';
import { getApiUrl } from '@/lib/getApiUrl';

/**
 * The test builder's second typing language. English is always the first; the second
 * is whatever the teacher picks (Marathi, Bengali, Arabic…) and every "English | …"
 * switch on the page shows that same language.
 *
 * Languages with an `itc` are typed in English letters and turned into their script
 * when space is pressed (Google Input Tools — same service Hindi always used). The
 * rest are typed with the teacher's own keyboard; the platform stores any script.
 */

export interface TypingLanguage {
    code: string;
    /** English name, used for sorting and search. */
    name: string;
    /** The language's own name, shown on the switch. */
    native: string;
    /** Google Input Tools engine. Languages without one use the teacher's keyboard. */
    itc?: string;
    /** Unicode script (for spotting the language in text read from a photo). Latin when absent. */
    script?: string;
    rtl?: boolean;
    /** Written without spaces between words (Chinese, Japanese): space turns the word and is not kept. */
    joined?: boolean;
}

/** A field is typed in English or in the page's second language. Old drafts may say 'hi'. */
export type FieldMode = 'en' | 'second';

const L = (code: string, name: string, native: string, extra: Omit<TypingLanguage, 'code' | 'name' | 'native'> = {}): TypingLanguage =>
    ({ code, name, native, ...extra });

const T = (id: string) => `${id}-t-i0-und`;

export const LANGUAGES: TypingLanguage[] = [
    L('af', 'Afrikaans', 'Afrikaans'),
    L('sq', 'Albanian', 'Shqip'),
    L('am', 'Amharic', 'አማርኛ', { itc: T('am'), script: 'Ethiopic' }),
    L('ar', 'Arabic', 'العربية', { itc: T('ar'), script: 'Arabic', rtl: true }),
    L('hy', 'Armenian', 'Հայերեն', { script: 'Armenian' }),
    L('as', 'Assamese', 'অসমীয়া', { itc: T('as'), script: 'Bengali' }),
    L('az', 'Azerbaijani', 'Azərbaycanca'),
    L('eu', 'Basque', 'Euskara'),
    L('be', 'Belarusian', 'Беларуская', { itc: T('be'), script: 'Cyrillic' }),
    L('bn', 'Bengali', 'বাংলা', { itc: T('bn'), script: 'Bengali' }),
    L('bho', 'Bhojpuri', 'भोजपुरी', { itc: T('hi'), script: 'Devanagari' }),
    L('brx', 'Bodo', 'बड़ो', { itc: T('hi'), script: 'Devanagari' }),
    L('bs', 'Bosnian', 'Bosanski'),
    L('bg', 'Bulgarian', 'Български', { itc: T('bg'), script: 'Cyrillic' }),
    L('my', 'Burmese', 'မြန်မာ', { script: 'Myanmar' }),
    L('yue', 'Cantonese', '粵語', { itc: 'yue-hant-t-i0-und', script: 'Han', joined: true }),
    L('ca', 'Catalan', 'Català'),
    L('ceb', 'Cebuano', 'Cebuano'),
    L('ny', 'Chichewa', 'Chichewa'),
    L('zh', 'Chinese (Simplified)', '简体中文', { itc: 'zh-t-i0-pinyin', script: 'Han', joined: true }),
    L('zh-Hant', 'Chinese (Traditional)', '繁體中文', { itc: 'zh-hant-t-i0-pinyin', script: 'Han', joined: true }),
    L('hr', 'Croatian', 'Hrvatski'),
    L('cs', 'Czech', 'Čeština'),
    L('da', 'Danish', 'Dansk'),
    L('dv', 'Dhivehi', 'ދިވެހި', { script: 'Thaana', rtl: true }),
    L('doi', 'Dogri', 'डोगरी', { itc: T('hi'), script: 'Devanagari' }),
    L('nl', 'Dutch', 'Nederlands'),
    L('dz', 'Dzongkha', 'རྫོང་ཁ', { script: 'Tibetan' }),
    L('et', 'Estonian', 'Eesti'),
    L('fil', 'Filipino', 'Filipino'),
    L('fi', 'Finnish', 'Suomi'),
    L('fr', 'French', 'Français'),
    L('gl', 'Galician', 'Galego'),
    L('ka', 'Georgian', 'ქართული', { script: 'Georgian' }),
    L('de', 'German', 'Deutsch'),
    L('el', 'Greek', 'Ελληνικά', { itc: T('el'), script: 'Greek' }),
    L('gu', 'Gujarati', 'ગુજરાતી', { itc: T('gu'), script: 'Gujarati' }),
    L('ht', 'Haitian Creole', 'Kreyòl ayisyen'),
    L('ha', 'Hausa', 'Hausa'),
    L('he', 'Hebrew', 'עברית', { itc: T('he'), script: 'Hebrew', rtl: true }),
    L('hi', 'Hindi', 'हिंदी', { itc: T('hi'), script: 'Devanagari' }),
    L('hu', 'Hungarian', 'Magyar'),
    L('is', 'Icelandic', 'Íslenska'),
    L('ig', 'Igbo', 'Igbo'),
    L('id', 'Indonesian', 'Bahasa Indonesia'),
    L('ga', 'Irish', 'Gaeilge'),
    L('it', 'Italian', 'Italiano'),
    L('ja', 'Japanese', '日本語', { itc: T('ja'), script: 'Hiragana', joined: true }),
    L('jv', 'Javanese', 'Basa Jawa'),
    L('kn', 'Kannada', 'ಕನ್ನಡ', { itc: T('kn'), script: 'Kannada' }),
    L('ks', 'Kashmiri', 'کٲشُر', { script: 'Arabic', rtl: true }),
    L('kk', 'Kazakh', 'Қазақ тілі', { script: 'Cyrillic' }),
    L('km', 'Khmer', 'ខ្មែរ', { script: 'Khmer' }),
    L('rw', 'Kinyarwanda', 'Ikinyarwanda'),
    L('kok', 'Konkani', 'कोंकणी', { itc: T('mr'), script: 'Devanagari' }),
    L('ko', 'Korean', '한국어', { script: 'Hangul' }),
    L('ku', 'Kurdish', 'Kurdî'),
    L('ky', 'Kyrgyz', 'Кыргызча', { script: 'Cyrillic' }),
    L('lo', 'Lao', 'ລາວ', { script: 'Lao' }),
    L('la', 'Latin', 'Latina'),
    L('lv', 'Latvian', 'Latviešu'),
    L('lt', 'Lithuanian', 'Lietuvių'),
    L('lb', 'Luxembourgish', 'Lëtzebuergesch'),
    L('mk', 'Macedonian', 'Македонски', { script: 'Cyrillic' }),
    L('mai', 'Maithili', 'मैथिली', { itc: T('hi'), script: 'Devanagari' }),
    L('mg', 'Malagasy', 'Malagasy'),
    L('ms', 'Malay', 'Bahasa Melayu'),
    L('ml', 'Malayalam', 'മലയാളം', { itc: T('ml'), script: 'Malayalam' }),
    L('mt', 'Maltese', 'Malti'),
    L('mni', 'Manipuri (Meitei)', 'ꯃꯤꯇꯩꯂꯣꯟ', { script: 'Meetei_Mayek' }),
    L('mi', 'Māori', 'Te Reo Māori'),
    L('mr', 'Marathi', 'मराठी', { itc: T('mr'), script: 'Devanagari' }),
    L('lus', 'Mizo', 'Mizo ṭawng'),
    L('mn', 'Mongolian', 'Монгол', { script: 'Cyrillic' }),
    L('ne', 'Nepali', 'नेपाली', { itc: T('ne'), script: 'Devanagari' }),
    L('no', 'Norwegian', 'Norsk'),
    L('or', 'Odia', 'ଓଡ଼ିଆ', { itc: T('or'), script: 'Oriya' }),
    L('om', 'Oromo', 'Afaan Oromoo'),
    L('ps', 'Pashto', 'پښتو', { script: 'Arabic', rtl: true }),
    L('fa', 'Persian', 'فارسی', { itc: T('fa'), script: 'Arabic', rtl: true }),
    L('pl', 'Polish', 'Polski'),
    L('pt', 'Portuguese', 'Português'),
    L('pa', 'Punjabi', 'ਪੰਜਾਬੀ', { itc: T('pa'), script: 'Gurmukhi' }),
    L('ro', 'Romanian', 'Română'),
    L('ru', 'Russian', 'Русский', { itc: T('ru'), script: 'Cyrillic' }),
    L('sa', 'Sanskrit', 'संस्कृतम्', { itc: T('sa'), script: 'Devanagari' }),
    L('sat', 'Santali', 'ᱥᱟᱱᱛᱟᱲᱤ', { script: 'Ol_Chiki' }),
    L('sr', 'Serbian', 'Српски', { itc: T('sr'), script: 'Cyrillic' }),
    L('st', 'Sesotho', 'Sesotho'),
    L('sn', 'Shona', 'chiShona'),
    L('sd', 'Sindhi', 'سنڌي', { script: 'Arabic', rtl: true }),
    L('si', 'Sinhala', 'සිංහල', { itc: T('si'), script: 'Sinhala' }),
    L('sk', 'Slovak', 'Slovenčina'),
    L('sl', 'Slovenian', 'Slovenščina'),
    L('so', 'Somali', 'Soomaali'),
    L('es', 'Spanish', 'Español'),
    L('su', 'Sundanese', 'Basa Sunda'),
    L('sw', 'Swahili', 'Kiswahili'),
    L('sv', 'Swedish', 'Svenska'),
    L('tg', 'Tajik', 'Тоҷикӣ', { script: 'Cyrillic' }),
    L('ta', 'Tamil', 'தமிழ்', { itc: T('ta'), script: 'Tamil' }),
    L('tt', 'Tatar', 'Татарча', { script: 'Cyrillic' }),
    L('te', 'Telugu', 'తెలుగు', { itc: T('te'), script: 'Telugu' }),
    L('th', 'Thai', 'ไทย', { script: 'Thai' }),
    L('bo', 'Tibetan', 'བོད་སྐད', { script: 'Tibetan' }),
    L('ti', 'Tigrinya', 'ትግርኛ', { itc: T('ti'), script: 'Ethiopic' }),
    L('tr', 'Turkish', 'Türkçe'),
    L('tk', 'Turkmen', 'Türkmençe'),
    L('ak', 'Twi (Akan)', 'Twi'),
    L('uk', 'Ukrainian', 'Українська', { itc: T('uk'), script: 'Cyrillic' }),
    L('ur', 'Urdu', 'اردو', { itc: T('ur'), script: 'Arabic', rtl: true }),
    L('ug', 'Uyghur', 'ئۇيغۇرچە', { script: 'Arabic', rtl: true }),
    L('uz', 'Uzbek', 'Oʻzbekcha'),
    L('vi', 'Vietnamese', 'Tiếng Việt'),
    L('cy', 'Welsh', 'Cymraeg'),
    L('xh', 'Xhosa', 'isiXhosa'),
    L('yi', 'Yiddish', 'ייִדיש', { script: 'Hebrew', rtl: true }),
    L('yo', 'Yoruba', 'Yorùbá'),
    L('zu', 'Zulu', 'isiZulu'),
];

const BY_CODE = new Map(LANGUAGES.map(l => [l.code, l]));

export function getLanguage(code: string | null | undefined): TypingLanguage | undefined {
    return code ? BY_CODE.get(code) : undefined;
}

/** The language code a field types in: English, or the page's second language once one is picked. */
export function resolveTyping(mode: string | undefined, second: TypingLanguage | null): string {
    return mode && mode !== 'en' && second ? second.code : 'en';
}

/* ── The chosen second language: one for the whole page, remembered on this device ── */

const STORE_KEY = 'testoza.typingLanguage';
const listeners = new Set<() => void>();

function readStored(): string | null {
    try {
        const code = localStorage.getItem(STORE_KEY);
        return code && BY_CODE.has(code) ? code : null;
    } catch {
        return null;
    }
}

let secondCode: string | null = typeof window === 'undefined' ? null : readStored();

if (typeof window !== 'undefined') {
    // Another tab picked a language: follow it.
    window.addEventListener('storage', e => {
        if (e.key !== STORE_KEY) return;
        secondCode = readStored();
        listeners.forEach(fn => fn());
    });
}

export function getSecondLanguage(): string | null {
    return secondCode;
}

export function setSecondLanguage(code: string) {
    if (!BY_CODE.has(code) || code === secondCode) return;
    secondCode = code;
    try { localStorage.setItem(STORE_KEY, code); } catch { /* private window: this page only */ }
    listeners.forEach(fn => fn());
}

function subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

export function useSecondLanguage(): TypingLanguage | null {
    const code = useSyncExternalStore(subscribe, getSecondLanguage, getSecondLanguage);
    return getLanguage(code) ?? null;
}

/* ── Spotting the language of text read from a photo ─────────────────────────── */

const scriptTests = new Map<string, RegExp>();
function hasScript(text: string, script: string): boolean {
    let re = scriptTests.get(script);
    if (!re) {
        try {
            re = script === 'Hiragana' ? /[\p{Script=Hiragana}\p{Script=Katakana}]/u : new RegExp(`\\p{Script=${script}}`, 'u');
        } catch {
            return false;
        }
        scriptTests.set(script, re);
    }
    return re.test(text);
}

/** Who gets a script when the teacher hasn't picked a language that uses it. */
const SCRIPT_DEFAULTS = ['hi', 'bn', 'pa', 'gu', 'or', 'ta', 'te', 'kn', 'ml', 'si', 'ur', 'ja', 'zh', 'ko', 'ru', 'el', 'he', 'am', 'th', 'my', 'km', 'lo', 'ka', 'hy', 'dv', 'bo', 'sat', 'mni'];

/**
 * The language a piece of text is written in, judged by its script — 'en' for Latin.
 * `preferred` comes first, so Marathi stays Marathi (not Hindi) for a teacher who picked it.
 */
export function languageOfText(text: string, preferred: (string | null | undefined)[] = []): string {
    if (!text) return 'en';
    for (const code of [...preferred, ...SCRIPT_DEFAULTS]) {
        const script = getLanguage(code)?.script;
        if (script && hasScript(text, script)) return code!;
    }
    return 'en';
}

/* ── Where the teacher is: their local languages go first in the menu ───────── */

export interface VisitorLocale {
    country: string | null;
    region: string | null;
}

/** Last resort when the location lookup fails (single-country time zones only). */
const TIMEZONE_COUNTRY: Record<string, string> = {
    'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Dhaka': 'BD', 'Asia/Karachi': 'PK', 'Asia/Kathmandu': 'NP',
    'Asia/Colombo': 'LK', 'Asia/Thimphu': 'BT', 'Indian/Maldives': 'MV', 'Asia/Kabul': 'AF', 'Asia/Tehran': 'IR',
    'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW', 'Asia/Muscat': 'OM',
    'Asia/Baghdad': 'IQ', 'Asia/Jerusalem': 'IL', 'Africa/Cairo': 'EG', 'Africa/Casablanca': 'MA',
    'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Taipei': 'TW', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR',
    'Asia/Bangkok': 'TH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN', 'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH',
    'Asia/Kuala_Lumpur': 'MY', 'Asia/Singapore': 'SG', 'Asia/Yangon': 'MM', 'Asia/Phnom_Penh': 'KH',
    'Europe/Moscow': 'RU', 'Europe/Kyiv': 'UA', 'Europe/Kiev': 'UA', 'Europe/Istanbul': 'TR', 'Europe/Paris': 'FR',
    'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Lisbon': 'PT', 'Europe/Warsaw': 'PL',
    'Europe/Amsterdam': 'NL', 'Europe/Athens': 'GR', 'America/Sao_Paulo': 'BR', 'America/Mexico_City': 'MX',
    'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Argentina/Buenos_Aires': 'AR', 'America/Santiago': 'CL',
    'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE', 'Africa/Dar_es_Salaam': 'TZ', 'Africa/Addis_Ababa': 'ET',
    'Africa/Johannesburg': 'ZA', 'Africa/Accra': 'GH', 'Pacific/Auckland': 'NZ',
};

const LOCALE_KEY = 'testoza.visitorLocale';
const LOCALE_TTL_MS = 24 * 60 * 60 * 1000;
let localeRequest: Promise<VisitorLocale> | null = null;
/** Set once the lookup lands, so a menu opened later starts with the final suggestions. */
let knownLocale: VisitorLocale | null = null;

function timeZone(): string {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
}

/** Country and state from the API (Cloudflare's view of the visitor), kept for a day. */
export function loadVisitorLocale(): Promise<VisitorLocale> {
    if (localeRequest) return localeRequest;
    localeRequest = (async () => {
        const tz = timeZone();
        try {
            const saved = JSON.parse(localStorage.getItem(LOCALE_KEY) || 'null');
            if (saved && Date.now() - saved.at < LOCALE_TTL_MS) return { country: saved.country, region: saved.region };
        } catch { /* nothing saved */ }
        const fallback: VisitorLocale = { country: TIMEZONE_COUNTRY[tz] ?? null, region: null };
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 4000);
        try {
            const res = await fetch(`${getApiUrl()}/locale?tz=${encodeURIComponent(tz)}`, { signal: controller.signal });
            if (!res.ok) return fallback;
            const data = await res.json();
            const locale: VisitorLocale = {
                country: typeof data?.country === 'string' ? data.country : fallback.country,
                region: typeof data?.region === 'string' ? data.region : null,
            };
            try { localStorage.setItem(LOCALE_KEY, JSON.stringify({ ...locale, at: Date.now() })); } catch { /* fine */ }
            return locale;
        } catch {
            return fallback;
        } finally {
            window.clearTimeout(timer);
        }
    })().then(locale => (knownLocale = locale));
    return localeRequest;
}

/**
 * Local first, then the language used across the country. In India that is the state's
 * language and then Hindi (Maharashtra → Marathi, Hindi); in Hindi-speaking states,
 * Hindi and the state's second official language.
 */
const INDIA_STATES: Record<string, string[]> = {
    'maharashtra': ['mr', 'hi'], 'gujarat': ['gu', 'hi'], 'goa': ['kok', 'hi'], 'karnataka': ['kn', 'hi'],
    'kerala': ['ml', 'hi'], 'lakshadweep': ['ml', 'hi'], 'tamil nadu': ['ta', 'hi'], 'puducherry': ['ta', 'hi'],
    'pondicherry': ['ta', 'hi'], 'andhra pradesh': ['te', 'hi'], 'telangana': ['te', 'hi'], 'west bengal': ['bn', 'hi'],
    'tripura': ['bn', 'hi'], 'odisha': ['or', 'hi'], 'orissa': ['or', 'hi'], 'assam': ['as', 'hi'], 'punjab': ['pa', 'hi'],
    'chandigarh': ['pa', 'hi'], 'sikkim': ['ne', 'hi'], 'manipur': ['mni', 'hi'], 'mizoram': ['lus', 'hi'],
    'jammu and kashmir': ['ur', 'hi'], 'dadra and nagar haveli and daman and diu': ['gu', 'hi'],
    'dadra and nagar haveli': ['gu', 'hi'], 'daman and diu': ['gu', 'hi'],
    'uttar pradesh': ['hi', 'ur'], 'bihar': ['hi', 'ur'], 'delhi': ['hi', 'pa'], 'haryana': ['hi', 'pa'],
    'jharkhand': ['hi', 'sat'], 'himachal pradesh': ['hi', 'sa'], 'uttarakhand': ['hi', 'sa'], 'uttaranchal': ['hi', 'sa'],
    'andaman and nicobar islands': ['hi', 'bn'],
};

const NIGERIA_YORUBA = ['oyo', 'ogun', 'osun', 'ondo', 'ekiti'];
const NIGERIA_IGBO = ['enugu', 'anambra', 'imo', 'abia', 'ebonyi'];
const NIGERIA_HAUSA = ['fct', 'federal capital territory', 'kano', 'kaduna', 'katsina', 'sokoto', 'zamfara', 'kebbi', 'jigawa', 'bauchi', 'gombe', 'yobe', 'borno', 'adamawa', 'niger', 'nasarawa', 'plateau', 'taraba'];

const REGION_LANGUAGES: Record<string, Record<string, string[]>> = {
    IN: INDIA_STATES,
    NG: {
        lagos: ['yo', 'ig'], kwara: ['yo', 'ha'],
        ...Object.fromEntries(NIGERIA_YORUBA.map(s => [s, ['yo']])),
        ...Object.fromEntries(NIGERIA_IGBO.map(s => [s, ['ig']])),
        ...Object.fromEntries(NIGERIA_HAUSA.map(s => [s, ['ha']])),
    },
    ES: { catalonia: ['ca', 'es'], 'balearic islands': ['ca', 'es'], valencia: ['es', 'ca'], galicia: ['gl', 'es'], 'basque country': ['eu', 'es'], navarre: ['es', 'eu'] },
    CA: { quebec: ['fr'] },
    GB: { wales: ['cy'] },
    IE: {},
    BE: { flanders: ['nl', 'fr'], wallonia: ['fr', 'nl'], brussels: ['fr', 'nl'], 'brussels capital': ['fr', 'nl'] },
    CH: { geneva: ['fr', 'de'], vaud: ['fr', 'de'], neuchatel: ['fr', 'de'], jura: ['fr', 'de'], ticino: ['it', 'de'] },
};

const ARABIC = ['ar'];
const ARABIC_FRENCH = ['ar', 'fr'];
const SPANISH = ['es'];
const FRENCH = ['fr'];

const COUNTRY_LANGUAGES: Record<string, string[]> = {
    IN: ['hi'], BD: ['bn'], PK: ['ur'], NP: ['ne', 'mai'], LK: ['si', 'ta'], BT: ['dz'], MV: ['dv'], AF: ['ps', 'fa'],
    IR: ['fa'], CN: ['zh'], TW: ['zh-Hant'], HK: ['yue', 'zh-Hant'], MO: ['zh-Hant', 'pt'], SG: ['zh', 'ms'],
    MY: ['ms', 'zh'], ID: ['id', 'jv'], PH: ['fil', 'ceb'], TH: ['th'], VN: ['vi'], KH: ['km'], LA: ['lo'], MM: ['my'],
    JP: ['ja'], KR: ['ko'], KP: ['ko'], MN: ['mn'], KZ: ['kk', 'ru'], UZ: ['uz', 'ru'], KG: ['ky', 'ru'], TJ: ['tg', 'ru'],
    TM: ['tk'], AZ: ['az'], GE: ['ka'], AM: ['hy'], RU: ['ru', 'tt'], UA: ['uk'], BY: ['be', 'ru'], TR: ['tr', 'ku'],
    CY: ['el', 'tr'], GR: ['el'], IL: ['he', 'ar'],
    AE: ARABIC, SA: ARABIC, QA: ARABIC, KW: ARABIC, OM: ARABIC, BH: ARABIC, YE: ARABIC, SY: ARABIC, JO: ARABIC,
    PS: ARABIC, EG: ARABIC, LY: ARABIC, SD: ARABIC, IQ: ['ar', 'ku'], LB: ARABIC_FRENCH, TN: ARABIC_FRENCH,
    DZ: ARABIC_FRENCH, MA: ARABIC_FRENCH, MR: ARABIC_FRENCH, KM: ['ar', 'fr'], DJ: ['fr', 'ar'], SO: ['so', 'ar'],
    FR: FRENCH, DE: ['de'], AT: ['de'], LI: ['de'], CH: ['de', 'fr'], BE: ['nl', 'fr'], NL: ['nl'], LU: ['lb', 'fr'],
    ES: SPANISH, PT: ['pt'], IT: ['it'], SM: ['it'], MT: ['mt'], IE: ['ga'], PL: ['pl'], CZ: ['cs'], SK: ['sk'],
    HU: ['hu'], RO: ['ro'], MD: ['ro', 'ru'], BG: ['bg'], RS: ['sr'], ME: ['sr'], HR: ['hr'], BA: ['bs', 'sr'],
    SI: ['sl'], MK: ['mk', 'sq'], AL: ['sq'], XK: ['sq', 'sr'], DK: ['da'], SE: ['sv'], NO: ['no'], FI: ['fi', 'sv'],
    IS: ['is'], EE: ['et'], LV: ['lv'], LT: ['lt'],
    US: SPANISH, CA: FRENCH, MX: SPANISH, GT: SPANISH, HN: SPANISH, SV: SPANISH, NI: SPANISH, CR: SPANISH, PA: SPANISH,
    CU: SPANISH, DO: SPANISH, PR: SPANISH, CO: SPANISH, VE: SPANISH, EC: SPANISH, PE: SPANISH, BO: SPANISH,
    CL: SPANISH, AR: SPANISH, UY: SPANISH, PY: SPANISH, BR: ['pt'], HT: ['ht', 'fr'],
    NG: ['ha', 'yo'], KE: ['sw'], TZ: ['sw'], UG: ['sw'], RW: ['rw', 'fr'], ET: ['am', 'om'], ER: ['ti', 'ar'],
    ZA: ['af', 'zu'], ZW: ['sn'], MW: ['ny'], LS: ['st'], NA: ['af'], MG: ['mg', 'fr'], GH: ['ak'], AO: ['pt'],
    MZ: ['pt'], CD: ['fr', 'sw'], CM: FRENCH, CI: FRENCH, SN: FRENCH, ML: FRENCH, BF: FRENCH, NE: ['fr', 'ha'],
    TD: ['fr', 'ar'], BJ: ['fr', 'yo'], TG: FRENCH, GN: FRENCH, GA: FRENCH, CG: FRENCH, BI: FRENCH, NZ: ['mi'],
};

function normaliseRegion(region: string): string {
    return region
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/^(national capital territory of|nct of)\s+/, '')
        .replace(/\s+(state|division|province|region|territory)$/, '')
        .replace(/[^a-z ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function countryName(code: string): string | null {
    try {
        return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? null;
    } catch {
        return null;
    }
}

/** A browser language tag ('mr-IN', 'zh-TW', 'nb') as one of our codes. */
function codeFromTag(tag: string): string | null {
    const lower = tag.toLowerCase();
    if (/^zh-(tw|hk|mo|hant)/.test(lower)) return 'zh-Hant';
    const base = lower.split('-')[0];
    const alias: Record<string, string> = { nb: 'no', nn: 'no', tl: 'fil', iw: 'he', in: 'id', ji: 'yi' };
    const code = alias[base] ?? base;
    return BY_CODE.has(code) ? code : null;
}

export interface LanguageSuggestions {
    codes: string[];
    /** "Maharashtra", "Bangladesh" — or null when we only went by the browser's languages. */
    place: string | null;
}

export function suggestLanguages(locale: VisitorLocale | null, browserLanguages: readonly string[] = []): LanguageSuggestions {
    const country = locale?.country?.toUpperCase() || null;
    const region = locale?.region ? normaliseRegion(locale.region) : '';
    const regional = country && region ? REGION_LANGUAGES[country]?.[region] : undefined;

    let codes: string[] = [];
    let place: string | null = null;
    if (regional?.length) {
        codes = regional;
        place = locale!.region!.replace(/^(National Capital Territory of|NCT of)\s+/i, '').replace(/\s+(State|Division|Province|Region)$/, '');
    } else if (country && COUNTRY_LANGUAGES[country]) {
        codes = COUNTRY_LANGUAGES[country];
        place = countryName(country);
    }

    // Nowhere we know (or an English-only place): the languages the browser is set to.
    if (!codes.length) {
        place = null;
        for (const tag of browserLanguages) {
            const code = codeFromTag(tag);
            if (code && code !== 'en' && !codes.includes(code)) codes.push(code);
        }
    }
    return { codes: codes.filter(c => BY_CODE.has(c)).slice(0, 2), place };
}

/**
 * Suggestions for this visitor. The language switch starts the lookup when the builder
 * opens, so by the time the menu is opened the location is usually known.
 */
export function useLanguageSuggestions(): LanguageSuggestions {
    const browser = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
    const [locale, setLocale] = useState<VisitorLocale | null>(knownLocale);
    useEffect(() => {
        if (knownLocale) return;
        let live = true;
        loadVisitorLocale().then(l => { if (live) setLocale(l); });
        return () => { live = false; };
    }, []);
    return suggestLanguages(locale ?? { country: TIMEZONE_COUNTRY[timeZone()] ?? null, region: null }, browser);
}
