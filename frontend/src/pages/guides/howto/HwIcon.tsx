/**
 * src/guides/howtoData.ts names its icons as strings, because the Cloudflare worker imports
 * that file and must stay free of React. This maps those names to Lucide components for
 * the hero and the widgets. An unknown name draws a plain dot rather than nothing, so a
 * typo in the data is visible instead of silent.
 */
import {
    type LucideIcon,
    AlertTriangle,
    BarChart3,
    BatteryLow,
    Bold,
    Circle,
    Clock,
    Cloud,
    CopyCheck,
    FileText,
    Forward,
    IdCard,
    KeyRound,
    Layers,
    LayoutGrid,
    LayoutTemplate,
    Link,
    ListOrdered,
    Lock,
    Maximize,
    MessageCircle,
    MinusCircle,
    MousePointerClick,
    PhoneCall,
    QrCode,
    RefreshCw,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Timer,
    UserCheck,
    UserX,
    Users,
    WifiOff,
} from 'lucide-react';

export const HW_ICONS: Record<string, LucideIcon> = {
    'alert-triangle': AlertTriangle,
    'bar-chart-3': BarChart3,
    'battery-low': BatteryLow,
    bold: Bold,
    clock: Clock,
    cloud: Cloud,
    'copy-check': CopyCheck,
    'file-text': FileText,
    forward: Forward,
    'id-card': IdCard,
    'key-round': KeyRound,
    layers: Layers,
    'layout-grid': LayoutGrid,
    'layout-template': LayoutTemplate,
    link: Link,
    'list-ordered': ListOrdered,
    lock: Lock,
    maximize: Maximize,
    'message-circle': MessageCircle,
    'minus-circle': MinusCircle,
    'mouse-pointer-click': MousePointerClick,
    'phone-call': PhoneCall,
    'qr-code': QrCode,
    'refresh-cw': RefreshCw,
    'shield-check': ShieldCheck,
    smartphone: Smartphone,
    sparkles: Sparkles,
    timer: Timer,
    'user-check': UserCheck,
    'user-x': UserX,
    users: Users,
    'wifi-off': WifiOff,
};

export default function HwIcon({ name, strokeWidth }: { name: string; strokeWidth?: number }) {
    const C = HW_ICONS[name] ?? Circle;
    return <C aria-hidden="true" strokeWidth={strokeWidth} />;
}
