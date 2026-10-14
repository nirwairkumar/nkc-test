/** Fired by AITestImporter with detail=true once past the upload step, false when back on it. Layout collapses the menu on true. */
export const AI_IMPORT_STEP_EVENT = 'ai-import-past-upload';

export function announceAiImportStep(pastUpload: boolean) {
    window.dispatchEvent(new CustomEvent<boolean>(AI_IMPORT_STEP_EVENT, { detail: pastUpload }));
}
