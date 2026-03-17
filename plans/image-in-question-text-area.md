# Hidden Inline Image Embedding in Question Text

Add support for embedding images inline within question/option text using markdown-style syntax, with **zero UI changes**. The feature is hidden — admins simply type a special syntax in the textarea.

## How It Works (User-Facing)

To embed an image inside a question or option text, type:

```
![](https://example.com/image.png)
```

You can place it **anywhere** — between sentences, at the start, or at the end:

```
Consider the following diagram ![](https://example.com/diagram.png) and answer the question below.
```

You can also add optional alt text:

```
![Structure of Benzene](https://example.com/benzene.png)
```

The image will automatically render in:
- The **preview mode** inside the TestBuilder (IMEInput)
- The **test-taking page** (TestPage)
- The **results page** (ResultsPage)
- The **test history page** (TestHistory)

## Proposed Changes

### LatexRenderer Component

#### [MODIFY] [LatexRenderer.tsx](file:///d:/Yuga Yatra/nkc-Test-platform/frontend/src/components/ui/LatexRenderer.tsx)

Add an image processing step **before** the LaTeX processing steps. The regex `!\[([^\]]*)\]\(([^)]+)\)` will match markdown image syntax and replace it with `<img>` HTML tags.

```diff
 // 1. Replace display math $$...$$
+// 0. Replace inline images ![alt](url)
+result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
+    return `<img src="${src}" alt="${alt}" style="max-width:100%;display:inline-block;vertical-align:middle;margin:4px 2px;border-radius:4px;" />`;
+});
+
 result = result.replace(/\$\$([\s\S]*?)\$\$/g, ...
```

The existing `hasFormatting` check in [IMEInput.tsx](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/ui/IMEInput.tsx) already triggers on `!` being absent, but looking at the logic, `[` isn't detected. We need to update the detection.

---

### IMEInput Component

#### [MODIFY] [IMEInput.tsx](file:///d:/Yuga Yatra/nkc-Test-platform/frontend/src/components/ui/IMEInput.tsx)

Update the `hasFormatting` regex check to also detect `![` (markdown image syntax) so the preview mode activates when images are embedded.

```diff
-const hasFormatting = value && (value.includes('$') || value.includes('\\') || value.includes('{') || value.includes('*') || value.includes('_') || value.includes('`') || value.includes('#') || value.includes('-') || value.match(/\d+\./));
+const hasFormatting = value && (value.includes('$') || value.includes('\\') || value.includes('{') || value.includes('*') || value.includes('_') || value.includes('`') || value.includes('#') || value.includes('-') || value.match(/\d+\./) || value.includes('!['));
```

## Verification Plan

### Manual Verification
1. Go to the **Create Test** page at `/create-test`
2. In a question textarea, type: `What is shown in this image ![](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg) ?`
3. Click out of the textarea — the preview should show the image rendered inline between the text
4. Click the preview to re-enter edit mode — the raw `![]()` syntax should be visible again
5. Save the test and open it as a student — the image should render correctly on the test-taking page
6. Submit the test — the image should render correctly on the results page
