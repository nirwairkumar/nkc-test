/**
 * TEMPORARY — maintenance notice under the navbar on /dashboard and /my-tests (owner, 2026-10-17,
 * shown while a deploy goes out with teachers online). To remove: delete this file and the
 * <MaintenanceStrip /> line (plus its import) in src/Layout.tsx.
 *
 * Shows once per browser visit (session) on each of the two pages, then slides away on its own
 * after a few seconds or on ×. English line + the same line in the teacher's local language
 * (from the same location lookup the builder's language switch uses).
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Wrench, X } from 'lucide-react';
import { useLanguageSuggestions } from '@/lib/typingLanguages';

const PAGES = ['/dashboard', '/my-tests'];
const SHOW_MS = 12000;

/** [before, highlighted, after] — the highlight is "it will not affect your work". */
type Line = [string, string, string];

const EN: Line = ["We're doing some maintenance right now. You may see a red line on your screen, but it will ", 'not affect your work', '.'];

const LOCAL: Record<string, Line> = {
    hi: ['अभी मेंटेनेंस चल रहा है। आपकी स्क्रीन पर एक लाल लाइन दिख सकती है, लेकिन इससे ', 'आपके काम पर कोई असर नहीं पड़ेगा', '।'],
    mr: ['सध्या देखभालीचे काम सुरू आहे. तुमच्या स्क्रीनवर लाल रेषा दिसू शकते, पण ', 'त्याचा तुमच्या कामावर परिणाम होणार नाही', '.'],
    gu: ['હાલમાં જાળવણીનું કામ ચાલી રહ્યું છે. તમારી સ્ક્રીન પર લાલ લાઇન દેખાઈ શકે છે, પણ ', 'તેનાથી તમારા કામ પર કોઈ અસર નહીં થાય', '.'],
    bn: ['এখন রক্ষণাবেক্ষণের কাজ চলছে। আপনার স্ক্রিনে একটি লাল দাগ দেখা যেতে পারে, কিন্তু ', 'এতে আপনার কাজে কোনো প্রভাব পড়বে না', '।'],
    ta: ['தற்போது பராமரிப்புப் பணி நடைபெறுகிறது. உங்கள் திரையில் ஒரு சிவப்புக் கோடு தெரியலாம், ஆனால் ', 'அது உங்கள் வேலையைப் பாதிக்காது', '.'],
    te: ['ప్రస్తుతం నిర్వహణ పనులు జరుగుతున్నాయి. మీ స్క్రీన్‌పై ఎరుపు గీత కనిపించవచ్చు, కానీ ', 'అది మీ పనిని ప్రభావితం చేయదు', '.'],
    kn: ['ಈಗ ನಿರ್ವಹಣೆ ಕೆಲಸ ನಡೆಯುತ್ತಿದೆ. ನಿಮ್ಮ ಪರದೆಯ ಮೇಲೆ ಕೆಂಪು ಗೆರೆ ಕಾಣಿಸಬಹುದು, ಆದರೆ ', 'ಅದು ನಿಮ್ಮ ಕೆಲಸದ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರುವುದಿಲ್ಲ', '.'],
    ml: ['ഇപ്പോൾ അറ്റകുറ്റപ്പണി നടക്കുന്നു. നിങ്ങളുടെ സ്ക്രീനിൽ ഒരു ചുവന്ന വര കണ്ടേക്കാം, പക്ഷേ ', 'അത് നിങ്ങളുടെ ജോലിയെ ബാധിക്കില്ല', '.'],
    pa: ['ਇਸ ਵੇਲੇ ਰੱਖ-ਰਖਾਅ ਦਾ ਕੰਮ ਚੱਲ ਰਿਹਾ ਹੈ। ਤੁਹਾਡੀ ਸਕ੍ਰੀਨ \'ਤੇ ਇੱਕ ਲਾਲ ਲਾਈਨ ਦਿਖ ਸਕਦੀ ਹੈ, ਪਰ ', 'ਇਸ ਨਾਲ ਤੁਹਾਡੇ ਕੰਮ \'ਤੇ ਕੋਈ ਅਸਰ ਨਹੀਂ ਪਵੇਗਾ', '।'],
    or: ['ବର୍ତ୍ତମାନ ରକ୍ଷଣାବେକ୍ଷଣ କାମ ଚାଲିଛି। ଆପଣଙ୍କ ସ୍କ୍ରିନରେ ଏକ ନାଲି ଗାର ଦେଖାଯାଇପାରେ, କିନ୍ତୁ ', 'ଏହା ଆପଣଙ୍କ କାମକୁ ପ୍ରଭାବିତ କରିବ ନାହିଁ', '।'],
    as: ['এতিয়া মেইনটেনেন্সৰ কাম চলি আছে। আপোনাৰ স্ক্ৰীণত এডাল ৰঙা ৰেখা দেখা পাব পাৰে, কিন্তু ', 'ই আপোনাৰ কামত কোনো প্ৰভাৱ নেপেলায়', '।'],
    ur: ['اس وقت مینٹیننس جاری ہے۔ آپ کی اسکرین پر ایک سرخ لکیر نظر آ سکتی ہے، لیکن ', 'اس سے آپ کے کام پر کوئی اثر نہیں پڑے گا', '۔'],
    ne: ['अहिले मर्मतको काम भइरहेको छ। तपाईंको स्क्रिनमा रातो रेखा देखिन सक्छ, तर ', 'यसले तपाईंको काममा कुनै असर गर्दैन', '।'],
    es: ['Estamos haciendo mantenimiento. Puede que veas una línea roja en tu pantalla, pero ', 'no afectará tu trabajo', '.'],
    fr: ["Une maintenance est en cours. Vous verrez peut-être une ligne rouge à l'écran, mais ", "cela n'affectera pas votre travail", '.'],
    pt: ['Estamos em manutenção. Você pode ver uma linha vermelha na tela, mas ', 'isso não afetará seu trabalho', '.'],
    de: ['Wir führen gerade Wartungsarbeiten durch. Möglicherweise sehen Sie eine rote Linie auf dem Bildschirm, aber ', 'das hat keinen Einfluss auf Ihre Arbeit', '.'],
    ar: ['نقوم حاليًا بأعمال صيانة. قد ترى خطًا أحمر على شاشتك، لكن ', 'ذلك لن يؤثر على عملك', '.'],
    id: ['Kami sedang melakukan pemeliharaan. Anda mungkin melihat garis merah di layar, tetapi ', 'ini tidak akan memengaruhi pekerjaan Anda', '.'],
    fil: ['May maintenance kami ngayon. Maaaring may makita kang pulang linya sa screen, pero ', 'hindi nito maaapektuhan ang iyong trabaho', '.'],
    sw: ['Tunafanya matengenezo sasa hivi. Huenda ukaona mstari mwekundu kwenye skrini yako, lakini ', 'hautaathiri kazi yako', '.'],
    zh: ['我们正在进行维护。您的屏幕上可能会出现一条红线，但', '不会影响您的工作', '。'],
};

