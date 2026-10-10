/**
 * src/guides/altData.ts names its icons as strings, because the Cloudflare worker imports
 * that file and must stay free of React. This maps those names to Lucide components for
 * the hero and the widgets. An unknown name draws a plain dot rather than nothing, so a
 * typo in the data is visible instead of silent.
 */
import {
    type LucideIcon,
    Award,
    BarChart3,
    Briefcase,
    Circle,
    ClipboardList,
    FileText,
    Globe,
    Languages,
    ListOrdered,
    Lock,
    MessagesSquare,
    MinusCircle,
    Monitor,
    PartyPopper,
    PenLine,
    ShieldCheck,
    ShoppingCart,
    Smartphone,
    Smile,
    Sparkles,
    Timer,
    UserCheck,
    Users,
    Video,
    Wallet,
    Zap,
} from 'lucide-react';

export const ALT_ICONS: Record<string, LucideIcon> = {
    award: Award,
    'bar-chart-3': BarChart3,
    briefcase: Briefcase,
    'clipboard-list': ClipboardList,
    'file-text': FileText,
    globe: Globe,
    languages: Languages,
    'list-ordered': ListOrdered,
    lock: Lock,
    'messages-square': MessagesSquare,
    'minus-circle': MinusCircle,
    monitor: Monitor,
    'party-popper': PartyPopper,
    'pen-line': PenLine,
    'shield-check': ShieldCheck,
    'shopping-cart': ShoppingCart,
    smartphone: Smartphone,
    smile: Smile,
    sparkles: Sparkles,
    timer: Timer,
    'user-check': UserCheck,
    users: Users,
    video: Video,
    wallet: Wallet,
    zap: Zap,
};

export default function AltIcon({ name, strokeWidth }: { name: string; strokeWidth?: number }) {
    const C = ALT_ICONS[name] ?? Circle;
    return <C aria-hidden="true" strokeWidth={strokeWidth} />;
}
