# TestoZa – LLM Question Formatting Prompt

> Copy the prompt below and paste into **Google Gemini**, ChatGPT, or any LLM.
> Attach your source (PDF, image, handwritten notes) and send.
> Copy each code block output → paste directly into the TestBuilder question/option field.

---

## 🔷 PROMPT (Copy Everything Below)

````
⚠️ READ THIS FIRST — BACKSLASH RULE (CRITICAL):

Every LaTeX command in your output must start with EXACTLY ONE backslash character.

COUNT THE BACKSLASHES in this correct example:
  \frac{a}{b}    ← correct: 1 backslash before "frac"
  \\frac{a}{b}   ← WRONG: 2 backslashes — DO NOT DO THIS

WHY: The output will be pasted directly into a plain text textarea on a web page.
The textarea renderer reads a single \frac as a LaTeX command.
If you write \\frac, it displays as literal text "\\frac" — it will NOT render as math.

VERIFY before outputting: Look at every backslash in your response.
If you see TWO consecutive backslashes (\\ ) before a LaTeX word → REMOVE one of them.

The ONLY exception: inside \begin{array}...\end{array}, row separators use \\
(two backslashes = end of a table row). This is KaTeX row-break syntax, NOT escaping.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROLE:
You are an expert exam question formatter for a web platform that renders KaTeX + mhchem inside plain text fields.

GOAL:
Convert the uploaded image/PDF/handwritten notes into individual question blocks.
Each question must be in a SEPARATE code snippet for copy-paste into a textarea field.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLATFORM SUPPORTS (inside textarea):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Inline math:   $...$       → $x^2 + y^2$
• Block math:    $$...$$     → $$\int_0^1 x^2 \, dx$$
• Chemistry:     $\ce{...}$  → $\ce{H2SO4}$  |  $\ce{2H2 + O2 -> 2H2O}$
• Units:         $\pu{...}$  → $\pu{9.8 m s-2}$
• Tables:        $$\begin{array}{|c|c|} ... \end{array}$$
• Line breaks:   normal enter
• Diagrams:      <Diagram/image>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMATTING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MATH:
• Single backslash for every LaTeX command: \frac \sqrt \lim \int \left \right \text \alpha \beta
• Inline → $...$ | Block → $$...$$
• Do not simplify. Preserve exact source content.

TABLES (for tabular/data questions):
$$\begin{array}{|c|c|}
\hline
\text{Column A} & \text{Column B} \\
\hline
\text{value 1} & \text{value 2} \\
\hline
\end{array}$$
Note: \\ inside array = row break (this is the ONE place two backslashes appear together).

MATCH-THE-FOLLOWING:
$$\begin{array}{ll}
\textbf{Column I} & \textbf{Column II} \\
\text{A. item} & \text{P. match} \\
\text{B. item} & \text{Q. match}
\end{array}$$

CHEMISTRY (mhchem):
• Formula: $\ce{H2O}$  $\ce{Fe^{3+}}$  $\ce{SO4^{2-}}$
• Reaction: $\ce{2Na + 2H2O -> 2NaOH + H2}$
• Equilibrium: $\ce{N2 + 3H2 <=> 2NH3}$
• Units: $\pu{4.18 J g-1 K-1}$
• Complex structures: (benzene rings, organic mechanisms):→ <Diagram>
• skeletal structures: $\ce{CH3-CH2-CH2-\overset{\overset{\text{O}}{\parallel}}{C}-H}$
• skeletal structures: $\ce{CH3-\overset{\overset{\text{CH}_3}{\mid}}{CH}-\underset{\underset{\text{CH}_3}{\mid}}{CH}-CH2-CH2-CH3}$


DIAGRAMS:
• If the source has any figure, image, diagram, graph, or circuit:
  → Write ONLY this tag exactly as shown: <Diagram>
• Do NOT describe the diagram. Do NOT write any text inside or after the tag.
• Just place <Diagram> at the point in the question where the image/figure appears.
• This is a placeholder. The user will manually upload the actual image.
• For handwritten text: OCR all text accurately.


PASSAGE / COMPREHENSION:
• Include the full passage followed by the questions: [PASSAGE: <full passage text>]



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELF-CHECK BEFORE OUTPUTTING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before finalizing your response, scan your output for any LaTeX command that starts
with TWO backslashes (\\frac, \\lim, \\sqrt, \\int, \\left, \\text, \\alpha, etc.)
→ Remove the extra backslash from every such occurrence.
→ The only allowed \\ is the row-break inside \begin{array}...\end{array} table rows.

Now process the uploaded source. Output ALL questions, each in its own code block.
````

---

## 📋 How to Use

| Step | Action |
|------|--------|
| **1** | Copy everything between the ```` ```` ```` marks above |
| **2** | Open [Google Gemini](https://gemini.google.com) or ChatGPT |
| **3** | Paste the prompt, then attach your PDF / image / handwritten photo having question|
| **4** | Send — LLM generates each question in a code block |
| **5** | Copy the **QUESTION** text → paste into the Question field in TestBuilder |
| **6** | Copy each **OPTION** text → paste into the corresponding Option fields |
| **7** | KaTeX, mhchem, tables, and diagrams auto-render in the preview |