const RTL = new Set(['ur', 'ar']);

function Sentence({ line, lang }: { line: Line; lang: string }) {
    return (
        <p lang={lang} dir={RTL.has(lang) ? 'rtl' : undefined} className="leading-relaxed">
            {line[0]}
            <mark className="rounded bg-amber-200/80 px-1 py-px font-semibold text-amber-950 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">{line[1]}</mark>
            {line[2]}
        </p>
    );
}

/** Both lines; mounted only while the strip shows, so the location lookup runs only then. */
function Lines() {
    const { codes, place } = useLanguageSuggestions();
    // In the US the "local" suggestion is Spanish; English alone reads better there.
    const code = codes[0];
    const local = code && code !== 'en' && !(code === 'es' && place === 'United States') ? LOCAL[code] : undefined;
    return (
        <div className="min-w-0 flex-1 space-y-0.5">
            <Sentence line={EN} lang="en" />
            {local && <Sentence line={local} lang={code} />}
        </div>
    );
}

export default function MaintenanceStrip() {
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (!PAGES.includes(pathname)) { setOpen(false); return; }
        const key = `testoza.maintenanceStrip:${pathname}`;
        try {
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, '1');
        } catch { /* private window: show it anyway */ }
        setMounted(true);
        setOpen(true);
        const t = window.setTimeout(() => setOpen(false), SHOW_MS);
        return () => window.clearTimeout(t);
    }, [pathname]);

    if (!mounted || !PAGES.includes(pathname)) return null;

    return (
        <div
            role="status"
            aria-hidden={!open}
            className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            onTransitionEnd={() => { if (!open) setMounted(false); }}
        >
            <div className="overflow-hidden">
                <div className="border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
                    <div className="mx-auto flex max-w-5xl items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            <Wrench className="h-3.5 w-3.5" />
                        </span>
                        <Lines />
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Close notice"
                            className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900 cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
