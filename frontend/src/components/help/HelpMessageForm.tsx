/**
 * "Write to us": the teacher describes the problem in their own words, optionally picks a
 * topic and adds a screenshot (file or Ctrl+V). The page they came from and their screen
 * size go along automatically, so the team never has to ask "which page?".
 *
 * Signed in, the reply goes to the account email; on the public /support page we ask for
 * name and email.
 */
import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { sendSupportMessage } from '@/lib/supportApi';
import { HELP_TOPICS, REPLY_PROMISE, type HelpTopic } from '@/lib/helpContact';

const MAX_SIDE = 1600;

/** Any image → a JPEG data URL no wider/taller than MAX_SIDE (phone screenshots are huge). */
async function shrinkImage(file: Blob): Promise<string> {
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error('not an image'));
            el.src = url;
        });
        const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no canvas');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
    } finally {
        URL.revokeObjectURL(url);
    }
}

const FIELD =
    'w-full rounded-xl bg-slate-100 px-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 ring-1 ring-transparent ' +
    'transition-[background-color,box-shadow] focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40';
const LABEL = 'mb-1.5 block text-[12px] font-medium text-slate-500';

interface Props {
    /** Signed-in account email; when absent the form asks for name and email. */
    accountEmail?: string | null;
    /** Where the person was before opening Help (path), sent as context. */
    cameFrom?: string | null;
    onSent?: () => void;
}

export default function HelpMessageForm({ accountEmail, cameFrom, onSent }: Props) {
    const signedIn = !!accountEmail;
    const [topic, setTopic] = useState<HelpTopic | null>(null);
    const [message, setMessage] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [shot, setShot] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [sentTo, setSentTo] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

    const attach = async (file: Blob | null | undefined) => {
        if (!file || !file.type.startsWith('image/')) {
            if (file) toast.error('Please attach an image (a screenshot).');
            return;
        }
        try {
            setShot(await shrinkImage(file));
        } catch {
            toast.error("That image couldn't be read. Try another screenshot.");
        }
    };

    // Ctrl+V / ⌘V a screenshot anywhere on the page while the form is showing.
    useEffect(() => {
        if (sentTo) return;
        const onPaste = (e: ClipboardEvent) => {
            const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
            if (!item) return;
            e.preventDefault();
            attach(item.getAsFile());
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [sentTo]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim().length < 3) {
            toast.error('Please describe the problem in a few words.');
            return;
        }
        if (!signedIn && (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()))) {
            toast.error('Please add your name and email so we can reply.');
            return;
        }
        setSending(true);
        const { data, error } = await sendSupportMessage({
            message: message.trim(),
            topic,
            phone: phone.trim() || undefined,
            screenshot: shot,
            ...(signedIn ? {} : { name: name.trim(), email: email.trim() }),
            context: {
                ...(cameFrom ? { from: cameFrom } : {}),
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                language: navigator.language || '',
                signed_in: signedIn,
            },
        });
        setSending(false);
        if (error) {
            toast.error(error?.response?.data?.detail || "We couldn't send your message. Please try again, or WhatsApp us.");
            return;
        }
        setSentTo(data?.email || accountEmail || email.trim());
        setMessage('');
        setTopic(null);
        setShot(null);
        onSent?.();
    };

    if (sentTo) {
        return (
            <div className="flex flex-col items-center px-4 py-8 text-center" role="status">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/15">
                    <CheckCircle2 className="h-6 w-6" />
                </span>
                <p className="mt-3 text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Message sent</p>
                <p className="mt-1 max-w-sm text-[14px] leading-relaxed text-slate-600">
                    We'll reply to <span className="font-medium text-slate-800">{sentTo}</span>. {REPLY_PROMISE}
                    {signedIn && ' The reply also shows below.'}
                </p>
                <button
                    type="button"
                    onClick={() => setSentTo(null)}
                    className="mt-4 inline-flex h-9 items-center rounded-full bg-slate-100 px-4 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-200/80 cursor-pointer"
                >
                    Write another message
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
                <span className={LABEL} id="help-topic-label">What is it about? <span className="text-slate-400">(optional)</span></span>
                <div role="radiogroup" aria-labelledby="help-topic-label" className="flex flex-wrap gap-1.5">
                    {HELP_TOPICS.map(t => {
                        const on = topic === t.value;
                        return (
                            <button
                                key={t.value}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => setTopic(on ? null : t.value)}
                                className={`h-8 rounded-full px-3 text-[13px] font-medium transition-colors cursor-pointer ${
                                    on ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                                }`}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {!signedIn && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                        <span className={LABEL}>Your name</span>
                        <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" className={`${FIELD} h-10`} />
                    </label>
                    <label className="block">
                        <span className={LABEL}>Email for our reply</span>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className={`${FIELD} h-10`} />
                    </label>
                </div>
            )}

            <label className="block">
                <span className={LABEL}>What's going wrong?</span>
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    placeholder="For example: I saved my physics test but can't find it in My Tests."
                    className={`${FIELD} resize-y py-3 leading-relaxed`}
                />
            </label>

            {/* Screenshot */}
            <div>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { attach(e.target.files?.[0]); e.target.value = ''; }}
                />
                {shot ? (
                    <div className="flex items-center gap-3">
                        <img src={shot} alt="Attached screenshot" className="h-16 w-24 rounded-lg object-cover ring-1 ring-slate-900/10" />
                        <span className="text-[13px] text-slate-600">Screenshot attached</span>
                        <button
                            type="button"
                            onClick={() => setShot(null)}
                            aria-label="Remove screenshot"
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 px-3.5 py-3 text-left transition-colors hover:border-sky-400 hover:bg-sky-50/40 cursor-pointer"
                    >
                        <ImagePlus className="h-5 w-5 shrink-0 text-slate-400" />
                        <span className="min-w-0">
                            <span className="block text-[13px] font-medium text-slate-700">Add a screenshot <span className="font-normal text-slate-400">(optional)</span></span>
                            <span className="hidden text-[12px] text-slate-500 sm:block">
                                Or paste one here with {isMac ? '⌘V' : 'Ctrl+V'}. It shows us exactly what you see.
                            </span>
                        </span>
                    </button>
                )}
            </div>

            <label className="block">
                <span className={LABEL}>WhatsApp number <span className="text-slate-400">(optional, if you'd like a reply there)</span></span>
                <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    autoComplete="tel"
                    placeholder="+91"
                    className={`${FIELD} h-10 sm:max-w-[260px]`}
                />
            </label>

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] leading-relaxed text-slate-500">
                    {signedIn ? <>We'll reply to <span className="font-medium text-slate-700">{accountEmail}</span>.</> : REPLY_PROMISE}
                </p>
                <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-sky-600 px-5 text-[14px] font-semibold text-white shadow-sm transition-[background-color,transform] hover:bg-sky-700 motion-safe:active:scale-[0.97] disabled:opacity-60 cursor-pointer"
                >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sending ? 'Sending…' : 'Send message'}
                </button>
            </div>
        </form>
    );
}
