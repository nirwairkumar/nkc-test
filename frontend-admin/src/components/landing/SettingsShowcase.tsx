import { useEffect, useRef } from 'react';
import './SettingsShowcase.css';

function getTomorrowDateStr() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export default function SettingsShowcase() {
    const deviceRef       = useRef<HTMLDivElement>(null);
    const cursorRef       = useRef<HTMLDivElement>(null);
    const popupRef        = useRef<HTMLDivElement>(null);
    // Security tab
    const focusToggleRef  = useRef<HTMLDivElement>(null);
    const activityToggleRef = useRef<HTMLDivElement>(null);
    const violationSecRef = useRef<HTMLDivElement>(null);
    const radioWarnRef    = useRef<HTMLDivElement>(null);
    const radioNoneRef    = useRef<HTMLDivElement>(null);
    const navWarnToggleRef = useRef<HTMLDivElement>(null);
    const calcToggleRef   = useRef<HTMLDivElement>(null);
    // Tab panes
    const tabSecRef       = useRef<HTMLDivElement>(null);
    const tabAccessRef    = useRef<HTMLDivElement>(null);
    const tabResultsRef   = useRef<HTMLDivElement>(null);
    const paneSec         = useRef<HTMLDivElement>(null);
    const paneAccess      = useRef<HTMLDivElement>(null);
    const paneResults     = useRef<HTMLDivElement>(null);
    // Access tab — separated container vs text-span refs for date fields
    const schedToggleRef  = useRef<HTMLDivElement>(null);
    const schedFieldsRef  = useRef<HTMLDivElement>(null);
    const startInputRef   = useRef<HTMLDivElement>(null);
    const startTextRef    = useRef<HTMLSpanElement>(null);
    const startCurRef     = useRef<HTMLSpanElement>(null);
    const endInputRef     = useRef<HTMLDivElement>(null);
    const endTextRef      = useRef<HTMLSpanElement>(null);
    const endCurRef       = useRef<HTMLSpanElement>(null);
    const attemptRef      = useRef<HTMLDivElement>(null);
    const attemptLabelRef = useRef<HTMLSpanElement>(null);
    const startFormRef    = useRef<HTMLDivElement>(null);
    const startFormFlds   = useRef<HTMLDivElement>(null);
    const addFieldBtn1Ref = useRef<HTMLButtonElement>(null);
    const addFieldBtn2Ref = useRef<HTMLButtonElement>(null);
    const field1InputRef  = useRef<HTMLDivElement>(null);
    const field2InputRef  = useRef<HTMLDivElement>(null);
    const field1TextRef   = useRef<HTMLSpanElement>(null);
    const field2TextRef   = useRef<HTMLSpanElement>(null);
    const field1CurRef    = useRef<HTMLSpanElement>(null);
    const field2CurRef    = useRef<HTMLSpanElement>(null);
    const field1RowRef    = useRef<HTMLDivElement>(null);
    const field2RowRef    = useRef<HTMLDivElement>(null);
    // Results tab
    const strictTimerRef  = useRef<HTMLDivElement>(null);
    const flexTimerRef    = useRef<HTMLDivElement>(null);
    const saveBtn         = useRef<HTMLButtonElement>(null);
    // Scrollable body
    const bodyRef         = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let aborted = false;
        const timers: number[] = [];
        // Hoisted to useEffect scope so all step functions can access it
        let tomorrow = getTomorrowDateStr();

        function T(fn: () => void, ms: number) {
            const t = window.setTimeout(() => { if (!aborted) fn(); }, ms);
            timers.push(t);
            return t;
        }
        function clearAll() { timers.forEach(clearTimeout); timers.length = 0; }

        // ── CURSOR ────────────────────────────────────────────
        function showCursorAt(x: number, y: number) {
            const c = cursorRef.current!;
            c.style.transition = 'none';
            c.style.transform  = 'translate(' + x + 'px, ' + y + 'px)';
            c.style.opacity    = '1';
            c.getBoundingClientRect();
            c.style.transition = 'transform 0.52s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.25s';
        }
        function hideCursor() {
            if (cursorRef.current) cursorRef.current.style.opacity = '0';
        }
        function glideTo(x: number, y: number, done: () => void) {
            cursorRef.current!.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
            T(done, 580);
        }
        function getCenter(el: HTMLElement, yOffset: number) {
            const devRect = deviceRef.current!.getBoundingClientRect();
            const r = el.getBoundingClientRect();
            return {
                x: r.left - devRect.left + r.width * 0.8,
                y: r.top  - devRect.top  + r.height / 2 + yOffset
            };
        }

        // ── SCROLL ────────────────────────────────────────────
        function scrollBodyTo(targetTop: number, done: () => void) {
            const body  = bodyRef.current!;
            const start = body.scrollTop;
            const dist  = targetTop - start;
            const dur   = 500;
            const t0    = performance.now();
            function step(now: number) {
                if (aborted) return;
                const p = Math.min((now - t0) / dur, 1);
                const e = 1 - Math.pow(1 - p, 3);
                body.scrollTop = start + dist * e;
                if (p < 1) { requestAnimationFrame(step); }
                else       { T(done, 80); }
            }
            requestAnimationFrame(step);
        }

        // ── CLICK ─────────────────────────────────────────────
        function clickEl(el: HTMLElement, yOffset: number, done: () => void) {
            const pos = getCenter(el, yOffset);
            showCursorAt(pos.x - 60, pos.y + 40);
            T(function () {
                glideTo(pos.x, pos.y, function () { T(done, 280); });
            }, 150);
        }

        // ── TOGGLE ────────────────────────────────────────────
        function toggleOn(toggleEl: HTMLDivElement, done: () => void) {
            toggleEl.classList.add('on');
            T(done, 350);
        }
        function toggleOff(toggleEl: HTMLDivElement, done: () => void) {
            toggleEl.classList.remove('on');
            T(done, 350);
        }

        // ── TAB SWITCH ────────────────────────────────────────
        function switchToTab(
            tabEl:      HTMLDivElement,
            pane:       HTMLDivElement,
            otherTabs:  HTMLDivElement[],
            otherPanes: HTMLDivElement[],
            done:       () => void
        ) {
            otherTabs.forEach(function (t) { t.classList.remove('active'); });
            otherPanes.forEach(function (p) { p.classList.remove('active'); });
            tabEl.classList.add('active');
            pane.classList.add('active');
            if (bodyRef.current) bodyRef.current.scrollTop = 0;
            T(done, 400);
        }

        // ── TYPE INTO ─────────────────────────────────────────
        function typeInto(
            textEl:   HTMLSpanElement,
            inputEl:  HTMLDivElement,
            cursorEl: HTMLSpanElement | null,
            text:     string,
            speed:    number,
            done:     () => void
        ) {
            inputEl.classList.add('active');
            if (cursorEl) cursorEl.style.display = '';
            let i = 0;
            function step() {
                if (aborted) return;
                if (i <= text.length) {
                    textEl.textContent = text.slice(0, i);
                    i++;
                    T(step, speed);
                } else {
                    inputEl.classList.remove('active');
                    if (cursorEl) cursorEl.style.display = 'none';
                    T(done, 300);
                }
            }
            step();
        }

        // ── RESET ─────────────────────────────────────────────
        function resetAll() {
            tomorrow = getTomorrowDateStr();
            [focusToggleRef, activityToggleRef, navWarnToggleRef, calcToggleRef,
             schedToggleRef, attemptRef, startFormRef, strictTimerRef
            ].forEach(function (r) { if (r.current) r.current.classList.remove('on'); });
            // Flexible Timer starts ON (it gets toggled off during the demo)
            if (flexTimerRef.current) flexTimerRef.current.classList.add('on');
            if (violationSecRef.current) violationSecRef.current.classList.remove('visible', 'shown');
            if (schedFieldsRef.current)  schedFieldsRef.current.classList.remove('visible', 'shown');
            if (startFormFlds.current)   startFormFlds.current.classList.remove('visible', 'shown');
            if (attemptLabelRef.current) attemptLabelRef.current.textContent = 'Unlimited';
            if (startTextRef.current)    startTextRef.current.textContent = '';
            if (endTextRef.current)      endTextRef.current.textContent = '';
            if (startInputRef.current)   startInputRef.current.classList.remove('active');
            if (endInputRef.current)     endInputRef.current.classList.remove('active');
            if (field1RowRef.current) {
                field1RowRef.current.style.display = 'none';
                field1RowRef.current.classList.remove('ss-card-enter');
            }
            if (field2RowRef.current) {
                field2RowRef.current.style.display = 'none';
                field2RowRef.current.classList.remove('ss-card-enter');
            }
            if (field1TextRef.current)   field1TextRef.current.textContent = '';
            if (field2TextRef.current)   field2TextRef.current.textContent = '';
            if (addFieldBtn2Ref.current) addFieldBtn2Ref.current.style.display = 'none';
            if (radioNoneRef.current)    radioNoneRef.current.classList.add('checked');
            if (radioWarnRef.current)    radioWarnRef.current.classList.remove('checked');
            if (tabSecRef.current)       tabSecRef.current.classList.add('active');
            if (tabAccessRef.current)    tabAccessRef.current.classList.remove('active');
            if (tabResultsRef.current)   tabResultsRef.current.classList.remove('active');
            if (paneSec.current)         paneSec.current.classList.add('active');
            if (paneAccess.current)      paneAccess.current.classList.remove('active');
            if (paneResults.current)     paneResults.current.classList.remove('active');
            if (popupRef.current)        popupRef.current.classList.remove('visible');
            if (bodyRef.current)         bodyRef.current.scrollTop = 0;
            hideCursor();
        }

        // ══════════════════════════════════════════════════════
        // PART 1 – SECURITY & FOCUS
        // ══════════════════════════════════════════════════════
        function startSequence() {
            if (aborted) return;
            resetAll();

            T(function () {
                clickEl(focusToggleRef.current!, 5, function () {
                    toggleOn(focusToggleRef.current!, function () {
                        if (violationSecRef.current) {
                            violationSecRef.current.classList.add('visible');
                            T(function () {
                                if (violationSecRef.current) violationSecRef.current.classList.add('shown');
                            }, 50);
                        }
                        T(function () {
                            clickEl(activityToggleRef.current!, 5, function () {
                                toggleOn(activityToggleRef.current!, function () {
                                    T(function () {
                                        clickEl(radioWarnRef.current!, 5, function () {
                                            if (radioNoneRef.current) radioNoneRef.current.classList.remove('checked');
                                            if (radioWarnRef.current) radioWarnRef.current.classList.add('checked');
                                            T(function () {
                                                scrollBodyTo(220, function () {
                                                    clickEl(navWarnToggleRef.current!, 5, function () {
                                                        toggleOn(navWarnToggleRef.current!, function () {
                                                            T(function () {
                                                                clickEl(calcToggleRef.current!, 5, function () {
                                                                    toggleOn(calcToggleRef.current!, function () {
                                                                        T(function () {
                                                                            clickEl(tabAccessRef.current!, 5, function () {
                                                                                switchToTab(
                                                                                    tabAccessRef.current!, paneAccess.current!,
                                                                                    [tabSecRef.current!, tabResultsRef.current!],
                                                                                    [paneSec.current!, paneResults.current!],
                                                                                    runPart2
                                                                                );
                                                                            });
                                                                        }, 600);
                                                                    });
                                                                });
                                                            }, 500);
                                                        });
                                                    });
                                                });
                                            }, 400);
                                        });
                                    }, 700);
                                });
                            });
                        }, 700);
                    });
                });
            }, 800);
        }

        // ══════════════════════════════════════════════════════
        // PART 2 – ACCESS & CONTROL  (linear step functions)
        // ══════════════════════════════════════════════════════
        function runPart2() { T(p2s1, 400); }

        function p2s1() {
            clickEl(schedToggleRef.current!, 5, function () {
                toggleOn(schedToggleRef.current!, function () {
                    if (schedFieldsRef.current) {
                        schedFieldsRef.current.classList.add('visible');
                        T(function () {
                            if (schedFieldsRef.current) schedFieldsRef.current.classList.add('shown');
                        }, 50);
                    }
                    T(p2s2, 600);
                });
            });
        }

        function p2s2() {
            const pos = getCenter(startInputRef.current!, 5);
            showCursorAt(pos.x - 40, pos.y + 30);
            glideTo(pos.x, pos.y, function () {
                typeInto(
                    startTextRef.current!, startInputRef.current!,
                    startCurRef.current, tomorrow + ', 09:00', 38,
                    function () { T(p2s3, 150); }
                );
            });
        }

        function p2s3() {
            const pos = getCenter(endInputRef.current!, 5);
            showCursorAt(pos.x - 40, pos.y + 30);
            glideTo(pos.x, pos.y, function () {
                typeInto(
                    endTextRef.current!, endInputRef.current!,
                    endCurRef.current, tomorrow + ', 12:00', 38,
                    function () { T(function () { scrollBodyTo(280, p2s4); }, 500); }
                );
            });
        }

        function p2s4() {
            clickEl(attemptRef.current!, 5, function () {
                toggleOn(attemptRef.current!, function () {
                    if (attemptLabelRef.current) attemptLabelRef.current.textContent = 'Single Attempt';
                    T(p2s5, 700);
                });
            });
        }

        function p2s5() {
            clickEl(startFormRef.current!, 5, function () {
                toggleOn(startFormRef.current!, function () {
                    if (startFormFlds.current) {
                        startFormFlds.current.classList.add('visible');
                        T(function () {
                            if (startFormFlds.current) startFormFlds.current.classList.add('shown');
                        }, 50);
                    }
                    T(p2s6, 600);
                });
            });
        }

        function p2s6() {
            clickEl(addFieldBtn1Ref.current!, 5, function () {
                if (addFieldBtn1Ref.current) addFieldBtn1Ref.current.classList.add('hovering');
                T(function () {
                    if (addFieldBtn1Ref.current) addFieldBtn1Ref.current.classList.remove('hovering');
                    if (field1RowRef.current) {
                        field1RowRef.current.style.display = 'flex';
                        T(function () {
                            if (field1RowRef.current) field1RowRef.current.classList.add('ss-card-enter');
                        }, 30);
                    }
                    if (addFieldBtn2Ref.current) addFieldBtn2Ref.current.style.display = '';
                    T(p2s7, 300);
                }, 300);
            });
        }

        function p2s7() {
            const pos = getCenter(field1InputRef.current!, 5);
            showCursorAt(pos.x - 40, pos.y + 30);
            glideTo(pos.x, pos.y, function () {
                typeInto(
                    field1TextRef.current!, field1InputRef.current!,
                    field1CurRef.current, 'Name', 55,
                    function () { T(function () { scrollBodyTo(500, p2s8); }, 400); }
                );
            });
        }

        function p2s8() {
            clickEl(addFieldBtn2Ref.current!, 5, function () {
                if (addFieldBtn2Ref.current) addFieldBtn2Ref.current.classList.add('hovering');
                T(function () {
                    if (addFieldBtn2Ref.current) addFieldBtn2Ref.current.classList.remove('hovering');
                    if (field2RowRef.current) {
                        field2RowRef.current.style.display = 'flex';
                        T(function () {
                            if (field2RowRef.current) field2RowRef.current.classList.add('ss-card-enter');
                        }, 30);
                    }
                    T(function () { scrollBodyTo(600, p2s9); }, 200);
                }, 300);
            });
        }

        function p2s9() {
            const pos = getCenter(field2InputRef.current!, 5);
            showCursorAt(pos.x - 40, pos.y + 30);
            glideTo(pos.x, pos.y, function () {
                typeInto(
                    field2TextRef.current!, field2InputRef.current!,
                    field2CurRef.current, 'Roll Number', 45,
                    function () { T(p2s10, 700); }
                );
            });
        }

        function p2s10() {
            clickEl(tabResultsRef.current!, 5, function () {
                switchToTab(
                    tabResultsRef.current!, paneResults.current!,
                    [tabSecRef.current!, tabAccessRef.current!],
                    [paneSec.current!, paneAccess.current!],
                    runPart3
                );
            });
        }

        // ══════════════════════════════════════════════════════
        // PART 3 – RESULTS & TIMING
        // ══════════════════════════════════════════════════════
        function runPart3() {
            T(function () {
                clickEl(strictTimerRef.current!, 5, function () {
                    toggleOn(strictTimerRef.current!, function () {
                        // Now turn OFF Allow Flexible Timer
                        T(function () {
                            clickEl(flexTimerRef.current!, 5, function () {
                                toggleOff(flexTimerRef.current!, function () {
                                    T(function () {
                                        const pos = getCenter(saveBtn.current!, 5);
                                        showCursorAt(pos.x - 80, pos.y + 40);
                                        T(function () {
                                            glideTo(pos.x, pos.y, function () {
                                                if (saveBtn.current) saveBtn.current.classList.add('pressing');
                                                T(function () {
                                                    if (saveBtn.current) saveBtn.current.classList.remove('pressing');
                                                    hideCursor();
                                                    T(function () {
                                                        if (popupRef.current) popupRef.current.classList.add('visible');
                                                        T(function () {
                                                            if (popupRef.current) popupRef.current.classList.remove('visible');
                                                            T(startSequence, 800);
                                                        }, 3200);
                                                    }, 300);
                                                }, 300);
                                            });
                                        }, 150);
                                    }, 500);
                                });
                            });
                        }, 600);
                    });
                });
            }, 400);
        }

        // ── INTERSECTION OBSERVER BOOT ────────────────────────
        let started = false;
        const observer = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting && !started) {
                started = true;
                T(startSequence, 600);
            }
        }, { threshold: 0.15 });
        observer.observe(deviceRef.current!);

        return function () {
            aborted = true;
            clearAll();
            observer.disconnect();
            if (cursorRef.current) cursorRef.current.style.opacity = '0';
        };
    }, []);

    return (
        <div className="ss-outer">
            <div className="ss-device" ref={deviceRef}>

                {/* HEADER */}
                <div className="ss-header">
                    <div className="ss-header-title">Test Environment Settings</div>
                    <div className="ss-header-actions">
                        <div className="ss-btn-outline">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            View Results
                        </div>
                        <div className="ss-btn-close">×</div>
                    </div>
                </div>

                {/* TABS BAR */}
                <div className="ss-tabs-bar">
                    <div className="ss-tab active" ref={tabSecRef}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        Security
                    </div>
                    <div className="ss-tab" ref={tabAccessRef}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Access
                    </div>
                    <div className="ss-tab" ref={tabResultsRef}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Results
                    </div>
                    <div className="ss-tab">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                        AI
                    </div>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="ss-body" ref={bodyRef}>

                    {/* ── SECURITY PANE ─────────────────────── */}
                    <div className="ss-tab-pane active" ref={paneSec}>
                        <div className="ss-monitoring-card">
                            <div className="ss-section-label">Focus &amp; Security</div>

                            <div className="ss-row">
                                <div className="ss-row-info">
                                    <div className="ss-row-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                                        </svg>
                                        Focus Mode
                                    </div>
                                    <div className="ss-row-desc">Prompts users to focus on the exam window. Log exits and distractions.</div>
                                </div>
                                <div className="ss-toggle" ref={focusToggleRef}>
                                    <div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div>
                                </div>
                            </div>

                            <hr className="ss-hr"/>

                            <div className="ss-row">
                                <div className="ss-row-info">
                                    <div className="ss-row-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                            <line x1="12" y1="9" x2="12" y2="13"/>
                                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                                        </svg>
                                        Tab Activity Detection
                                    </div>
                                    <div className="ss-row-desc">Log when candidates navigate away from the test tab.</div>
                                </div>
                                <div className="ss-toggle" ref={activityToggleRef}>
                                    <div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div>
                                </div>
                            </div>

                            <div className="ss-violation-section" ref={violationSecRef}>
                                <hr className="ss-hr"/>
                                <div className="ss-section-label">Focus Violations</div>
                                <div className="ss-radio-row">
                                    <div className="ss-radio checked" ref={radioNoneRef}></div>
                                    <span className="ss-radio-label">No limit (Warn only)</span>
                                </div>
                                <div className="ss-radio-row">
                                    <div className="ss-radio strict"></div>
                                    <span className="ss-radio-label red">Strict (Instant Submit)</span>
                                </div>
                                <div className="ss-warning-radio-row">
                                    <div className="ss-radio" ref={radioWarnRef}></div>
                                    <span className="ss-warn-count">2</span>
                                    <span className="ss-radio-label">warnings then Submit</span>
                                </div>
                                <div className="ss-violation-hint">Both window exits and tab focus losses count toward this limit.</div>
                            </div>
                        </div>

                        <div className="ss-grid-2">
                            <div className="ss-mini-card">
                                <div className="ss-row-info">
                                    <div style={{fontWeight:600,fontSize:'12px',color:'#1e293b'}}>Question Shuffling</div>
                                    <div className="ss-row-desc">Shuffle question order for each candidate</div>
                                </div>
                                <div className="ss-toggle"><div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div></div>
                            </div>
                            <div className="ss-mini-card">
                                <div className="ss-row-info">
                                    <div style={{fontWeight:600,fontSize:'12px',color:'#1e293b'}}>Option Shuffling</div>
                                    <div className="ss-row-desc">Shuffle multiple-choice answer options</div>
                                </div>
                                <div className="ss-toggle"><div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div></div>
                            </div>
                            <div className="ss-mini-card">
                                <div className="ss-row-info">
                                    <div style={{fontWeight:600,fontSize:'12px',color:'#1e293b'}}>Navigation Warnings</div>
                                    <div className="ss-row-desc">Warn candidate before leaving the page</div>
                                </div>
                                <div className="ss-toggle" ref={navWarnToggleRef}>
                                    <div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div>
                                </div>
                            </div>
                            <div className="ss-mini-card">
                                <div className="ss-row-info">
                                    <div style={{fontWeight:600,fontSize:'12px',color:'#1e293b'}}>Calculator Widget</div>
                                    <div className="ss-row-desc">Enable scientific calculator widget</div>
                                </div>
                                <div className="ss-toggle" ref={calcToggleRef}>
                                    <div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── ACCESS PANE ─────────────────────────── */}
                    <div className="ss-tab-pane" ref={paneAccess}>

                        <div className="ss-card">
                            <div className="ss-card-row">
                                <div className="ss-row-info">
                                    <div className="ss-row-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                            <line x1="16" y1="2" x2="16" y2="6"/>
                                            <line x1="8" y1="2" x2="8" y2="6"/>
                                            <line x1="3" y1="10" x2="21" y2="10"/>
                                        </svg>
                                        Scheduled Access
                                    </div>
                                    <div className="ss-row-desc">Restrict test availability window.</div>
                                </div>
                                <div className="ss-toggle" ref={schedToggleRef}>
                                    <div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div>
                                </div>
                            </div>
                            <div className="ss-schedule-fields" ref={schedFieldsRef}>
                                <div className="ss-field-group">
                                    <div className="ss-field-label">Start Date &amp; Time</div>
                                    <div className="ss-field-input" ref={startInputRef}>
                                        <span ref={startTextRef}></span>
                                        <span className="ss-cursor-blink" ref={startCurRef} style={{display:'none'}}></span>
                                    </div>
                                </div>
                                <div className="ss-field-group">
                                    <div className="ss-field-label">End Date &amp; Time</div>
                                    <div className="ss-field-input" ref={endInputRef}>
                                        <span ref={endTextRef}></span>
                                        <span className="ss-cursor-blink" ref={endCurRef} style={{display:'none'}}></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="ss-card">
                            <div className="ss-row-title">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                                </svg>
                                Assign to Class
                            </div>
                            <div className="ss-row-desc">Group this test under a specific class.</div>
                            <div className="ss-select-fake">
                                <span>No Class (General)</span>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </div>
                        </div>

                        <div className="ss-mini-card" style={{marginBottom:'10px'}}>
                            <div className="ss-row-info">
                                <div style={{fontWeight:600,fontSize:'12px',color:'#1e293b'}}>Attempt Limit</div>
                                <div className="ss-row-desc">Restrict users to a single attempt.</div>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                                <span className="ss-attempt-label" ref={attemptLabelRef}>Unlimited</span>
                                <div className="ss-toggle" ref={attemptRef}>
                                    <div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div>
                                </div>
                            </div>
                        </div>

                        <div className="ss-card">
                            <div className="ss-card-row">
                                <div className="ss-row-info">
                                    <div className="ss-row-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="7" width="20" height="14" rx="2"/>
                                            <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/>
                                        </svg>
                                        Start Form
                                    </div>
                                    <div className="ss-row-desc">Collect details before start (Name is default).</div>
                                </div>
                                <div className="ss-toggle" ref={startFormRef}>
                                    <div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div>
                                </div>
                            </div>
                            <div className="ss-start-form-fields" ref={startFormFlds}>
                                <div className="ss-form-field-row" ref={field1RowRef} style={{display:'none'}}>
                                    <div className="ss-form-field-input" ref={field1InputRef}>
                                        <span ref={field1TextRef}></span>
                                        <span className="ss-cursor-blink" ref={field1CurRef} style={{display:'none'}}></span>
                                    </div>
                                </div>
                                <div className="ss-form-field-row" ref={field2RowRef} style={{display:'none'}}>
                                    <div className="ss-form-field-input" ref={field2InputRef}>
                                        <span ref={field2TextRef}></span>
                                        <span className="ss-cursor-blink" ref={field2CurRef} style={{display:'none'}}></span>
                                    </div>
                                </div>
                                <button className="ss-add-field-btn" ref={addFieldBtn1Ref}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="12" y1="5" x2="12" y2="19"/>
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                    Add Field
                                </button>
                                <button className="ss-add-field-btn" ref={addFieldBtn2Ref} style={{display:'none'}}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="12" y1="5" x2="12" y2="19"/>
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                    Add Field
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── RESULTS PANE ─────────────────────────── */}
                    <div className="ss-tab-pane" ref={paneResults}>
                        <div className="ss-result-card">
                            <div className="ss-row-info">
                                <div className="ss-row-title">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M12 8v4l3 3"/>
                                    </svg>
                                    Result Visibility
                                </div>
                                <div className="ss-row-desc">Show detailed analysis immediately after submit.</div>
                            </div>
                            <div className="ss-toggle on">
                                <div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div>
                            </div>
                        </div>
                        <div className="ss-result-card">
                            <div className="ss-row-info">
                                <div className="ss-row-title">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    Strict Timer (Server Side)
                                </div>
                                <div className="ss-row-desc">Prevents timer reset on reload. Uses start timestamp.</div>
                            </div>
                            <div className="ss-toggle" ref={strictTimerRef}>
                                <div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div>
                            </div>
                        </div>
                        <div className="ss-result-card ss-purple-card" style={{flexDirection:'column',alignItems:'flex-start',gap:'8px'}}>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%'}}>
                                <div className="ss-row-info">
                                    <div className="ss-row-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                        Allow Flexible Timer
                                    </div>
                                    <div className="ss-row-desc">Allows test takers to disable the timer before starting.</div>
                                </div>
                                <div className="ss-toggle on" ref={flexTimerRef}><div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div></div>
                            </div>
                            <div className="ss-warn-box">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                </svg>
                                <span><strong>Warning:</strong> Don't forget to turn this off for strict exams.</span>
                            </div>
                        </div>
                        <div className="ss-result-card">
                            <div className="ss-row-info">
                                <div style={{fontWeight:600,fontSize:'12px',color:'#1e293b'}}>Randomize Questions</div>
                                <div className="ss-row-desc">Shuffle question order for every student.</div>
                            </div>
                            <div className="ss-toggle"><div className="ss-toggle-track"><div className="ss-toggle-thumb"></div></div></div>
                        </div>
                    </div>

                </div>{/* end ss-body */}

                {/* FOOTER */}
                <div className="ss-footer">
                    <button className="ss-btn-cancel">Cancel</button>
                    <button className="ss-btn-save" ref={saveBtn}>Save Settings</button>
                </div>

                {/* SUCCESS POPUP */}
                <div className="ss-popup-overlay" ref={popupRef}>
                    <div className="ss-popup-box">
                        <div className="ss-popup-icon">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                        </div>
                        <div className="ss-popup-title">Settings Saved Successfully!</div>
                        <div className="ss-popup-sub">Your test environment is ready for students.</div>
                    </div>
                </div>

                {/* CURSOR */}
                <div className="ss-cursor" ref={cursorRef}>
                    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                        <path d="M4 1L16 13H9L12 22L9 23L6 14L1 19V1H4Z" fill="white" stroke="#1e293b" strokeWidth="1.2"/>
                    </svg>
                </div>

            </div>
        </div>
    );
}
