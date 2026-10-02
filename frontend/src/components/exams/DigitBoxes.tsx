import React from 'react';
import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp';

interface DigitBoxesProps {
    length: number;
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    autoFocus?: boolean;
    disabled?: boolean;
    invalid?: boolean;
    /** Show dots instead of digits (PINs). */
    secret?: boolean;
    /** Split into two groups of three, like "482 913". */
    grouped?: boolean;
    size?: 'md' | 'lg';
    ariaLabel: string;
}

/**
 * iOS passcode-style digit boxes. One real <input> underneath (input-otp), so the
 * phone shows its number pad, paste works, and SMS-style autofill is harmless.
 */
export default function DigitBoxes({
    length, value, onChange, onComplete, autoFocus, disabled, invalid, secret, grouped, size = 'lg', ariaLabel,
}: DigitBoxesProps) {
    const box = size === 'lg'
        ? 'h-[60px] w-[46px] text-[28px] rounded-[14px] sm:h-16 sm:w-[52px] sm:text-[30px]'
        : 'h-14 w-12 text-2xl rounded-[13px]';

    return (
        <OTPInput
            maxLength={length}
            value={value}
            onChange={onChange}
            onComplete={onComplete}
            autoFocus={autoFocus}
            disabled={disabled}
            inputMode="numeric"
            pattern={REGEXP_ONLY_DIGITS}
            aria-label={ariaLabel}
            containerClassName={`flex items-center justify-center has-[:disabled]:opacity-60 ${invalid ? 'motion-safe:animate-[tz-shake_0.4s_ease-in-out]' : ''}`}
            render={({ slots }) => (
                <div className="flex items-center gap-2 sm:gap-2.5">
                    {slots.map((slot, i) => (
                        <React.Fragment key={i}>
                            {grouped && i === Math.floor(length / 2) && (
                                <span aria-hidden="true" className="mx-0.5 h-[3px] w-3 rounded-full bg-slate-300 sm:mx-1" />
                            )}
                            <div
                                className={[
                                    'relative flex items-center justify-center bg-white font-semibold tabular-nums text-slate-900 transition-all duration-150',
                                    box,
                                    'shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1',
                                    invalid
                                        ? 'ring-red-400/80 bg-red-50/60'
                                        : slot.isActive
                                            ? 'ring-2 ring-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.15)]'
                                            : slot.char ? 'ring-slate-300' : 'ring-slate-200',
                                ].join(' ')}
                            >
                                {slot.char !== null && (secret
                                    ? <span className="h-3 w-3 rounded-full bg-slate-900" />
                                    : slot.char)}
                                {slot.hasFakeCaret && (
                                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                        <span className="h-7 w-[2px] animate-[tz-caret_1s_ease-in-out_infinite] rounded-full bg-sky-500" />
                                    </span>
                                )}
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            )}
        />
    );
}
