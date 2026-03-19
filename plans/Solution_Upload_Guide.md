# Testoza Solution Upload Guide 📝

This guide explains how to prepare a JSON file to bulk-upload detailed solutions for your tests. Detailed solutions help students understand their mistakes once they have submitted a test.

## 🧠 Generate Solutions with AI
If you have a PDF, Image, or Word doc with solutions, you can use this prompt with **Google Gemini** or ChatGPT to create your JSON file automatically:

> **Copy and paste this prompt:**
> ```text
> ROLE:
> You are an AI document parser and educational content extractor.
> 
> GOAL:
> Convert the PROVIDED PDF, IMAGE, or TEXT containing EXAM SOLUTIONS into a STRICT, VALID JSON file for bulk uploading.
> 
> RULES:
> 1. RETURN ONLY RAW JSON (No markdown, no talk).
> 2. Use DOUBLE BACKSLASHES (\\) for all LaTeX (e.g., \\frac, \\ce{H2O}).
> 3. Use <br> for line breaks within a solution.
> 4. Maintain the sequential order of questions.
> 
> STRICT JSON FORMAT:
> {
>   "solutions": [
>     "Step-by-step solution for Q1 with KaTeX math...",
>     "Detailed solution for Q2 using \\ce{H2O}...",
>     "..."
>   ]
> }
> 
> FINAL COMMAND:
> Extract solutions from the attached document and output ONLY the JSON snippet.
> ```

---

## 🚀 Two Ways to Structure JSON
You specify solutions in a single `.json` file. There are two ways to structure this file:

### 1. Sequential Array Format (Recommended)
This is the easiest method. You just provide a list of solutions in the **same order as the questions** appear in your test.

> [!NOTE]
> **For Section-Wise Tests**: The order follows questions across all sections (Section 1 Questions → Section 2 Questions → etc.).

**File: `solutions.json`**
```json
{
  "solutions": [
    "Solution for Question 1...",
    "Solution for Question 2...",
    "Solution for Question 3..."
  ]
}
```
*   **How it works**: The first text in the array is mapped to the first question, the second to the second, and so on.
*   **Best for**: Freshly created tests where you have a simple list of solutions.

---

### 2. Explicit ID Mapping Format
If you want to be 100% sure that each solution goes to the correct question (regardless of order or shuffling), use the internal **Question ID**.

**File: `solutions.json`**
```json
{
  "solutions": {
    "q_id_101": "This is the solution for the question with ID 101.",
    "q_id_102": "This is the solution for the question with ID 102."
  }
}
```
*   **How it works**: You map the specific Question ID (found in the Test Builder or Database) to the solution text.
*   **Best for**: Modifying specific questions in large or randomized tests.

---

## 🧪 Advanced Formatting (LaTeX & Chemistry)
Testoza supports full mathematical and chemical rendering using **KaTeX** and **mhchem**.

### Mathematical Formulas
Use `$` for inline math and `$$` for block-level math.
*   **Inline**: `The value of $x$ is 5.`
*   **Block**: `$$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$`

### Chemistry Formulas
Use `\ce{...}` for chemical equations and formulas.
*   **Formula**: `The solution contains $\ce{H2SO4}$.`
*   **Equation**: `$\ce{2H2 + O2 -> 2H2O}$`

---

## 🛠️ How to Upload
1.  Go to your **Creator Dashboard**.
2.  Find the test card you want to update.
3.  Click the **3-dot menu (⋮)** on the card.
4.  Select **Upload Solutions**.
5.  Inside the Solution Editor, click the **Import JSON** button at the top right.
6.  Select your prepared `.json` file.
7.  Review the imported text in the editor.
8.  Click **Save All** to publish the solutions to your students.

---

## 💡 Pro Tips & Troubleshooting
*   **Missing Solutions**: If you don't have a solution for a specific question in an array, use an empty string `""` or `null`. The system will show a "No solution available" placeholder to students.
*   **Encoding**: Ensure your file is saved with **UTF-8** encoding, especially if you use special characters or multilingual text.
*   **Testing**: Use the "Live Preview" toggle in the Solution Editor to see how your LaTeX will look before saving.
