# Implementation Plan: Cloudinary Image Upload

## Goal
Add a Cloudinary upload icon next to the "Capture Snip" (screen snapt) icon in [TestBuilder.tsx](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/TestBuilder.tsx). When clicked, it will open a file picker, upload the image directly to Cloudinary, and automatically insert the generated Markdown link (`![image](url)`) at the last known cursor position in the associated text area.

## Proposed Changes

### 1. [frontend/src/components/ui/IMEInput.tsx](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/ui/IMEInput.tsx) (Component Modification)
- Update the [IMEInput](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/ui/IMEInput.tsx#18-225) component to use `forwardRef`.
- Use `useImperativeHandle` to expose an `insertAtCursor(text: string)` function to the parent.
- This function will correctly splice the text into the current `value` at `inputRef.current.selectionStart`, call `onChange`, and then restore the cursor position.

### 2. [frontend/src/components/TestBuilder.tsx](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/TestBuilder.tsx) (Integration)
- Create a dictionary/map of refs for all the question and option [IMEInput](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/ui/IMEInput.tsx#18-225) components.
- Create a `handleCloudinaryUpload(file, refId)` function:
  - Fetches from Cloudinary API.
  - Generates the markdown link for the uploaded image.
  - Calls `insertAtCursor` on the corresponding [IMEInput](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/components/ui/IMEInput.tsx#18-225) ref.
- Add the Cloudinary icon (`Cloud` from `lucide-react`) right next to the `Monitor` (Capture Snip) icon in both the Section Mode and Standard Mode question areas, as well as the option areas.

## User Review Required

> [!IMPORTANT]
> Since you have the Cloudinary API and Secret keys, we need to handle them securely. For this implementation to work entirely on the frontend without a dedicated backend signature route, it is easiest to use a **Cloudinary Unsigned Upload Preset**, which only requires your Cloud name and the Upload Preset name (no Secret Key needed).
> 
> If you prefer to use the Secret Key for signed uploads directly from the frontend (which is generally discouraged due to security reasons), we would need your `Cloud Name`, `API Key`, and `API Secret`.
> 
> **Question:** Could you provide your Cloudinary `Cloud Name`, `API Key`, and `Upload Preset` (if using unsigned), OR do you want placeholder constants in the frontend code for you to fill in later?

## Verification Plan
### Automated Tests
- Run the local dev server and ensure no compilations errors.
### Manual Verification
- Open Test Builder.
- Focus on a question text area and leave the cursor in the middle of a sentence.
- Click the new Cloudinary link icon.
- Select a local image.
- Verify the image uploads and the markdown link is pasted exactly where the cursor was.
