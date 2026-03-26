# Cloud Image Upload & Screenshot Capture Integration

This walkthrough demonstrates the new image handling capabilities in the Test Builder, featuring cloud-based hosting and an automated screenshot capture workflow.

## Features

### 1. Cloud Image Upload
Creators can now upload images directly to cloud storage from any text editor (Questions, Options, and Solutions).

- **Unified UI**: A new [Cloud](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/test-builder/CloudUploadModal.tsx#20-158) icon is available in all text areas.
- **Cursor-Aware Insertion**: Uploaded images are automatically inserted as Markdown links exactly where your cursor is positioned.
- **One-Press Workflow**: Standard one-click upload experience.

### 2. Automated Screenshot Capture
The "Capture Snip" feature allows for rapid insertion of screenshots from the clipboard.

- **Paste & Go**: Simply paste (Ctrl+V) a screenshot into the capture window.
- **Press Enter to Insert**: The "Insert into Test" button is automatically focused upon pasting, allowing for a seamless one-press insertion.

## Components Modified

### [TestBuilder.tsx](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/TestBuilder.tsx)
- Integrated [CloudUploadModal](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/test-builder/CloudUploadModal.tsx#20-158).
- Added [Cloud](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/test-builder/CloudUploadModal.tsx#20-158) buttons to all 4 content types (Question/Option, Standard/Section).
- Implemented `editorRefs` for precise cursor management.

### [SolutionEditorPage.tsx](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/pages/SolutionEditorPage.tsx)
- Integrated [CloudUploadModal](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/test-builder/CloudUploadModal.tsx#20-158).
- Added [Cloud](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/test-builder/CloudUploadModal.tsx#20-158) button to the detailed solution editor.
- Implemented cursor-aware insertion logic.

### [ScreenshotCaptureModal.tsx](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/test-builder/ScreenshotCaptureModal.tsx)
- Automated the insertion workflow.

### [IMEInput.tsx](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/ui/IMEInput.tsx)
- Updated with `forwardRef` to expose the underlying textarea for cursor manipulation.

## Bug Fixes

### 1. Blank Screen Resolution
Fixed a critical `ReferenceError: useRef is not defined` in [TestBuilder.tsx](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/TestBuilder.tsx) by restoring the missing React import.

### 2. Standard Options Cursor Aware Link Insertion
Resolved an issue where Markdown links were not correctly inserted at the cursor position in standard options due to a missing ref assignment.

### 3. Backend Startup Persistence
Fixed a `ModuleNotFoundError` during backend startup by ensuring the application is launched from the `backend/` directory, correctly exposing the `app` module to Uvicorn.

## Verification

### Cloud Upload Test
1. Click the [Cloud](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/test-builder/CloudUploadModal.tsx#20-158) icon in a question.
2. Select an image file.
3. Observe the Markdown link appearing at the cursor position.
4. Verify the image renders correctly in the preview.

### Screenshot Capture Test
1. Click "Capture Snip".
2. Paste an image.
3. Observe the "Insert into Test" button gaining focus.
4. Press `Enter`.
5. Verify the image is added to the question/option image slot.
