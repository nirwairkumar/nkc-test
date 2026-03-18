# Walkthrough: Chemistry Formula Rendering

I have successfully integrated professional-grade chemistry formula rendering into your testing platform. This allows you to write chemical formulas and reactions as easily as mathematical equations.

## Integration Details

- **`mhchem` Extension Added**: I have added the official KaTeX `mhchem` extension globally to the platform via [index.html](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/index.html).
- **Zero Configuration Required**: Your existing `react-latex-next` implementation automatically detects and parses the `\ce{}` formatting tags without any strict parsing errors.

## How to Write Chemical Formulas

You can now use two specific LaTeX commands anywhere in your questions, options, or passages:

1.  **`\ce{...}` (Chemical Equations)**: This is the primary command.
    *   `$\ce{H2O}$` renders perfectly with subscript 2.
    *   `$\ce{CH3-CH=CH-C(=O)-CH3}$` automatically handles double bonds, single bonds, and structural grouping.
    *   `$\ce{SO4^2-}$` automatically puts the charge in superscript.
    *   `$$\ce{C + O2 -> CO2}$$` renders a beautiful centered reaction equation.

2.  **`\pu{...}` (Physical Units)**: Use this for values with units.
    *   `$\pu{1.23 J mol-1 K-1}$` perfectly formats the units.

## Guidelines for 2D Chemical Structures (e.g., Rings)

As researched and noted in the implementation plan, complex 2D sketches (like benzene rings, carbohydrates, or chair conformations shown in your reference image) cannot be dynamically drawn purely from LaTeX code directly in a web browser. `chemfig` requires a heavy backend LaTeX compilation engine.

**Best Practice for 2D Structures:**
1.  Draw the structure offline using a tool like ChemDraw, MarvinSketch, or export a local `chemfig` compilation as a high-resolution SVG or PNG.
2.  Use the **Insert Image** functionality in your question editor to upload and embed the image. This guarantees 100% accurate stereochemistry and instant loading for students without breaking UI layouts.

## Verification Steps
1. Create a new test or edit an existing one.
2. In a question or option field, type exactly: `Which of the following describes \ce{H2O}?`
3. Save the test and preview it. You should see "H₂O" perfectly formatted as a chemical formula.
