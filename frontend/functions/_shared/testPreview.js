/**
 * Link-preview (og:*) tags for a test page, shared by /test/:slug and /test-intro/:id.
 *
 * Two kinds of link, two kinds of card:
 *  - A public practice test is found through search and shared like an article, so it
 *    keeps the descriptive SEO card.
 *  - A live exam / unlisted link is an examiner's invitation to their own candidates.
 *    It used to show TestoZa's marketing banner ("Create Instantly with AI • Anti-Cheat
 *    Proctoring…"), a "| TestoZa" title and "Creator: <name>" — an advert, in a class
 *    WhatsApp group. Now it reads like a notice: the exam, the institute, how long, what
 *    to do. The image is a 256px logo tile, like Zoom's: WhatsApp shows any og:image
 *    300px or wider as a big picture card (the advert look), and anything smaller as
 *    the small side thumbnail ordinary links get.
 *
 * Keep in step with the /test/ branch of infrastructure/cloudflare-worker/worker.js.
 */

const EXAM_IMAGE = { url: 'https://app.testoza.com/link-preview.png', width: 256, height: 256 };

export function isInvitation(test) {
    const visibility = test.visibility || (test.is_public ? 'public' : 'private');
    return !!(test.settings && test.settings.conduct_exam && test.settings.conduct_exam.enabled) || visibility !== 'public';
}

/** "Open the link, enter your name and roll no, then tap Start." — same words as the WhatsApp message. */
function instruction(settings) {
    const s = settings || {};
    if (s.login_required) return 'Open the link, sign in when asked, then tap Start.';
    if (!(s.start_form && s.start_form.enabled)) return 'Open the link and tap Start.';
    let labels = ((s.start_form.fields || [])
        .map(f => String((f && f.label) || '').trim().split(/\s+/)
            .map(w => (/^[A-Z0-9]{2,}$/.test(w) ? w : w.toLowerCase())).join(' '))
        .filter(Boolean));
    if (labels.length === 0) labels = ['name'];
    if (labels.length > 3) return 'Open the link, fill in your details, then tap Start.';
    const asked = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
    return `Open the link, enter your ${asked}, then tap Start.`;
}

export function previewMeta(test) {
    if (!isInvitation(test)) {
        const title = test.title ? `${test.title} | TestoZa` : 'TestoZa – Free Online Test Maker';
        let description = test.description || 'Attempt this online mock test with real exam experience, instant grading, and detailed solutions on TestoZa.';
        if (description.length > 200) description = description.substring(0, 197) + '...';
        const cats = [];
        if (Array.isArray(test.tags)) cats.push(...test.tags);
        if (test.custom_category) cats.push(test.custom_category);
        if (cats.length > 0) description += ` | Categories: ${cats.join(', ')}`;
        return {
            title, description, robots: null, siteName: 'TestoZa', card: 'summary_large_image',
            image: { url: test.og_image || 'https://testoza.com/default-og.png', width: 1200, height: 630, alt: title },
        };
    }

    const institute = (test.institution_name || '').trim();
    const title = institute ? `${test.title} — ${institute}` : (test.title || 'Online exam');
    const questions = test.total_questions || (Array.isArray(test.questions) ? test.questions.length : 0);
    const facts = [
        test.duration ? `${test.duration} minutes` : '',
        questions ? `${questions} questions` : '',
    ].filter(Boolean).join(' · ');
    const description = `${facts ? `${facts}. ` : ''}${instruction(test.settings)}`;
    // The institute's logo when it has one; otherwise a plain exam-paper icon. Never our banner.
    const image = test.institution_logo
        ? { url: test.institution_logo, width: null, height: null, alt: institute || title }
        : { ...EXAM_IMAGE, alt: 'TestoZa' };
    return {
        title, description, image,
        robots: 'noindex, nofollow',
        siteName: institute || 'TestoZa',
        card: 'summary',
    };
}

/**
 * testoza.com/join, the address a teacher writes on the board or posts to the class
 * group. It used to inherit the homepage head — "Free Online Test Maker for Teachers"
 * and the big marketing banner, an advert. Now the card is the page itself: a 256px
 * picture of the code screen (six empty boxes, "testoza.com/join"), small enough for
 * WhatsApp's side thumbnail, same as an exam link. og:url is app.testoza.com/join, the
 * page that answers (testoza.com/join 301s here). Keep in step with worker.js.
 */
export function joinPageMeta() {
    return {
        title: 'Join your exam — testoza.com/join',
        description: 'Type the 6-digit exam code you were given, then your name, and start your exam.',
        robots: 'noindex, nofollow',
        siteName: 'TestoZa',
        card: 'summary',
        image: { url: 'https://app.testoza.com/join-preview.png', width: 256, height: 256, alt: 'Join your exam: six boxes for the exam code' },
    };
}

/** Rewrites the SPA shell's head with `meta`. */
export function rewriteHead(response, meta, canonicalUrl) {
    const set = (value) => ({ element(e) { if (value == null) e.remove(); else e.setAttribute('content', String(value)); } });
    let rewriter = new HTMLRewriter()
        .on('title', { element(e) { e.setInnerContent(meta.title); } })
        .on('meta[name="description"]', set(meta.description))
        .on('link[rel="canonical"]', { element(e) { e.setAttribute('href', canonicalUrl); } })
        .on('meta[property="og:title"]', set(meta.title))
        .on('meta[property="og:description"]', set(meta.description))
        .on('meta[property="og:url"]', set(canonicalUrl))
        .on('meta[property="og:site_name"]', set(meta.siteName))
        .on('meta[property="og:image"]', set(meta.image.url))
        .on('meta[property="og:image:width"]', set(meta.image.width))
        .on('meta[property="og:image:height"]', set(meta.image.height))
        .on('meta[property="og:image:alt"]', set(meta.image.alt))
        .on('meta[name="twitter:card"]', set(meta.card))
        .on('meta[name="twitter:title"]', set(meta.title))
        .on('meta[name="twitter:description"]', set(meta.description))
        .on('meta[name="twitter:image"]', set(meta.image.url))
        .on('head', { element(e) { e.append(`<meta name="seo-worker-status" content="active-injected" />`, { html: true }); } });
    if (meta.robots) rewriter = rewriter.on('meta[name="robots"]', set(meta.robots));
    return rewriter.transform(response);
}
