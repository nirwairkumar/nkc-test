/**
 * The crawler text for the four shared "alternative" widgets, built from the same AltRival
 * the React widget reads, so what Google and AI search read matches what a reader sees.
 * The first four guides (Classplus, Teachmint, Kahoot, Testportal) carry their own copies
 * of these; the guides added on 15 October 2026 use this file.
 *
 * Plain TypeScript like the rest of src/guides: the Cloudflare worker imports it.
 */
import { LAB_QUESTION, SCHEMES, mark, type AltRival } from './altData';

/** alt-fit: what the other product is for, what the testing part is, and the three verdicts. */
export const fitFallback = (R: AltRival) => `
<p>What ${R.name} is for: ${R.uses
    .filter((u) => u.kind === 'core')
    .map((u) => u.label.toLowerCase())
    .join('; ')}. The testing part, which an exam platform is for: ${R.uses
    .filter((u) => u.kind === 'exam')
    .map((u) => u.label.toLowerCase())
    .join('; ')}.</p>
<ul class="al-list">
<li><strong>${R.verdicts.keep.title}.</strong> ${R.verdicts.keep.text}</li>
<li><strong>${R.verdicts.split.title}</strong> ${R.verdicts.split.text}</li>
<li><strong>${R.verdicts.switch.title}.</strong> ${R.verdicts.switch.text}</li>
</ul>`;

/** alt-compare: every theme as a table row, then the takeaways. */
export const compareFallback = (R: AltRival) => `
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table al-table--vs">
<thead><tr><th scope="col">The question</th><th scope="col">${R.name}</th><th scope="col" class="al-us">TestoZa</th></tr></thead>
<tbody>
${R.themes
    .map(
        (t) =>
            `<tr><th scope="row">${t.question}</th><td data-label="${R.name}">${t.them.join(' ')}</td><td data-label="TestoZa" class="al-us">${t.us.join(' ')}</td></tr>`,
    )
    .join('\n')}
</tbody>
</table></div>
<p>${R.themes.map((t) => t.takeaway).join(' ')}</p>`;

/** alt-marking, for a product that scores right/wrong with nothing off. */
export const markingFallback = (R: AltRival) => {
    const right = LAB_QUESTION.options.find((o) => o.key === LAB_QUESTION.correct)!.text;
    return `
<p>One physics question (${LAB_QUESTION.text} Answer: ${right}) scored two ways. In ${R.name}: ${R.scoring.rightWhy} ${R.scoring.wrongWhy} In TestoZa the same answer is worth the marks typed on the question: ${SCHEMES.filter((s) => s.wrong)
        .map((s) => `${s.full} +${mark(s.right)} with −${mark(s.wrong)} for a wrong tick`)
        .join(', ')}, or +1 with nothing off for a school test. Under +4/−1, four wrong guesses cancel a correct answer, so a habit of guessing costs real marks.</p>`;
};

/** alt-move: the steps of moving one paper, with the minutes. */
export const moveFallback = (R: AltRival, after = '') => `
<ol class="al-list al-list--num">
${R.steps.map((s) => `<li><strong>${s.title} (${s.minutes} min)</strong> ${s.detail}</li>`).join('\n')}
</ol>
<p>About ${R.steps.reduce((a, s) => a + s.minutes, 0)} minutes for a 30-question paper you already have.${after ? ` ${after}` : ''}</p>`;
