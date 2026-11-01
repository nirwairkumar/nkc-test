/**
 * Exam feedback a candidate leaves for the creator: stars plus an optional note.
 * Shown only when the creator ticks "Exam feedback" (lib/resultView.ts). The backend
 * notifies the creator and it lands in My Tests → Reports & feedback.
 *
 * ExamFeedbackPrompt slides up from the bottom a few seconds after submission;
 * ExamFeedbackForm is the same form on its own (Result Hub → Give feedback).
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { submitFeedback } from '@/lib/supportApi';

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

type FeedbackStatus = 'sent' | 'dismissed';
const statusKey = (testId: string) => `exam_feedback_${testId}`;

function readStatus(testId: string): FeedbackStatus | null {
    try {
        return localStorage.getItem(statusKey(testId)) as FeedbackStatus | null;
    } catch {
        return null;
    }
}

function rememberStatus(testId: string, status: FeedbackStatus) {
    try {
        localStorage.setItem(statusKey(testId), status);
    } catch { /* private mode: the prompt may show again, nothing else breaks */ }
}

/** The name the candidate typed on the start form, else their account name. */
export function candidateName(stateData: any, user: any): string | undefined {
    const form = stateData?.metadata?.startFormData || stateData?.attempt?.metadata?.startFormData;
    if (form && typeof form === 'object') {
        const entries = Object.entries(form as Record<string, unknown>);
        const named = entries.find(([label]) => label.trim().toLowerCase() === 'name') || entries[0];
        const value = String(named?.[1] ?? '').trim();
        if (value) return value;
    }
    return user?.user_metadata?.full_name || undefined;
}

/** Who reads the feedback: the institute, else the teacher. */
export function examinerName(test: any): string {
    return test?.institution_name || test?.creator_name || 'the examiner';
}

interface ExamFeedbackFormProps {
    testId: string;
    examiner: string;
    senderName?: string;
    testCustomId?: string;
    /** Called once the feedback is saved. */
    onSent?: () => void;
}

export function ExamFeedbackForm({ testId, examiner, senderName, testCustomId, onSent }: ExamFeedbackFormProps) {
    const { user } = useAuth();
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(() => readStatus(testId) === 'sent');

    const send = async () => {
        if (!rating || sending) return;
        setSending(true);
        const { error } = await submitFeedback({
            test_id: testId,
            rating,
            comment: note.trim() || undefined,
            custom_test_id: testCustomId || testId,
            sender_name: senderName || 'Anonymous',
            sender_email: user?.email || undefined,
        });
        setSending(false);
        if (error) {
            toast.error("Couldn't send your feedback. Please try again.");
            return;
        }
        rememberStatus(testId, 'sent');
        setSent(true);
        onSent?.();
    };

    if (sent) {
        return (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                    <Check className="h-6 w-6" strokeWidth={2.5} />
                </span>
                <p className="text-[15px] font-semibold text-slate-900 dark:text-white">Thanks for your feedback</p>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">It has been sent to {examiner}.</p>
            </div>
        );
    }

    const shown = hover || rating;
    return (
        <div className="space-y-3">
            <div className="flex flex-col items-center gap-1.5">
                <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map(n => (
                        <button
                            key={n}
                            type="button"
                            aria-label={`${n} star${n === 1 ? '' : 's'}`}
                            aria-pressed={rating === n}
                            onMouseEnter={() => setHover(n)}
                            onClick={() => setRating(n)}
                            className="flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                        >
                            <Star className={`h-8 w-8 transition-colors ${n <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                        </button>
                    ))}
                </div>
                <span className="h-4 text-xs font-medium text-slate-500 dark:text-slate-400">{RATING_WORDS[shown]}</span>
            </div>

            {rating > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 overflow-hidden">
                    <Textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        maxLength={2000}
                        rows={3}
                        placeholder={`Anything you'd like to tell ${examiner}? (optional)`}
                        className="resize-none rounded-xl text-[15px] focus-visible:ring-indigo-500/40"
                    />
                    <Button onClick={send} disabled={sending} className="h-11 w-full rounded-xl bg-indigo-600 text-[15px] font-semibold hover:bg-indigo-700">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send feedback'}
                    </Button>
                </motion.div>
            )}
        </div>
    );
}

interface ExamFeedbackPromptProps extends Omit<ExamFeedbackFormProps, 'onSent'> {
    /** Lift the sheet above the phone's bottom tab bar. */
    aboveTabBar: boolean;
    delayMs?: number;
}

/** Bottom sheet that asks once, a few seconds after the result appears. */
export function ExamFeedbackPrompt({ aboveTabBar, delayMs = 6000, ...form }: ExamFeedbackPromptProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (readStatus(form.testId)) return;
        const timer = setTimeout(() => setOpen(true), delayMs);
        return () => clearTimeout(timer);
    }, [form.testId, delayMs]);

    const dismiss = () => {
        if (readStatus(form.testId) !== 'sent') rememberStatus(form.testId, 'dismissed');
        setOpen(false);
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    role="dialog"
                    aria-label="Exam feedback"
                    initial={{ y: '110%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '110%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                    className={`fixed inset-x-3 z-50 mx-auto max-w-md rounded-3xl bg-white/95 p-4 pt-3 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.06] backdrop-blur-xl dark:bg-slate-900/95 dark:ring-white/10 md:inset-x-auto md:right-6 md:bottom-6 md:w-[380px] ${aboveTabBar ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))]'}`}
                >
                    <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-slate-200 dark:bg-slate-700 md:hidden" />
                    <div className="mb-1 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-white">How was this exam?</h3>
                            <p className="text-[13px] text-slate-500 dark:text-slate-400">Only {form.examiner} sees your answer.</p>
                        </div>
                        <button
                            type="button"
                            onClick={dismiss}
                            aria-label="Close"
                            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <ExamFeedbackForm {...form} onSent={() => setTimeout(() => setOpen(false), 1800)} />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
