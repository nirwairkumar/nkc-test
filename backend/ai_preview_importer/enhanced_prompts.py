"""
Enhanced Prompts for AI Test Generator - Better image, diagram, and table extraction
"""

ENHANCED_EXTRACT_PROMPT = """
ROLE:
You are an expert AI document analyzer with advanced OCR and visual comprehension capabilities.

GOAL:
Extract ALL content from the provided document pages into a structured format, with special attention to:
- Visual elements (images, diagrams, charts)
- Tables and their data
- Mathematical expressions
- Question boundaries and ordering

CRITICAL EXTRACTION REQUIREMENTS:

1. QUESTION ORDERING (CRITICAL):
   - Extract questions in EXACT order as they appear in the document
   - Start from question 1, then 2, 3, etc.
   - NEVER skip questions or extract them out of order
   - If you see questions 1, 2, 3, 5... question 4 is missing - that's OK, don't invent it
   - Use question numbers EXACTLY as shown in the document

2. VISUAL ELEMENT DETECTION (CRITICAL):
   You MUST visually inspect each page for images, diagrams, and charts EVEN IF the text doesn't mention them:
   
   a) Check the ENTIRE page - top, bottom, margins, between questions
   b) Look for:
      - Graphs, charts, plots
      - Diagrams (scientific, mathematical, flowcharts)
      - Chemical structures
      - Geometric figures
      - Circuit diagrams
      - Maps and illustrations
      - Tables (structured data with rows/columns)
      - Small icons or symbols in questions/options
   
   c) Associate visual elements with questions based on:
      - Proximity (nearest question)
      - References in text ("see figure", "refer to diagram", "table shows")
      - Layout position (above question, below question, beside options)

3. TABLE EXTRACTION (CRITICAL):
   When you encounter a table:
   - Extract ALL cell content
   - Preserve row and column structure
   - Note which question the table belongs to
   - Format as markdown table or structured text
   - Include the table image reference
   
   Example table format:
   {
     "tableData": {
       "headers": ["Column1", "Column2", "Column3"],
       "rows": [
         ["data1", "data2", "data3"],
         ["data4", "data5", "data6"]
       ]
     }
   }

4. IMAGE IN OPTIONS:
   - Some options (A, B, C, D) may contain ONLY images or images + text
   - Extract and note which option contains the image
   - Format: optionImages: {"A": "base64_or_url", "B": null, ...}

5. QUESTION BOUNDARY DETECTION:
   - Each question starts with a number (1., 2., 3.) or "Q1", "Question 1"
   - Question continues until the next question number
   - Question includes: question text + options + associated images/tables
   - Multi-part questions: Keep all parts together under one question number

6. MATHEMATICAL CONTENT:
   - Use LaTeX format: $...$ for inline, $$...$$ for display
   - All Greek letters: \\alpha, \\beta, \\gamma, etc.
   - Fractions: \\frac{a}{b}
   - Subscripts: x_1, x_{ij}
   - Superscripts: x^2, x^{2n}
   - Integrals: \\int, \\oint
   - Roots: \\sqrt{x}, \\sqrt[3]{x}

7. CROSS-PAGE QUESTIONS:
   - If a question spans multiple pages, MERGE all parts
   - Combine question text from all pages
   - Collect ALL options from all pages
   - Mark as crossPage: true
   - Use ONE question entry with the primary question number

OUTPUT FORMAT:
{
  "title": "Document Title",
  "description": "Brief description",
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "Question text with <br> for line breaks. Include ALL text.",
      "image": "base64_string_or_url",  // Main question image
      "diagramPage": 1,  // Page number where diagram appears
      "diagramOption": null,  // If diagram is in specific option: "A", "B", "C", or "D"
      "options": {
        "A": "Option A text",
        "B": "Option B text", 
        "C": "Option C text",
        "D": "Option D text"
      },
      "optionImages": {
        "A": null,  // Or base64 if option has image
        "B": null,
        "C": null,
        "D": null
      },
      "tableData": {  // If question has associated table
        "headers": [...],
        "rows": [...]
      },
      "correctAnswer": "A",
      "marks": 4,
      "negativeMarks": 1,
      "crossPage": false,
      "page": 1
    }
  ]
}

RULES:
- Output ONLY valid JSON
- NO markdown, NO explanations, NO comments
- Extract EVERY question in order
- Include ALL images and diagrams you visually detect
- Include table data when present
- Use <br> for line breaks in text
- Escape backslashes: \\\\frac instead of \\frac
- If no image: set image to null
- If no table: omit tableData field
- Preserve exact text from document
"""

