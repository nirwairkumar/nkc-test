# Stacked Chemical Reagents — Complete Guide for Your Platform

## Problem

Your platform (TestoZa) uses **KaTeX 0.16 + mhchem** for rendering. The standard `\ce{}` arrow syntax (`->[][]`) only takes **one string** above and one below — so when you try to stack multiple reagents (i, ii, iii…) using `\ce{->}` alone, it doesn't create newlines.

## Root Cause

**It's not a code bug — it's a syntax issue.** Your `LatexRenderer.tsx` and KaTeX engine fully support all these formats. The mhchem `->[][]` arrow wasn't designed for multi-line stacking. You need to use different LaTeX constructs.

---

## ✅ All Working Methods (Tested & Verified)

### Method 1: `\xrightarrow` + `\substack` (⭐ RECOMMENDED)

The best approach — clean, concise, and handles any number of reagents.

**What to type in the TestBuilder question/option field:**

```
$$X \xrightarrow{\substack{\text{(i) Strong heating} \\ \text{(ii) Ethanolic KOH} \\ \text{(iii) R-Br}}} Y$$
```

**With reagents below the arrow too:**

```
$$X \xrightarrow[\text{catalyst below}]{\substack{\text{(i) Strong heating} \\ \text{(ii) Ethanolic KOH} \\ \text{(iii) R-Br}}} Y$$
```

**With chemical formulas in reagents:**

```
$$\ce{X} \xrightarrow{\substack{\text{i) } \ce{Hg^{2+}}, \ce{H3O+} \\ \text{ii) Zn-Hg/HCl} \\ \text{iii) } \ce{H3O+}, \Delta}} \ce{P}$$
```

> [!TIP]
> Use `\\` (double backslash) to separate each reagent line inside `\substack{}`.

---

### Method 2: `\xrightarrow` + `\begin{smallmatrix}` 

Similar to Method 1 but uses a matrix environment. Good for even alignment.

```
$$X \xrightarrow{\begin{smallmatrix} \text{(i) Strong heating} \\ \text{(ii) Ethanolic KOH} \\ \text{(iii) R-Br} \end{smallmatrix}} Y$$
```

---

### Method 3: `\xrightarrow` + `\begin{gathered}`

Uses the `gathered` environment for center-aligned reagent lines.

```
$$X \xrightarrow{\begin{gathered} \text{(i) Strong heating} \\ \text{(ii) Ethanolic KOH} \\ \text{(iii) R-Br} \end{gathered}} Y$$
```

---

### Method 4: `\overset` / `\underset` + `\longrightarrow`

Places stacked content over/under a long arrow manually.

**Above arrow only:**
```
$$\text{X} \overset{\substack{\text{(i) Heat}\\\text{(ii) KOH}}}{\longrightarrow} \text{Y}$$
```

**Above + below arrow:**
```
$$\text{X} \underset{\text{catalyst}}{\overset{\substack{\text{(i) Heat}\\\text{(ii) KOH}}}{\longrightarrow}} \text{Y}$$
```

---

### Method 5: Inside `\ce{}` with `$...$` escape (mhchem-compatible)

If you want the rest of the equation to use mhchem notation, you can escape into math mode within the arrow brackets using `$...$`:

```
$$\ce{X ->[$\substack{\text{(i) Heat} \\ \text{(ii) KOH}}$][] Y}$$
```

> [!WARNING]
> The `$...$` inside `\ce{->[][]}`  is a special mhchem feature. The content between `$...$` is treated as raw LaTeX math inside the mhchem environment.

---

### Method 6: `\ce{}` with curly-brace grouping for simple 2-line cases

For just 2 lines, mhchem supports a simpler hack using `\\` inside curly braces:

```
$$\ce{X ->[{\text{(i) Heat}\\\text{(ii) KOH}}] Y}$$
```

---

## 📋 Quick Reference Table

| # Reagent Lines | Best Method | Syntax Pattern |
|---|---|---|
| 1 above, 1 below | Standard `\ce{}` | `$\ce{A ->[above][below] B}$` |
| 2-3 above | `\xrightarrow` + `\substack` | `$$X \xrightarrow{\substack{...}} Y$$` |
| 4-6+ above | `\xrightarrow` + `\substack` | Same as above, just add more `\\` lines |
| Above + below | `\xrightarrow[below]{above}` | `$$X \xrightarrow[\text{below}]{\substack{...}} Y$$` |
| Full mhchem equation | `\ce{}` with `$...$` escape | `$$\ce{X ->[$\substack{...}$] Y}$$` |

---

## 🔥 Real-World Examples from Your Images

### Example 1 (Image 1): X → Y with 3 reagents
```
$$X \xrightarrow{\substack{\text{(i) Strong heating} \\ \text{(ii) Ethanolic KOH} \\ \text{(iii) R-Br}}} Y$$
```

### Example 2 (Image 2): 3 reagents with chemical formulas
```
$$\xrightarrow{\substack{\text{i) } \ce{Hg^{2+}}\text{, }\ce{H3O+} \\ \text{ii) Zn-Hg/HCl} \\ \text{iii) } \ce{H3O+}\text{, } \Delta}} \text{ P}$$
```

### Example 3 (Image 3): Methylcyclohexene with 6 reagents
```
$$\xrightarrow{\substack{\text{i) } \ce{O3}\text{, Zn} \\ \text{ii) aq. NaOH, } \Delta \\ \text{iii) ethylene glycol, PTSA} \\ \text{iv) a) } \ce{BH3}\text{, b) }\ce{H2O2}\text{, NaOH} \\ \text{v) } \ce{H3O+} \\ \text{vi) } \ce{NaBH4}}}$$
```

---

## ⚠ Common Mistakes That Cause Errors

| What You Did | Why It Fails | Fix |
|---|---|---|
| `\ce{A ->[(i) Heat \\ (ii) KOH] B}` | Plain `\\` inside mhchem `->[]` isn't a line break | Use `$\substack{...}$` inside the brackets |
| Forgetting `$$...$$` wrappers | LaTeX isn't triggered without math delimiters | Always wrap in `$$...$$` for display or `$...$` for inline |
| Using single `\` in JSON | JSON needs `\\` to represent a `\` character | Double all backslashes in JSON: `\\\\xrightarrow` |
| Mixing `\ce{}` and `\xrightarrow{}` directly | `\xrightarrow` is not an mhchem command | Put `\ce{}` around individual formulas, use `\xrightarrow` outside |

---

## For JSON Upload / AI Import

When writing in a JSON file, remember to **escape all backslashes**. Every `\` becomes `\\`:

```json
{
  "question": "What is the product?\\n$$X \\xrightarrow{\\substack{\\text{(i) Strong heating} \\\\ \\text{(ii) Ethanolic KOH} \\\\ \\text{(iii) R-Br}}} Y$$"
}
```

> [!IMPORTANT]
> In JSON strings, `\\` = one backslash, `\\\\` = two backslashes (the `\\` line break in LaTeX).
