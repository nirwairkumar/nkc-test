import React, { useState } from 'react';
import { Plus, type LucideIcon } from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * The "+" in the gap between two questions or two sections. With one choice it acts at
 * once; with more it opens an iOS-style context menu (title, one grey line, icon on the right).
 */

export interface GapOption {
    key: string;
    title: string;
    /** One grey line under the title: what exactly will happen. */
    detail?: string;
    icon: LucideIcon;
    onSelect: () => void;
    disabled?: boolean;
}

export function GapMenu({
    label, caption, options, size = 'question',
}: {
    /** Tooltip and screen-reader name of the "+" button. */
    label: string;
    /** Small grey line at the top of the menu, e.g. "Between Q3 and Q4". */
    caption?: string;
    options: GapOption[];
    size?: 'question' | 'section';
}) {
    const [open, setOpen] = useState(false);
    const single = options.length === 1 ? options[0] : null;

    const button = (props: React.ButtonHTMLAttributes<HTMLButtonElement> = {}) => (
        <button
            type="button"
            title={label}
            aria-label={label}
            {...props}
            className={cn(
                'mx-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-900/[0.08] sm:h-6 sm:w-6',
                'transition-[color,background-color,transform] duration-200 hover:scale-110 hover:text-sky-700 motion-safe:active:scale-95',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer',
                open && 'scale-100 bg-slate-900 text-white ring-slate-900 hover:scale-100 hover:text-white',
            )}
        >
            <Plus className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-45')} strokeWidth={2.75} />
        </button>
    );

    const line = cn('h-px flex-1 transition-colors duration-200', open ? 'bg-slate-300' : 'bg-transparent group-hover/gap:bg-sky-200');

    return (
        <div className={cn('group/gap relative flex items-center justify-center', size === 'section' ? 'h-10' : 'h-7 sm:h-6')}>
            <div className={line} />
            {single ? (
                button({ onClick: single.onSelect })
            ) : (
                <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
                    <DropdownMenuTrigger asChild>{button()}</DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="center"
                        sideOffset={6}
                        collisionPadding={12}
                        className={cn(
                            'w-[288px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[14px] border-0 bg-white/95 p-0 text-slate-900 backdrop-blur-xl',
                            'shadow-[0_22px_60px_-14px_rgba(15,23,42,0.38),0_0_0_0.5px_rgba(15,23,42,0.14)]',
                            'origin-[var(--radix-dropdown-menu-content-transform-origin)] data-[state=open]:zoom-in-90 data-[state=open]:duration-200',
                        )}
                    >
                        {caption && (
                            <>
                                <p className="px-4 pb-2 pt-2.5 text-center text-[12px] font-medium text-slate-500">{caption}</p>
                                <DropdownMenuSeparator className="m-0 h-px bg-slate-900/[0.08]" />
                            </>
                        )}
                        {options.map((o, i) => (
                            <React.Fragment key={o.key}>
                                {i > 0 && <DropdownMenuSeparator className="m-0 h-px bg-slate-900/[0.08]" />}
                                <DropdownMenuItem
                                    disabled={o.disabled}
                                    onSelect={o.onSelect}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-3 rounded-none px-4 py-2.5 text-left',
                                        'focus:bg-slate-900/[0.05] focus:text-slate-900 data-[disabled]:opacity-100',
                                    )}
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className={cn('block text-[15px] font-medium leading-5', o.disabled ? 'text-slate-400' : 'text-slate-900')}>{o.title}</span>
                                        {o.detail && <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500">{o.detail}</span>}
                                    </span>
                                    <o.icon className={cn('h-[18px] w-[18px] shrink-0', o.disabled ? 'text-slate-300' : 'text-slate-600')} strokeWidth={2} />
                                </DropdownMenuItem>
                            </React.Fragment>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            <div className={line} />
        </div>
    );
}