TABLE_EXTRACTION_PROMPT = """
When extracting tables from the document:

1. DETECT tables by looking for:
   - Grid lines (horizontal and vertical)
   - Row and column structure
   - Headers (usually first row, often bold or different formatting)
   - Data cells

2. EXTRACT table content:
   - Read each cell carefully
   - Preserve the exact text in each cell
   - Note row and column positions
   - Include headers separately

3. ASSOCIATE with questions:
   - Determine which question uses this table
   - Check text before/after table for references ("Based on the table...", "The data shows...")
   - Include table with the nearest question if unclear

4. FORMAT in JSON:
   {
     "tableData": {
       "headers": ["Header1", "Header2", "Header3"],
       "rows": [
         ["Row1Col1", "Row1Col2", "Row1Col3"],
         ["Row2Col1", "Row2Col2", "Row2Col3"]
       ],
       "caption": "Table title or description if available"
     }
   }

5. SPECIAL CASES:
   - If table spans multiple pages: include all data
   - If table is split: merge into one table
   - If table has merged cells: indicate with empty strings or repeated values
"""

IMAGE_DETECTION_PROMPT = """
When detecting and extracting images:

1. VISUAL SCAN:
   - Look at the ENTIRE page image provided
   - Don't just read text - LOOK at visual elements
   - Scan: top, bottom, margins, between questions, within options

2. DETECT these types:
   - Graphs (line, bar, pie, scatter)
   - Charts and plots
   - Diagrams (scientific, mathematical, engineering)
   - Chemical structures
   - Geometric figures
   - Circuit diagrams
   - Maps
   - Tables (structured grids)
   - Icons or symbols in questions
   - Images within multiple choice options

3. ASSOCIATE with content:
   - If image is ABOVE a question → belongs to that question
   - If image is BELOW a question → likely belongs to next question
   - If image is BESIDE options → check which option it's closest to
   - If image is REFERENCED in text → definitely belongs there

4. EXTRACT and reference:
   - Note the page number: diagramPage
   - If in specific option: diagramOption ("A", "B", "C", "D")
   - Main question image: image field
   - Option images: optionImages object

5. IMPORTANT:
   - Even if text doesn't mention "see figure", extract visible diagrams
   - Small chemical structures ARE important - extract them
   - Graphs without text descriptions still need extraction
   - Images in options are critical for the question
"""

QUESTION_ORDERING_PROMPT = """
CRITICAL: Maintain EXACT question order from the document:

1. READ SEQUENTIALLY:
   - Start from the beginning of page 1
   - Extract question 1 first
   - Then question 2
   - Continue in numerical order

2. IDENTIFY QUESTION STARTS:
   - Number followed by dot: "1.", "2.", "15."
   - Number in parentheses: "1)", "2)", "15)"
   - Q-prefix: "Q1.", "Q2:", "Question 3"
   - Hash format: "#1", "#2"

3. QUESTION BOUNDARIES:
   - Question text starts at the question number
   - Continues until the NEXT question number
   - Includes: question text, diagram, options, answer
   - Everything between two question numbers belongs to the first question

4. MULTI-PAGE QUESTIONS:
   - Continue reading across pages
   - Don't treat page break as question boundary
   - Look for question number to determine boundaries

5. OUTPUT ORDER:
   - questions array MUST be in ascending ID order
   - id: 1, then id: 2, then id: 3, etc.
   - NEVER reorder or shuffle questions

6. VERIFICATION:
   - After extraction, verify: 1, 2, 3, 4, 5... (or whatever sequence is in doc)
   - Check that no questions are skipped
   - Check that no questions are duplicated
"""
