/**
 * Hero animation for /best-online-test-platform: a phone photographs a textbook
 * page, TestoZa reads the questions, the student picks a mode, takes the timed
 * test and sees the score. Five scenes on a loop while the phone is on screen;
 * with reduced motion it simply shows the result.
 *
 * Illustrative only: the question and numbers are examples, not live data.
 */
import { useEffect, useRef, useState } from 'react';

/** How long each scene stays on screen (ms): camera, reading, mode, test, result. */
const SCENE_MS = [2700, 2700, 2600, 3300, 3600];
const LAST = SCENE_MS.length - 1;
const TEST_SCENE = 3;

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function PhotoToTestPhone() {
    const rootRef = useRef<HTMLDivElement>(null);
    const [scene, setScene] = useState(0);
    const [running, setRunning] = useState(false);
    const [seconds, setSeconds] = useState(29 * 60 + 44);

    // Run only while the phone is visible, and never with reduced motion.
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
            setScene(LAST);
            return;
        }
        const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.25 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!running) return;
        const id = window.setTimeout(() => setScene((s) => (s + 1) % SCENE_MS.length), SCENE_MS[scene]);
        return () => window.clearTimeout(id);
    }, [running, scene]);

    // The exam clock ticks only during the test scene.
    useEffect(() => {
        if (scene !== TEST_SCENE || !running) return;
        setSeconds(29 * 60 + 44);
        const id = window.setInterval(() => setSeconds((s) => s - 1), 1000);
        return () => window.clearInterval(id);
    }, [scene, running]);

    const cls = (i: number) => `gd-scene${i === scene ? ' is-on' : i < scene ? ' is-past' : ''}`;

    return (
        <div
            className="gd-stage"
            ref={rootRef}
            role="img"
            aria-label="Animation: a phone photographs a textbook page, TestoZa turns it into questions, the student takes a timed test and sees a score of 78 percent."
        >
            <div className={`gd-chip-float gd-chip-float--a${scene >= 1 && scene <= 2 ? ' is-on' : ''}`} aria-hidden="true">
                <i>✓</i> 12 questions found
            </div>
            <div className={`gd-chip-float gd-chip-float--b${scene === LAST ? ' is-on' : ''}`} aria-hidden="true">
                <i>!</i> Weak topic: Friction
            </div>

            <div className="gd-phone" aria-hidden="true">
                <div className="gd-screen">
                    <div className={`gd-island${scene === TEST_SCENE ? ' is-live' : ''}`}>
                        <span className="gd-island-live">● {fmt(seconds)}</span>
                        <i />
                    </div>
                    <div className={`gd-status${scene === 0 ? ' is-dark' : ''}`}>
                        <span>9:41</span>
                        <span>▮▮▮</span>
                    </div>

                    {/* 1. Camera */}
                    <div className={`${cls(0)} gd-scene--cam`}>
                        <p className="gd-cam-label">PHOTO</p>
                        <div className="gd-cam-page">
                            <b>Chapter 5 · Laws of Motion</b>
                            <p>5.3 Newton’s second law: the rate of change of momentum of a body is proportional to the applied force.</p>
                            <div className="gd-cam-lines" />
                            <div className="gd-cam-fig">
                                <span /> Fig. 5.4 Block on a smooth floor
                            </div>
                        </div>
                        <div className="gd-cam-focus" />
                        <div className="gd-shutter" />
                        <div className="gd-flash" />
                    </div>

                    {/* 2. Reading */}
                    <div className={cls(1)}>
                        <div className="gd-read-head">
                            <div className="gd-read-thumb" />
                            <div style={{ flex: 1 }}>
                                <p className="gd-scene-title" style={{ fontSize: 16 }}>
                                    Reading your page
                                </p>
                                <div className="gd-read-bar">
                                    <i />
                                </div>
                            </div>
                        </div>
                        <ul className="gd-found">
                            <li>Q1 · Newton’s second law</li>
                            <li>Q2 · Force and acceleration</li>
                            <li>Q3 · Block on a smooth floor</li>
                            <li>Q4 · Friction on an incline</li>
                        </ul>
                        <div className="gd-found-count">12 questions found</div>
                    </div>

                    {/* 3. Mode */}
                    <div className={cls(2)}>
                        <p className="gd-scene-title">Make a test</p>
                        <p className="gd-scene-sub">What should we do with this page?</p>
                        <div className="gd-modes">
                            <div className="gd-mode">
                                <b>Extract</b>Keep the questions as printed
                            </div>
                            <div className="gd-mode">
                                <b>Generate</b>Write new questions from the page
                            </div>
                        </div>
                        <div className="gd-seg">
                            <span>English</span>
                            <span>हिन्दी</span>
                            <span>Both</span>
                        </div>
                        <div className="gd-go">Create test</div>
                    </div>

                    {/* 4. Test */}
                    <div className={`${cls(3)} gd-scene--test`}>
                        <div className="gd-test-top">
                            <span>Physics · Q3 of 12</span>
                            <span className="gd-timer">{fmt(seconds)}</span>
                        </div>
                        <span className="gd-marks">+4 / −1</span>
                        <p className="gd-q">A 2 kg block is pulled by a 10 N force on a smooth floor. Its acceleration is</p>
                        <ul className="gd-opts">
                            <li>
                                <i>A</i>2 m/s²
                            </li>
                            <li>
                                <i>B</i>5 m/s²
                            </li>
                            <li>
                                <i>C</i>10 m/s²
                            </li>
                            <li>
                                <i>D</i>20 m/s²
                            </li>
                        </ul>
                        <div className="gd-palette">
                            {Array.from({ length: 12 }, (_, i) => (
                                <span key={i} className={i < 2 ? 'is-done' : i === 2 ? 'is-now' : undefined} />
                            ))}
                        </div>
                    </div>

                    {/* 5. Result */}
                    <div className={`${cls(4)} gd-scene--result`}>
                        <p className="gd-scene-title">Your result</p>
                        <div className="gd-score">
                            <svg viewBox="0 0 148 148">
                                <defs>
                                    <linearGradient id="gd-score-grad" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0" stopColor="#38bdf8" />
                                        <stop offset="1" stopColor="#6366f1" />
                                    </linearGradient>
                                </defs>
                                <circle className="gd-track" cx="74" cy="74" r="54" />
                                <circle className="gd-arc" cx="74" cy="74" r="54" />
                            </svg>
                            <b>
                                78%
                                <small>56 of 72 marks</small>
                            </b>
                        </div>
                        <div className="gd-chips">
                            <span>Accuracy 82%</span>
                            <span>Avg 41 s</span>
                            <span>Rank est.</span>
                        </div>
                        <div className="gd-weak">
                            <b>Practise next: Friction</b>2 of 4 wrong · 70 s per question
                        </div>
                        <div className="gd-go" style={{ width: '100%' }}>
                            Practise weak topics
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
