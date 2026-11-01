/** Passes a picked file from a landing page to the editor route without re-uploading it. */
let pending: File | null = null;

export function setPendingFile(f: File) {
    pending = f;
}

export function takePendingFile(): File | null {
    const f = pending;
    pending = null;
    return f;
}

export const isPdfFile = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
