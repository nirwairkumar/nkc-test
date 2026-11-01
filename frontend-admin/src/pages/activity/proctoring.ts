/**
 * The exam environment a creator switched on, condensed to short labels.
 * Only what is ON is listed — a chip means "this rule is in force right now".
 */
import {
    Copy, Eye, FileText, Layers, Lock, Maximize2, Shield, ShieldOff, Timer, Users, type LucideIcon,
} from 'lucide-react';

export interface Rule {
    label: string;
    detail: string;
    icon: LucideIcon;
    /** Rules that keep an exam honest vs. rules that only shape it. */
    kind: 'proctoring' | 'format';
}

export function proctoringRules(settings: any): Rule[] {
    const s = settings || {};
    const out: Rule[] = [];

    if (s.force_fullscreen) out.push({ label: 'Fullscreen', detail: 'The candidate must stay in fullscreen', icon: Maximize2, kind: 'proctoring' });
    if (s.tab_switch_mode && s.tab_switch_mode !== 'off') {
        const strict = s.tab_switch_mode === 'strict';
        out.push({
            label: strict ? 'Tab switch: auto-submit' : 'Tab switch: warn',
            detail: strict ? 'Leaving the tab submits the paper' : 'Leaving the tab shows a warning',
            icon: Eye,
            kind: 'proctoring',
        });
    }
    if (s.disable_copy_paste) out.push({ label: 'No copy/paste', detail: 'Clipboard and selection are blocked', icon: Copy, kind: 'proctoring' });
    if (s.disable_actions) out.push({ label: 'Shortcuts blocked', detail: 'Right-click and devtools shortcuts are blocked', icon: Lock, kind: 'proctoring' });
    if (s.block_back_button) out.push({ label: 'Back blocked', detail: 'The browser back button is trapped', icon: Shield, kind: 'proctoring' });
    if (s.disable_exit_button) out.push({ label: 'No exit', detail: 'The exit button is hidden', icon: ShieldOff, kind: 'proctoring' });

    if (s.strict_timer) out.push({ label: 'Strict timer', detail: 'The clock never pauses', icon: Timer, kind: 'format' });
    if (s.attempt_limit) out.push({ label: `${s.attempt_limit} attempt${s.attempt_limit === 1 ? '' : 's'}`, detail: 'Attempts allowed per candidate', icon: Users, kind: 'format' });
    if (s.shuffle_questions) out.push({ label: 'Shuffled', detail: 'Question order is random per candidate', icon: Layers, kind: 'format' });
    if (s.start_form?.enabled && s.start_form?.fields?.length) {
        out.push({
            label: `Sign-in form (${s.start_form.fields.length})`,
            detail: `Asks for: ${s.start_form.fields.map((f: any) => f.label || f.name).filter(Boolean).join(', ')}`,
            icon: FileText,
            kind: 'format',
        });
    }
    return out;
}

/** "Locked down" / "Watched" / "Open" — one word for how strict an exam is. */
export function strictness(settings: any): { label: string; tone: 'emerald' | 'amber' | 'slate'; count: number } {
    const n = proctoringRules(settings).filter((r) => r.kind === 'proctoring').length;
    if (n >= 3) return { label: 'Locked down', tone: 'emerald', count: n };
    if (n >= 1) return { label: 'Watched', tone: 'amber', count: n };
    return { label: 'Open', tone: 'slate', count: 0 };
}
