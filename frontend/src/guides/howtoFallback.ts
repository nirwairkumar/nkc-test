/**
 * Crawler text for the widgets the four "how to" guides share. Each guide file puts these
 * in its widget blocks as `fallbackHtml`; the worker serves them to search engines and AI
 * crawlers in place of the React widget, written from the same data in howtoData.ts.
 *
 * Dependency-free, like everything in src/guides.
 */
import { BUILDERS, EMBED_SAMPLE, EMBED_COLORS, PAPER_PATTERNS, WA_MESSAGES, type HowtoPage, embedHtml, escapeHtml, secondsEach } from './howtoData';

/** The side-by-side widget as a table, then its takeaways. */
export function compareFallback(page: HowtoPage): string {
    const c = page.compare;
    return `
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table al-table--vs">
<thead><tr><th scope="col">The question</th><th scope="col">${c.themLabel}</th><th scope="col" class="al-us">${c.usLabel}</th></tr></thead>
<tbody>
${c.themes
    .map((t) => `<tr><th scope="row">${t.question}</th><td data-label="${c.themLabel}">${t.them.join(' ')}</td><td data-label="${c.usLabel}" class="al-us">${t.us.join(' ')}</td></tr>`)
    .join('\n')}
</tbody>
</table></div>
<p>${c.themes.map((t) => t.takeaway).join(' ')}</p>`;
}

/** The "what happens when" widget as one short list per situation. */
export function scenariosFallback(page: HowtoPage): string {
    const s = page.scenarios;
    if (!s) return '';
    return s.items
        .map(
            (item) => `<h3>${item.title}</h3>
<ul class="al-list">
${item.lines.map((line, i) => `<li><strong>${s.columns[i]}.</strong> ${line}</li>`).join('\n')}
</ul>`,
        )
        .join('\n');
}

/** The checklist widget as a numbered list with its minutes. */
export function stepsFallback(page: HowtoPage): string {
    const st = page.steps;
    const total = st.items.reduce((a, s) => a + s.minutes, 0);
    return `
<ol class="al-list al-list--num">
${st.items.map((s) => `<li><strong>${s.title} (${s.minutes} min)</strong>${s.detail}</li>`).join('\n')}
</ol>
<p>About ${total} minutes in all. ${st.caption}</p>`;
}

/** The embed generator: the code it writes for a button and a card, and where it goes. */
export function embedFallback(): string {
    const base = { href: EMBED_SAMPLE.link, title: EMBED_SAMPLE.title, facts: EMBED_SAMPLE.facts, button: EMBED_SAMPLE.button, color: EMBED_COLORS[0].hex };
    const code = (s: string) => `<pre><code>${escapeHtml(s)}</code></pre>`;
    return `
<p>The generator takes your test’s link (or a six-digit join code) and writes one of four pieces of HTML: a button, a card with the test’s title and facts, a code box for live exams that points at testoza.com/join, or a QR code. Every one opens the test in a new tab. For the sample link ${EMBED_SAMPLE.link}, the button is:</p>
${code(embedHtml({ ...base, style: 'button' }))}
<p>and the card is:</p>
${code(embedHtml({ ...base, style: 'card' }))}
<p>Both use inline styles only, so they need no stylesheet, no script and no plugin, and look the same on any website builder.</p>`;
}

/** Where to paste the code, as a table. */
export function buildersTable(): string {
    return `
<div class="al-table-wrap"><table class="al-table">
<thead><tr><th scope="col">Website builder</th><th scope="col">Paste the code here</th><th scope="col">The no-code way</th></tr></thead>
<tbody>
${BUILDERS.map((b) => `<tr><th scope="row">${b.name}</th><td data-label="Paste the code">${b.where}</td><td data-label="No code">${b.simple}</td></tr>`).join('\n')}
</tbody>
</table></div>`;
}

/** The paper planner: every pattern with its sections and the settings that copy it. */
export function patternsFallback(): string {
    return PAPER_PATTERNS.map((p) => {
        const q = p.sections.reduce((a, s) => a + s.questions, 0);
        const pace =
            p.timing === 'sections'
                ? p.sections.map((s) => `${s.name}: ${s.questions} questions in ${s.minutes} minutes, about ${secondsEach(s.minutes!, s.questions)} seconds each`).join('; ')
                : `${q} questions in ${p.minutes} minutes, about ${secondsEach(p.minutes, q)} seconds each`;
        return `<h3>${p.name}</h3>
<p>${q} questions, ${p.minutes} minutes, ${p.marks} marks. ${p.marking}. Sections: ${p.sections.map((s) => `${s.name} (${s.questions}${s.note ? `: ${s.note}` : ''})`).join(', ')}. Pace: ${pace}.</p>
<p>In TestoZa: ${p.setup.map((r) => `${r.label}: ${r.value}`).join('; ')}. ${p.lesson}</p>`;
    }).join('\n');
}

/** The four WhatsApp messages, word for word. */
export function messagesFallback(): string {
    return WA_MESSAGES.map(
        (m) => `<h3>${m.label}: ${m.when.toLowerCase()}</h3>
<pre><code>${escapeHtml(m.text)}</code></pre>
<p>Where it comes from: ${m.from}.${m.card ? ` The preview card WhatsApp shows reads “${escapeHtml(m.card.title)}” with “${escapeHtml(m.card.text)}”.` : ''}</p>`,
    ).join('\n');
}
