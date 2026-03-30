import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { FileText, Download, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Copy, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TestUploadFormatGuideProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function TestUploadFormatGuide({ open: controlledOpen, onOpenChange, trigger }: TestUploadFormatGuideProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  //     const jsonTemplate_old = `ROLE:
  // You are an AI document parser, OCR analyst, and exam-content extractor.

  // GOAL:
  // Convert the PROVIDED PDF or IMAGE into a STRICT, VALID JSON test file.
  // DO NOT generate new questions.
  // ONLY extract and restructure content that exists in the file.

  // CRITICAL BEHAVIOR RULES:
  // - Read the uploaded PDF/Image visually (OCR + layout reasoning).
  // - Identify QUESTIONS, OPTIONS, ANSWERS, and IMAGES based on layout.
  // - If a diagram/image appears immediately before or after a question, attach it to that question.
  // - NEVER hallucinate or invent content.
  // - If something is unclear, infer conservatively from the document layout.
  // - Output ONLY valid JSON. No markdown. No explanations. No comments.

  // --------------------------------------------------
  // DOCUMENT ANALYSIS STEPS (MANDATORY):
  // 1. Detect each question boundary using:
  //    - Question numbers
  //    - Line breaks
  //    - Bullets (Q., 1., 1), etc.
  // 2. For each question:
  //    - Extract full question text
  //    - Detect if it is:
  //      - Single choice
  //      - Multiple choice
  //      - Numerical
  // 3. Extract options (A/B/C/D or similar)
  // 4. Detect correct answers using:
  //    - Answer keys
  //    - Highlighted/marked answers
  //    - End-of-page answer sections
  // 5. Convert all mathematical expressions into LaTeX.
  // 6. Preserve original wording (do NOT rewrite).
  // 7. Attach diagrams/images to the correct question using base64 or URL placeholder.
  // 8. FOR PASSAGE/COMPREHENSION QUESTIONS:
  //    - Extract the passage text ONCE.
  //    - For EVERY question belonging to that passage, include a "passageContent" field.
  //    - Set "passageContent" to the FULL passage text for each question in the group.

  // --------------------------------------------------
  // MATH & FORMATTING RULES:
  // - Use LaTeX for ALL math: \\frac, \\sqrt, \\int, x^2, etc.
  // - Escape ALL backslashes for JSON (\\ instead of \).
  // - Inline math: $...$
  // - Block math: $$...$$
  // - Do NOT simplify expressions.

  // TEXT & LINE-BREAK RULES:
  // - DO NOT use escaped newline characters (\\n) or real line breaks.
  // - Use <br> tags for line breaks in questions and options.
  // - Multi-line questions should use <br> tags to separate lines.
  // - Do NOT use other HTML tags or markdown.

  // --------------------------------------------------
  // STRICT JSON OUTPUT FORMAT (DO NOT CHANGE):
  // {
  //   "title": "Extracted from document or inferred",
  //   "description": "Auto-generated from document content",
  //   "duration": 60,
  //   "marks_per_question": 4,
  //   "negative_marks": 1,
  //   "questions": [
  //     {
  //       "id": 1,
  //       "type": "single | multiple | numerical",
  //       "question": "Exact extracted question text with LaTeX",
  //       "image": "base64_or_url_if_present_else_null",
  //       "options": {
  //         "A": "Option text",
  //         "B": "Option text",
  //         "C": "Option text",
  //         "D": "Option text"
  //       },
  //       "correctAnswer":
  //         "A" |
  //         ["A","C"] |
  //         { "min": 9.8, "max": 10.2 }
  //     }
  //   ]
  // }

  // --------------------------------------------------
  // ANSWER RULES:
  // - Single choice → correctAnswer: "A"
  // - Multiple choice → correctAnswer: ["A","C"]
  // - Numerical → NO options field, only:
  //   { "min": value, "max": value }

  // --------------------------------------------------
  // FAIL-SAFE RULES:
  // - If an image-only question exists → still create a question entry.
  // - If options are missing → infer from alignment or labels.
  // - If answer key exists separately → map carefully to question IDs.
  // - If ANY field is missing → set it to null (never omit keys).
  // - If a question contains multiple statements or expressions,
  //   format them on separate physical lines.
  // - For Passage questions, ensure "passageContent" is IDENTICAL for all questions in the set.

  // --------------------------------------------------
  // FINAL OUTPUT RULE:
  // RETURN ONLY RAW JSON.
  // NO TEXT BEFORE OR AFTER.

  // `;

  //     const jsonTemplateSection_old = `ROLE:
  // You are an AI document parser specialized in multi-section exams.

  // GOAL:
  // Convert the PROVIDED PDF/IMAGE into a VALID JSON test file with MULTIPLE SECTIONS.

  // CRITICAL BEHAVIOR RULES:
  // - Identify SECTION HEADERS (e.g., "Part A: Physics", "Section II").
  // - Group questions under their respective sections.
  // - Identify marking schemes if they differ per section.
  // - Handle PASSAGES/COMPREHENSION:
  //   - If a group of questions shares a passage, include the "passageContent" field in EACH question object.

  // STRICT JSON OUTPUT FORMAT (SECTION MODE):
  // {
  //   "title": "Exam Title",
  //   "description": "Auto-generated",
  //   "duration": 180,
  //   "enable_section_mode": true,
  //   "section_marking_model": "section-wise",
  //   "sections": [
  //     {
  //       "id": "sec_1",
  //       "name": "Physics",
  //       "instructions": "Section instructions...",
  //       "marks_per_question": 4,
  //       "negative_marks": 1,
  //       "questions": [
  //         {
  //           "id": 1,
  //           "type": "single",
  //           "question": "Question text...",
  //           "options": { "A": "...", "B": "..." },
  //           "correctAnswer": "A"
  //         }
  //       ]
  //     },
  //     {
  //       "id": "sec_2",
  //       "name": "English",
  //       "questions": [
  //         {
  //           "id": 10,
  //           "type": "single",
  //           "question": "Theme of the passage?",
  //           "passageContent": "Passage text...",
  //           "options": { "A": "...", "B": "..." },
  //           "correctAnswer": "A"
  //         }
  //       ]
  //     }
  //   ]
  // }
  // --------------------------------------------------
  // FINAL OUTPUT RULE:
  // RETURN ONLY RAW JSON. NO TEXT BEFORE OR AFTER.
  // `;
  const jsonTemplate = `ROLE:
You are an AI document parser, OCR analyst, and exam-content extractor.

-> Give full output in one **code snippet** only.

GOAL:
Convert the PROVIDED PDF or IMAGE into a STRICT, VALID JSON test file.
DO NOT generate new questions.
ONLY extract and restructure content that exists in the file.

--------------------------------------------------

ABSOLUTE OUTPUT RULES

1. RETURN ONLY RAW JSON
2. NO explanation
3. NO markdown formatting
4. NO text before or after JSON
5. JSON must be syntactically valid
6. Question IDs must be sequential integers (1,2,3,...)
7. Deeply scan mathematical syntax before finalizing
8. CRITICAL: Use DOUBLE BACKSLASHES (\\\\) for all LaTeX commands (e.g., use \\\\frac instead of \\frac).

--------------------------------------------------

CRITICAL BEHAVIOR RULES:
- Read the uploaded PDF/Image/Video visually (OCR + layout reasoning).
- Identify QUESTIONS, OPTIONS, ANSWERS, IMAGES, TABLES, and COLUMN STRUCTURES based on layout.
- If a diagram/image appears immediately before or after a question, attach it to that question.
- NEVER hallucinate or invent content.
- If something is unclear, infer conservatively from the document layout.
- Output ONLY valid JSON. No markdown. No explanations. No comments.

--------------------------------------------------

DOCUMENT ANALYSIS STEPS (MANDATORY):

1. Detect each question boundary using:
   - Question numbers
   - Line breaks
   - Bullets (Q., 1., 1), etc.

2. For each question:
   - Extract full question text exactly as written.
   - Detect if it is:
     - Single choice
     - Multiple choice
     - Numerical
     - Match-the-following
     - Table-based

3. Extract options (A/B/C/D or similar).

4. Detect correct answers using:
   - Answer keys
   - Highlighted/marked answers
   - End-of-page answer sections.

5. Convert ALL mathematical expressions into LaTeX.

6. Preserve original wording (do NOT rewrite).

7. Attach diagrams/images to the correct question using base64 or URL placeholder.

8. FOR PASSAGE/COMPREHENSION QUESTIONS:
   - Extract the passage text ONCE.
   - For EVERY question belonging to that passage, include a "passageContent" field.
   - Set "passageContent" to the FULL passage text for each question in the group.

--------------------------------------------------

🔥 TABLE DETECTION RULE (NEW)

If a question contains a table (rows/columns/grid structure):

- Convert the table into KaTeX array format.
- NEVER output HTML table.
- NEVER output markdown table.
- Embed the LaTeX array inside the "question" field.

Example conversion:

Original:

| A | B |
|---|---|
| 1 | 2 |

Convert to:

$$
\\begin{array}{|c|c|}
\\hline
A & B \\\\
\\hline
1 & 2 \\\\
\\hline
\\end{array}
$$

- Use proper column alignment.
- Preserve headers exactly.
- Preserve all table values exactly.
- Do NOT simplify or restructure content.

--------------------------------------------------

🔥 MATCH-THE-FOLLOWING RULE (NEW)

If question is "Match the Following" OR contains two-column pairing:

- Convert the two columns into structured LaTeX array format.
- Keep original numbering/labels.
- Embed inside the "question" field.

Example:

Column I        Column II
A. Apple        1. Fruit
B. Car          2. Vehicle

Convert to:

$$
\\begin{array}{ll}
\\text{Column I} & \\text{Column II} \\\\
A.\\ \\text{Apple} & 1.\\ \\text{Fruit} \\\\
B.\\ \\text{Car} & 2.\\ \\text{Vehicle}
\\end{array}
$$

- Do NOT output as plain text table.
- Do NOT use HTML.
- Always use LaTeX array.

--------------------------------------------------

🔥 MATRIX / COLUMN STRUCTURE RULE (NEW)

If content appears vertically aligned (like vector, matrix, determinant):

Convert to proper LaTeX:

Matrix:
$$
\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
$$

Determinant:
$$
\\begin{vmatrix}
a & b \\\\
c & d
\\end{vmatrix}
$$

Preserve exact structure from document.

--------------------------------------------------

MATH & FORMATTING RULES:

- Use LaTeX for ALL math:
  \\frac, \\sqrt, \\int, x^2, etc.
- CRITICAL: Use DOUBLE BACKSLASHES (\\\\) for all LaTeX commands inside the JSON strings.
- Inline math: $...$
- Block math: $$...$$
- Do NOT simplify expressions.
- Preserve spacing and symbols exactly.

--------------------------------------------------

TEXT & LINE-BREAK RULES:

- DO NOT use escaped newline characters (\\n).
- DO NOT use real line breaks.
- Use <br> tags for line breaks in questions and options.
- Multi-line questions must use <br>.
- Do NOT use other HTML tags.
- Do NOT use markdown formatting.

--------------------------------------------------

STRICT JSON OUTPUT FORMAT (DO NOT CHANGE):

{
  "title": "Extracted from document or inferred",
  "description": "Auto-generated from document content",
  "duration": 60,
  "marks_per_question": 4,
  "negative_marks": 1,
  "questions": [
    {
      "id": 1,
      "type": "single | multiple | numerical",
      "question": "Exact extracted question text with LaTeX",
      "image": "base64_or_url_if_present_else_null",
      "options": {
        "A": "Option text",
        "B": "Option text",
        "C": "Option text",
        "D": "Option text"
      },
      "correctAnswer":
        "A" |
        ["A","C"] |
        { "min": 9.8, "max": 10.2 },
      "passageContent": null
    }
  ]
}

--------------------------------------------------

ANSWER RULES:

- Single choice → correctAnswer: "A"
- Multiple choice → correctAnswer: ["A","C"]
- Numerical → NO options field, only:
  { "min": value, "max": value }

--------------------------------------------------

FAIL-SAFE RULES:

- If an image-only question exists → still create a question entry.
- If options are missing → infer from alignment or labels.
- If answer key exists separately → map carefully to question IDs.
- If ANY field is missing → set it to null (never omit keys).
- If a question contains multiple statements or expressions,
  format them using <br>.
- For Passage questions, ensure "passageContent" is IDENTICAL for all questions in the set.
- If table or match structure is unclear, preserve structure using LaTeX array format.

--------------------------------------------------

STRICT VALIDATION BEFORE OUTPUT

Internally verify:

✔ IDs sequential integers
✔ No duplicate IDs
✔ Single → string correctAnswer
✔ Multiple → array correctAnswer
✔ Numerical → object correctAnswer
✔ Valid JSON

--------------------------------------------------

FINAL COMMAND

Deep scan entire document.
Pay special attention to:
• Mathematical syntax
• Tables
• Match-the-following
• Comprehension blocks
• Mixed question types

Return ONLY RAW JSON.`;

  //------section wise questions 2.0-------->
  //   const jsonTemplateSection = `ROLE:
  // You are a high-precision AI exam parser specialized in complex multi-section competitive exams (JEE/NEET/GATE/SSC/UPSC style).

  // -> Give full output in one **code snippet** only.

  // GOAL:
  // Convert the PROVIDED PDF/IMAGE/TEXT into a STRICTLY VALID JSON test file that exactly matches the required structure.

  // The platform supports:
  // • Mixed question types inside same section
  // • Section fallback marking
  // • Per-question marking override
  // • Comprehension groups using groupId
  // • KaTeX + Markdown rendering
  // • Mathematical expressions
  // • Tables
  // • Match-the-following
  // • Optional images
  // • Numerical range answers

  // --------------------------------------------------

  // ABSOLUTE OUTPUT RULES

  // 1. RETURN ONLY RAW JSON
  // 2. NO explanation
  // 3. NO markdown formatting
  // 4. NO text before or after JSON
  // 5. JSON must be syntactically valid
  // 6. DO NOT include keys if their value is null or truly absent
  // 7. Question IDs must be sequential integers (1,2,3,...)
  // 8. Deeply scan mathematical syntax before finalizing
  // 9. CRITICAL: Use DOUBLE BACKSLASHES (\\\\) for all LaTeX commands (e.g., use \\\\frac instead of \\frac).

  // FILE STRUCTURE
  // {
  //   "title": "write relevant title",     
  //   "description": "write relevant description",     
  //   "maxMarks": "", 
  //   "duration": "analyse and find total duration of exam in minutes",
  //   "sections": [...]
  // }


  // SECTION STRUCTURE

  // Each section must follow:

  // {
  //   "id": "section-1",
  //   "name": "Section Name",
  //   "questions": [...],
  // }

  // NOTE:
  // question_type is only a default hint.
  // Each question must independently detect its correct type.

  // --------------------------------------------------

  // QUESTION OBJECT STRUCTURE

  // Each question must follow:

  // {
  //   "id": 1,
  //   "type": "single | multiple | numerical",
  //   "question": "Exact extracted text (KaTeX preserved)",
  //   "marks": "2",
  //   "negativeMarks": "0",
  //   "groupId": "",
  //   "options": {...},
  //   "correctAnswer": ...,
  //   "passageContent": ""
  // }

  // --------------------------------------------------

  // QUESTION TYPE DETECTION (MANDATORY)

  // Detect automatically:

  // "type": "single"
  // → exactly one correct option

  // "type": "multiple"
  // → more than one correct option OR instruction like:
  //    - Select all correct
  //    - Choose correct statements

  // "type": "numerical"
  // → No options OR integer/decimal answer required

  // NEVER default all questions to single.

  // --------------------------------------------------

  // MARKING RULES

  // ✔ "marks"
  // - Always include
  // - Must be string
  // - If not given per question → inherit from section

  // ✔ "negativeMarks"
  // - Always include
  // - Must be string
  // - If not given → inherit from section

  // --------------------------------------------------

  // GROUPING RULE (COMPREHENSION)

  // If multiple questions share a passage:

  // - Assign SAME groupId (e.g., "grp1")
  // - Include SAME passageContent inside each question
  // - If not comprehension:
  //     groupId = ""
  //     passageContent = ""

  // These two keys must ALWAYS exist.

  // --------------------------------------------------

  // IMAGE RULES

  // If question contains image:
  //     include "image": "base64_or_image-true"

  // If no image:
  //     DO NOT include "image" key

  // If any option contains image:
  //     include "optionImages": { ... }

  // If no option images:
  //     DO NOT include "optionImages"

  // --------------------------------------------------

  // OPTIONS RULE

  // For single & multiple:
  //     "options": {
  //       "A": "Exact extracted text (KaTeX preserved)",
  //       "B": "Exact extracted text (KaTeX preserved)",
  //       "C": "Exact extracted text (KaTeX preserved)",
  //       "D": "Exact extracted text (KaTeX preserved)"
  //     }

  // For numerical:
  //     Provide empty options structure:
  //     "options": {
  //       "A": "",
  //       "B": "",
  //       "C": "",
  //       "D": ""
  //     }

  // --------------------------------------------------

  // CORRECT ANSWER FORMAT

  // Single:
  //     "correctAnswer": "C"

  // Multiple:
  //     "correctAnswer": ["A","B"]

  // Numerical:
  //     "correctAnswer": { "min": 3, "max": 3 }

  // --------------------------------------------------

  // MATHEMATICAL EXPRESSION RULES

  // 1. Deeply scan for:
  //    • Fractions
  //    • Integrals
  //    • Limits
  //    • Summations
  //    • Roots
  //    • Powers
  //    • Matrices
  //    • Greek letters
  //    • Subscripts
  //    • Superscripts

  // 2. Convert to KaTeX-compatible LaTeX.

  // 3. Do NOT simplify.

  // 4. Preserve symbols exactly.

  // 5. Example:
  // √(x^2 + y^2)
  // → "$\\sqrt{x^2 + y^2}$"

  // --------------------------------------------------

  // 🔥 TABLE DETECTION RULE (CRITICAL)

  // If a question contains a TABLE or tabular data:

  // You MUST convert it into KaTeX array format.

  // Example conversion:

  // Original table:

  // | A | B |
  // |---|---|
  // | 1 | 2 |
  // | 3 | 4 |

  // Convert to:
  // $$
  // \\begin{array}{|c|c|}
  // \\hline
  // A & B \\\\
  // \\hline
  // 1 & 2 \\\\
  // 3 & 4 \\\\
  // \\hline
  // \\end{array}
  // $$

  // Embed this directly inside the "question" string.

  // NEVER output HTML table.
  // NEVER output raw markdown table.

  // Always convert to LaTeX array environment.

  // --------------------------------------------------

  // 🔥 MATCH-THE-FOLLOWING RULE

  // If question is "Match the Following" OR has two columns:

  // Convert into structured KaTeX format:

  // Example:

  // Column I      Column II
  // A. Apple      1. Fruit
  // B. Car        2. Vehicle

  // Convert to:
  // $$
  // \\begin{array}{ll}
  // \\text{Column I} & \\text{Column II} \\\\
  // A.\\ \\text{Apple} & 1.\\ \\text{Fruit} \\\\
  // B.\\ \\text{Car} & 2.\\ \\text{Vehicle}
  // \\end{array}
  // $$

  // Embed this inside the question text.

  // DO NOT output HTML.
  // DO NOT output plain text table.

  // Always use LaTeX array.

  // --------------------------------------------------

  // STRICT VALIDATION BEFORE OUTPUT

  // Internally verify:

  // ✔ IDs sequential integers
  // ✔ No duplicate IDs
  // ✔ Single → string correctAnswer
  // ✔ Multiple → array correctAnswer
  // ✔ Numerical → object correctAnswer
  // ✔ groupId consistent for comprehension
  // ✔ No null fields written
  // ✔ Valid JSON

  // --------------------------------------------------

  // FINAL COMMAND

  // Deep scan entire document.
  // Pay special attention to:
  // • Mathematical syntax
  // • Tables
  // • Match-the-following
  // • Comprehension blocks
  // • Mixed question types
  // -> Give full output in ONLY RAW JSON in one **code snippet** only.
  // `;

  const jsonTemplateSection = `ROLE:
You are a high-precision AI exam parser specialized in complex multi-section competitive exams (JEE/NEET/GATE/SSC/UPSC style).

-> Give full output in one **code snippet** only.

GOAL:
Convert the PROVIDED PDF/IMAGE/TEXT into a STRICTLY VALID JSON test file that exactly matches the required structure.

The platform supports:
• Mixed question types inside same section
• Section fallback marking
• Per-question marking override
• Comprehension groups using groupId
• KaTeX + Markdown rendering
• Mathematical expressions
• Tables
• Match-the-following
• Optional images
• Numerical range answers

--------------------------------------------------

ABSOLUTE OUTPUT RULES

1. RETURN ONLY RAW JSON
2. NO explanation
3. NO markdown formatting
4. NO text before or after JSON
5. JSON must be syntactically valid
6. DO NOT include keys if their value is null or truly absent
7. Question IDs must be sequential integers (1,2,3,...)
8. Deeply scan mathematical syntax before finalizing
9. CRITICAL: Use DOUBLE BACKSLASHES (\\) for all LaTeX commands (e.g., use \\frac instead of \frac).

FILE STRUCTURE
{
  "title": "write relevant title",     
  "description": "write relevant description",     
  "maxMarks": "", 
  "duration": "analyse and find total duration of exam in minutes",
  "sections": [...]
}


SECTION STRUCTURE

Each section must follow:

{
  "id": "section-1",
  "name": "Section Name",
  "questions": [...],
}

NOTE:
question_type is only a default hint.
Each question must independently detect its correct type.

--------------------------------------------------

QUESTION OBJECT STRUCTURE

Each question must follow:

{
  "id": 1,
  "type": "single | multiple | numerical",
  "question": "Exact extracted text (KaTeX preserved)",
  "marks": "2",
  "negativeMarks": "0",
  "groupId": "",
  "options": {...},
  "correctAnswer": ...,
  "passageContent": ""
}

--------------------------------------------------

QUESTION TYPE DETECTION (MANDATORY)

Detect automatically:

"type": "single"
→ exactly one correct option

"type": "multiple"
→ more than one correct option OR instruction like:
   - Select all correct
   - Choose correct statements

"type": "numerical"
→ No options OR integer/decimal answer required

NEVER default all questions to single.

--------------------------------------------------

MARKING RULES

✔ "marks"
- Always include
- Must be string
- If not given per question → inherit from section

✔ "negativeMarks"
- Always include
- Must be string
- If not given → inherit from section

--------------------------------------------------

GROUPING RULE (COMPREHENSION)

If multiple questions share a passage:

- Assign SAME groupId (e.g., "grp1")
- Include SAME passageContent inside each question
- If not comprehension:
    groupId = ""
    passageContent = ""

These two keys must ALWAYS exist.

--------------------------------------------------

IMAGE RULES

If question contains image:
    include "image": "base64_or_image-true"

If no image:
    DO NOT include "image" key

If any option contains image:
    include "optionImages": { ... }

If no option images:
    DO NOT include "optionImages"

--------------------------------------------------

OPTIONS RULE

For single & multiple:
    "options": {
      "A": "Exact extracted text (KaTeX preserved)",
      "B": "Exact extracted text (KaTeX preserved)",
      "C": "Exact extracted text (KaTeX preserved)",
      "D": "Exact extracted text (KaTeX preserved)"
    }

For numerical:
    Provide empty options structure:
    "options": {
      "A": "",
      "B": "",
      "C": "",
      "D": ""
    }

--------------------------------------------------

CORRECT ANSWER FORMAT

Single:
    "correctAnswer": "C"

Multiple:
    "correctAnswer": ["A","B"]

Numerical:
    "correctAnswer": { "min": 3, "max": 3 }

--------------------------------------------------

MATHEMATICAL EXPRESSION RULES

1. Deeply scan for:
   • Fractions
   • Integrals
   • Limits
   • Summations
   • Roots
   • Powers
   • Matrices
   • Greek letters
   • Subscripts
   • Superscripts

2. Convert to KaTeX-compatible LaTeX.

3. Do NOT simplify.

4. Preserve symbols exactly.

5. Example:
√(x^2 + y^2)
→ "$\sqrt{x^2 + y^2}$"

--------------------------------------------------

🔥 TABLE DETECTION RULE (CRITICAL)

If a question contains a TABLE or tabular data:

You MUST convert it into KaTeX array format.

Example conversion:

Original table:

| A | B |
|---|---|
| 1 | 2 |
| 3 | 4 |

Convert to:
$$
\begin{array}{|c|c|}
\hline
A & B \\
\hline
1 & 2 \\
3 & 4 \\
\hline
\end{array}
$$

Embed this directly inside the "question" string.

NEVER output HTML table.
NEVER output raw markdown table.

Always convert to LaTeX array environment.

--------------------------------------------------
Line break:
if no LaTeX/KaTeX format used in any particular text area, then use visible line break.
if LaTeX/KaTex format used in any particular text area, then use </br> for line break

--------------------------------------------------

🔥 MATCH-THE-FOLLOWING RULE

If question is "Match the Following" OR has two columns:

Convert into structured KaTeX format:

Example:

Column I      Column II
A. Apple      1. Fruit
B. Car        2. Vehicle

Convert to:
$$
\begin{array}{ll}
\text{Column I} & \text{Column II} \\
A.\ \text{Apple} & 1.\ \text{Fruit} \\
B.\ \text{Car} & 2.\ \text{Vehicle}
\end{array}
$$

Embed this inside the question text.

DO NOT output HTML.
DO NOT output plain text table.

Always use LaTeX array.

--------------------------------------------------

STRICT VALIDATION BEFORE OUTPUT

Internally verify:

✔ IDs sequential integers
✔ No duplicate IDs
✔ Single → string correctAnswer
✔ Multiple → array correctAnswer
✔ Numerical → object correctAnswer
✔ groupId consistent for comprehension
✔ No null fields written
✔ Valid JSON

--------------------------------------------------

FINAL COMMAND

Deep scan entire document.
Pay special attention to:
• Mathematical syntax
• Tables
• Match-the-following
• Comprehension blocks
• Mixed question types
-> Give full output in ONLY RAW JSON in one **code snippet** only.
-----------------------------------------
question id should same as question number. analyse question and make is perfect and complete without any skipping.

--------------------------------------------------

CHEMISTRY & SCIENTIFIC NOTATION RULES

The platform supports KaTeX + mhchem.

When converting chemistry content:

1. Chemical formulas must use mhchem inside KaTeX.

Examples:
H2SO4 → "$\\ce{H2SO4}$"
Fe3+ → "$\\ce{Fe^3+}$"
SO4^2- → "$\\ce{SO4^2-}$"

2. Chemical reactions must use mhchem arrows.

Example:
2Na + 2H2O → 2NaOH + H2

Convert to:
"$\\ce{2Na + 2H2O -> 2NaOH + H2}$"

3. Structural formulas (organic chains) must use mhchem when possible.

Example:
CH3-CH=CH-CO-CH3  
→ "$\\ce{CH3-CH=CH-CO-CH3}$"
$\ce{CH3-CH=CH-\overset{O}{\overset{||}{C}}-CH3}$
4. Units must use the "\pu{ }" syntax.

Example:
4.18 J g⁻¹ K⁻¹  
→ "$\\pu{4.18 J g-1 K-1}$"

5. If a question contains complex chemical diagrams such as:
• benzene rings  
• Haworth projections  
• resonance structures  
• skeletal organic structures  
• reaction mechanisms  

DO NOT convert them to LaTeX.

Instead mark them as images using:

"image": "image-true"

or

"optionImages": { ... }

--------------------------------------------------
question id same as question number
-> Give full output in ONLY RAW JSON in one **code snippet** only.
->each question should have different id (you can go sequencely).
-> consider only english part. scan each question, and extract the same without any change.
->reverify each question/options until adjectly same as question paper.
-> remove [cite:$$$] then add in json.
-> you must match the answer from solution pdf correctly.`;

  const jsonTemplateSectionAddon = `--------------------------------------------------

🔥 ADD-ON: SECTION ATTEMPT CONTROL RULE (CRITICAL)

The document might contain instructions restricting how many questions a student is allowed to attempt within a section (e.g., "Attempt any 5 out of 10 questions").

You MUST detect such language in the section instructions and configure the "attempt_control" object within the SECTION.

The structure of the "attempt_control" object must be exactly as follows:

"attempt_control": {
  "enabled": true,
  "mode": "hard | soft",
  "max_attempts": <integer>,
  "soft_type": "first_n | best_n"
}

Attempt Control Sub-Fields:
- "enabled": (boolean) true if attempt limits exist for the section. False otherwise.
- "mode": "hard" (blocks UI submission/preventing users from selecting more than max_attempts limit) OR "soft" (allows answering more, but penalizes or filters out answers). Default to "hard" if the exam instruction explicitly forbids answering more. Default to "soft" if the exam states "only first N will be evaluated".
- "max_attempts": (integer) The number of questions the student is allowed to attempt in this section.
- "soft_type": "first_n" (used when mode is "soft" and only the first N chronologically answered questions are considered except it is mentioned in instructions that best N answers will be considered).

Behaviors:
1. "Attempt any 5 out of 10" -> "enabled": true, "mode": "hard", "max_attempts": 5.
2. "Only the first 10 questions attempted will be evaluated" -> "enabled": true, "mode": "soft", "max_attempts": 10, "soft_type": "first_n".
3. If no such constraints are mentioned for a section, omit the "attempt_control" object entirely or set "enabled": false.

EXAMPLE IN SECTION JSON:
{
  "id": "section-2",
  "name": "Chemistry - Section B",
  "instructions": "Attempt any 10 questions out of the given 15.",
  "attempt_control": {
    "enabled": true,
    "mode": "hard",
    "max_attempts": 10
  },
  "questions": [ ... ]
}

Check every section's header or overall syllabus instructions to determine if attempt_control should be attached.

-> Give full output in one **code snippet** only.`;

  const handleDownload = () => {
    const blob = new Blob([jsonTemplate], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_test_template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : controlledOpen === undefined ? (
        <DialogTrigger asChild>
          <Button variant="link" className="text-xs text-muted-foreground h-auto p-0 underline decoration-dashed underline-offset-4 hover:text-primary">
            format the file. (Guide)
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-6 w-6 text-blue-600" />
            Upload Guide
          </DialogTitle>
          <DialogDescription className="text-base">
            Follow these 4 simple steps to upload tests in bulk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">

          {/* Step 1: Generate with AI */}
          <div className="flex gap-4">
            <div className="flex-none w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">1</div>
            <div className="space-y-3 flex-1">
              <h3 className="font-semibold text-lg text-purple-700">Generate with AI</h3>
              <p className="text-sm text-muted-foreground">
                Paste this prompt into <strong className="text-blue-600 dark:text-blue-400">Google Gemini</strong> (Recommended) or ChatGPT / Perplexity to create your file automatically.
              </p>

              <div className="relative group">
                <Tabs defaultValue="flat" className="w-full">
                  <TabsList className="mb-2 grid w-full grid-cols-2">
                    <TabsTrigger value="flat">Standard (Flat)</TabsTrigger>
                    <TabsTrigger value="section">Section-Wise</TabsTrigger>
                  </TabsList>

                  <TabsContent value="flat" className="mt-0">
                    <div className="relative">
                      <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono max-h-[300px] overflow-y-auto whitespace-pre-wrap border border-slate-800">
                        {jsonTemplate.trim()}
                      </pre>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2 opacity-90 hover:opacity-100 h-8"
                        onClick={() => {
                          navigator.clipboard.writeText(jsonTemplate.trim());
                          toast.success("Standard Prompt copied!");
                        }}
                      >
                        <Copy className="h-3 w-3 mr-2" /> Copy Prompt
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="section" className="mt-0">
                    <div className="flex flex-col gap-4">
                      {/* Base Section Prompt */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-slate-700">1. Main Base Prompt</h4>
                        </div>
                        <div className="relative">
                          <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono max-h-[300px] overflow-y-auto whitespace-pre-wrap border border-slate-800">
                            {jsonTemplateSection.trim()}
                          </pre>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="absolute top-2 right-2 opacity-90 hover:opacity-100 h-8"
                            onClick={() => {
                              navigator.clipboard.writeText(jsonTemplateSection.trim());
                              toast.success("Section Prompt copied!");
                            }}
                          >
                            <Copy className="h-3 w-3 mr-2" /> Copy Prompt
                          </Button>
                        </div>
                      </div>

                      {/* Add-on Prompt */}
                      <div>
                        <div className="flex items-center justify-between mb-2 mt-2">
                          <div>
                            <h4 className="text-sm font-semibold text-purple-700">2. Add-on Prompt (Optional)</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">Append this if exams enforce section attempt controls (e.g. "Attempt any 5 out of 10").</p>
                          </div>
                        </div>
                        <div className="relative">
                          <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono max-h-[200px] overflow-y-auto whitespace-pre-wrap border border-slate-800">
                            {jsonTemplateSectionAddon.trim()}
                          </pre>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="absolute top-2 right-2 opacity-90 hover:opacity-100 h-8"
                            onClick={() => {
                              navigator.clipboard.writeText(jsonTemplateSectionAddon.trim());
                              toast.success("Add-on Prompt copied!");
                            }}
                          >
                            <Copy className="h-3 w-3 mr-2" /> Copy Add-on
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Step 2: Upload Source to AI */}
          <div className="flex gap-4">
            <div className="flex-none w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">2</div>
            <div className="space-y-2 flex-1">
              <h3 className="font-semibold text-lg text-purple-700 flex items-center gap-2">
                Upload Source to AI
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Gemini Recommended</span>
              </h3>
              <p className="text-sm text-muted-foreground">
                Go to <strong className="text-blue-600 dark:text-blue-400">Google Gemini</strong>, ChatGPT, or Perplexity. Paste the prompt, then <strong>upload your PDF, Image, or Video</strong> that you want to create a test from.
              </p>
              <div className="flex gap-2 mt-2">
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">PDF</span>
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">Images</span>
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">Notes</span>
              </div>
            </div>
          </div>

          {/* Step 3: Save the JSON */}
          <div className="flex gap-4">
            <div className="flex-none w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">3</div>
            <div className="space-y-4 flex-1">
              <h3 className="font-semibold text-lg">Save the AI Output as a JSON File</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 space-y-3 bg-white">
                  <h4 className="font-medium text-blue-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Option A: Quick Online Editor
                  </h4>
                  <p className="text-sm text-muted-foreground">No coding tools needed. Easiest for most users.</p>
                  <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                    <li>Visit <a href="https://jsoneditoronline.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">jsoneditoronline.org</a></li>
                    <li><strong>Paste</strong> the structured output from AI.</li>
                    <li>Click <strong>Save</strong> (disk icon) to download it to your PC.</li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4 space-y-3 bg-white">
                  <h4 className="font-medium text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Option B: Offline editing
                  </h4>
                  <p className="text-sm text-muted-foreground">Download our blank template file and paste the AI output directly into it using a text editor (e.g. Notepad).</p>
                  <Button onClick={handleDownload} variant="outline" size="sm" className="w-full gap-2 mt-2 border-dashed">
                    <Download className="h-4 w-4" /> Download Template
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Upload It */}
          <div className="flex gap-4">
            <div className="flex-none w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">4</div>
            <div className="space-y-2 flex-1">
              <h3 className="font-semibold text-lg">Upload to Editor</h3>
              <p className="text-sm text-muted-foreground">Click the <strong>Upload JSON File</strong> button or drag and drop your newly saved `.json` file to instantly build your test.</p>
            </div>
          </div>


          {/* --- DETAILED SECTION (Collapsible) --- */}
          <div className="border-t pt-6">
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full space-y-2">
              <div className="flex items-center justify-between space-x-4 px-4">
                <h4 className="text-sm font-semibold">Need more details? (Full Documentation)</h4>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="sr-only">Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-sm space-y-6">

                  <div>
                    <h5 className="font-bold mb-2">1. Standard File Structure (Flat)</h5>
                    <p className="text-muted-foreground mb-2">The standard JSON file contains a single object with a questions array at the root.</p>
                    <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono overflow-x-auto">
                      {`{
  "title": "Required: Test Title",
  "description": "Optional: Short description",
  "duration": 30,            // Duration in minutes
  "marks_per_question": 4,   // Default marks for correct answer
  "negative_marks": 1,       // Default deduction for wrong answer
  "questions": [
    // Array of Question objects (see below)
  ]
}`}
                    </pre>
                  </div>

                  <div>
                    <h5 className="font-bold mb-2">2. Section-Wise File Structure</h5>
                    <p className="text-muted-foreground mb-2">For multi-section exams, use a sections array instead of keeping questions at the root.</p>
                    <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono overflow-x-auto">
                      {`{
  "title": "Required: Test Title",
  "duration": 180,
  "sections": [
    {
      "id": "section-1",
      "name": "Physics",
      "instructions": "Section instructions (Optional)",
      "questions": [
        // Array of Question objects for Physics
      ]
    }
  ]
}`}
                    </pre>
                  </div>

                  <div>
                    <h5 className="font-bold mb-2">3. Question Object Types</h5>
                    <p className="text-muted-foreground mb-2">Each question can be <code>single</code>, <code>multiple</code>, or <code>numerical</code>.</p>
                    <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono overflow-x-auto">
                      {`// Single Choice
{
  "id": 1, 
  "type": "single",
  "question": "What is the capital of India?",
  "options": { "A": "Mumbai", "B": "New Delhi", "C": "Kolkata", "D": "Chennai" },
  "correctAnswer": "B"
}

// Multiple Choice (Checkbox)
{
  "id": 2,
  "type": "multiple",
  "question": "Which are prime numbers?",
  "options": { "A": "2", "B": "4", "C": "5", "D": "9" },
  "correctAnswer": ["A", "C"], // Array of correct options
}

// Numerical (Range)
{
  "id": 3,
  "type": "numerical",
  "question": "Value of Pi up to 2 decimals?",
  "correctAnswer": { "min": 3.14, "max": 3.14 } // Use empty "options": {}
}`}
                    </pre>
                  </div>

                  <div>
                    <h5 className="font-bold mb-2">4. Image & Comprehension Questions</h5>
                    <p className="text-muted-foreground mb-2">Attach images as specific keys, and link passage groups using <code>groupId</code> or <code>passageContent</code>.</p>
                    <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono overflow-x-auto">
                      {`{
  "id": 4,
  "type": "single",
  "question": "Identify this logo:",
  "image": "https://example.com/logo.png", // or base64
  "options": { "A": "Apple", "B": "Google" },
  "optionImages": { "A": "base64_string_here..." }, // Optional option images
  "passageContent": "Full Passage shared between questions...",
  "groupId": "passage_grp_1",
  "correctAnswer": "A"
}`}
                    </pre>
                  </div>

                  <div>
                    <h5 className="font-bold mb-2">5. Advanced Formatting (KaTeX & Tables)</h5>
                    <p className="text-muted-foreground mb-2">The platform fully supports KaTeX for math. Tables and "Match-the-following" grids should also be built using KaTeX arrays.</p>
                    <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono overflow-x-auto">
                      {`{
  "id": 5,
  "type": "single",
  "question": "Solve the integral: $$\\int_{0}^{1} x^{2} dx$$ <br><br> Match the columns:<br> $$ \\\\begin{array}{|c|c|} \\\\hline A & 1 \\\\\\\\ \\\\hline B & 2 \\\\\\\\ \\\\hline \\\\end{array} $$",
  "options": { "A": "1/3", "B": "1/2" },
  "correctAnswer": "A",
  "marks": "4",          // Override section defaults per question
  "negativeMarks": "1"
}`}
                    </pre>
                  </div>

                  <div>
                    <h5 className="font-bold mb-2">6. Advanced Attempt Controls</h5>
                    <p className="text-muted-foreground mb-2">In section-wise tests, you can restrict how many questions a student can attempt per section using <code>attempt_control</code>.</p>
                    <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono overflow-x-auto">
                      {`{
  "id": "section-2",
  "name": "Chemistry",
  "instructions": "Attempt any 5 questions out of 10.",
  "attempt_control": {
    "enabled": true,
    "mode": "hard",           // "hard" blocks answering more, "soft" only evaluates first N
    "max_attempts": 5,        // Max allowed questions
    "soft_type": "first_n"    // if mode is "soft"
  },
  "questions": [ ... ]
}`}
                    </pre>
                  </div>

                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
