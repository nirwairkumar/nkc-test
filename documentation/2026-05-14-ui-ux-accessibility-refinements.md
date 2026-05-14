# UI/UX and Accessibility Refinements (2026-05-14)

This update focuses on enhancing the user experience of the live test interface and fixing critical UI alignment issues on the onboarding page.

## Key Updates

### 1. Onboarding Page UI Fix
- **Layout Stabilization**: Resolved alignment and spacing issues on the `/onboarding` page.
- **Visual Improvements**: Ensured the "Your Details" card and form elements are correctly positioned and responsive across different screen sizes.

### 2. Live Test: Font Size Adjustment
- **Dynamic Resizing**: Introduced a new `fontSize` state (defaulting to 18px) that allows students to scale question and option text for better readability.
- **Subtle Controls**: Added minimalist `+` and `-` buttons in the absolute top-right corner of the question area.
- **Non-Distracting Interaction**: 
  - Controls are set to **10% opacity** by default to prevent distraction during high-stakes testing.
  - They become fully visible (**100% opacity**) only upon hover.
  - Positioning was nudged to the extreme edge (`-top-4 -right-1`) to keep the content area clean.

### 3. Vertical Scrollbar Removal (Question Area)
- **Problem**: A redundant y-axis scrollbar was appearing in the question area even though content was already loading in full height.
- **Solution**: Completely suppressed the y-axis scrollbar using universal CSS overrides (`[&::-webkit-scrollbar]:hidden`, etc.) on the question container.
- **Benefit**: Removes visual clutter and prevents "scroll-within-scroll" confusion on both mobile and desktop.

### 4. Mobile Margin Optimization
- **Left/Right Padding**: Reduced horizontal padding of the question text box on phone screens from `p-4` (16px) to `px-2` (8px).
- **Header Integrity**: Ensured that the "Question Header" (Question number, marks, type) remains unaffected, preserving the professional row alignment.
- **Goal**: Maximize screen real estate for complex mathematical and scientific questions on small mobile displays.

## Technical Details
- **Affected Files**:
  - `frontend/src/pages/TestPage.tsx`: Implemented `fontSize` state, scrollbar suppression, and mobile-specific padding.
  - `frontend/src/pages/OnboardingPage.tsx`: UI layout and alignment fixes.
- **Repositories Updated**:
  - `nkc-test-2.0-frontend` (Frontend)
  - `nkc-test` (Root)

---
*Documentation generated on 2026-05-14.*
