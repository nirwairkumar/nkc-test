import React, { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let width = 0;
        let height = 0;

        // Physics, Math & Chemistry Symbols & Formulas
        const allSymbols = [
            'π', 'Σ', 'Ω', 'λ', 'μ', 'ħ', 'Ψ', 'φ', 'θ',
            'e = mc²', 'F = ma', 'a² + b² = c²', 'i² = -1', '∫x dx', '∇×E', 'Δx·Δp ≥ ℏ/2', 'E = hν', 'PV = nRT',
            'H₂O', 'CO₂', 'C₆H₁₂O₆', 'CH₄', 'NH₃', 'NaCl'
        ];

        class Particle {
            x: number;
            y: number;
            size: number;
            speedY: number;
            speedX: number;
            type: 'dot' | 'symbol' | 'chemical';
            text?: string;
            chemicalType?: 'benzene' | 'h2o' | 'co2';
            opacity: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.opacity = Math.random() * 0.5 + 0.1;
                this.speedY = -(Math.random() * 0.5 + 0.2); // Upward "antigravity"
                this.speedX = (Math.random() - 0.5) * 0.4; // Slight drift

                const rand = Math.random();
                if (rand < 0.15) {
                    this.type = 'symbol';
                    this.text = allSymbols[Math.floor(Math.random() * allSymbols.length)];
                    this.size = Math.random() * 12 + 10; // 10px-22px
                } else if (rand < 0.25) {
                    this.type = 'chemical';
                    const chems: ('benzene' | 'h2o' | 'co2')[] = ['benzene', 'h2o', 'co2'];
                    this.chemicalType = chems[Math.floor(Math.random() * chems.length)];
                    this.size = Math.random() * 14 + 10; // 10px-24px radius
                } else {
                    this.type = 'dot';
                    this.size = Math.random() * 2 + 1; // 1px-3px dots
                }
            }

            update() {
                this.y += this.speedY;
                this.x += this.speedX;

                // Wrap around
                if (this.y < -50) this.y = height + 50;
                if (this.x < -50) this.x = width + 50;
                if (this.x > width + 50) this.x = -50;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.globalAlpha = this.opacity;

                if (this.type === 'symbol' && this.text) {
                    ctx.font = `${this.size}px serif`;
                    ctx.fillStyle = '#a5b4fc'; // Light Indigo
                    ctx.fillText(this.text, this.x, this.y);
                } else if (this.type === 'chemical') {
                    ctx.strokeStyle = '#a5b4fc';
                    ctx.fillStyle = '#a5b4fc';
                    ctx.lineWidth = 1;
                    
                    if (this.chemicalType === 'benzene') {
                        // Draw hexagon ring
                        ctx.beginPath();
                        const r = this.size;
                        for (let i = 0; i < 6; i++) {
                            const angle = (i * Math.PI) / 3;
                            const px = this.x + r * Math.cos(angle);
                            const py = this.y + r * Math.sin(angle);
                            if (i === 0) ctx.moveTo(px, py);
                            else ctx.lineTo(px, py);
                        }
                        ctx.closePath();
                        ctx.stroke();

                        // Inner double bonds
                        ctx.beginPath();
                        const r2 = r * 0.75;
                        for (let i = 0; i < 6; i += 2) {
                            const a1 = (i * Math.PI) / 3;
                            const a2 = ((i + 1) * Math.PI) / 3;
                            ctx.moveTo(this.x + r2 * Math.cos(a1), this.y + r2 * Math.sin(a1));
                            ctx.lineTo(this.x + r2 * Math.cos(a2), this.y + r2 * Math.sin(a2));
                        }
                        ctx.stroke();
                    } else if (this.chemicalType === 'h2o') {
                        const r = this.size;
                        // Center Oxygen atom
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, r * 0.25, 0, Math.PI * 2);
                        ctx.fill();

                        const angle1 = (104.5 / 2) * Math.PI / 180;
                        const h1x = this.x + r * 0.7 * Math.sin(angle1);
                        const h1y = this.y + r * 0.7 * Math.cos(angle1);
                        const h2x = this.x - r * 0.7 * Math.sin(angle1);
                        const h2y = this.y + r * 0.7 * Math.cos(angle1);

                        // Bonds
                        ctx.beginPath();
                        ctx.moveTo(this.x, this.y);
                        ctx.lineTo(h1x, h1y);
                        ctx.moveTo(this.x, this.y);
                        ctx.lineTo(h2x, h2y);
                        ctx.stroke();

                        // Hydrogen atoms
                        ctx.beginPath();
                        ctx.arc(h1x, h1y, r * 0.15, 0, Math.PI * 2);
                        ctx.arc(h2x, h2y, r * 0.15, 0, Math.PI * 2);
                        ctx.stroke();
                    } else if (this.chemicalType === 'co2') {
                        const r = this.size;
                        // Carbon atom
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, r * 0.22, 0, Math.PI * 2);
                        ctx.fill();

                        // Left Oxygen
                        ctx.beginPath();
                        ctx.arc(this.x - r * 0.6, this.y, r * 0.18, 0, Math.PI * 2);
                        ctx.stroke();

                        // Right Oxygen
                        ctx.beginPath();
                        ctx.arc(this.x + r * 0.6, this.y, r * 0.18, 0, Math.PI * 2);
                        ctx.stroke();

                        // Double bonds
                        ctx.beginPath();
                        ctx.moveTo(this.x - r * 0.4, this.y - 2);
                        ctx.lineTo(this.x + r * 0.4, this.y - 2);
                        ctx.moveTo(this.x - r * 0.4, this.y + 2);
                        ctx.lineTo(this.x + r * 0.4, this.y + 2);
                        ctx.stroke();
                    }
                } else {
                    ctx.fillStyle = '#ffffff';
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        const init = () => {
            width = container.clientWidth;
            height = container.clientHeight;

            // Handle high DPI displays but cap for performance
            const dpr = Math.min(window.devicePixelRatio, 2);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);

            // Responsive particle count
            const particleCount = Math.floor((width * height) / 15000);
            // e.g., 1920*1080 / 15000 ~= 138 particles
            // 375*667 / 15000 ~= 16 particles (mobile)

            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);

            // Update and draw particles
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            // Draw connections (Molecular/Atomic bonds)
            ctx.strokeStyle = '#6366f1'; // Indigo-500
            ctx.lineWidth = 0.5;

            // Optimization: Only check neighbors for a subset or use spatial partitioning
            // For N < 200, simple nested loop is fine for modern devices
            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i];
                // Only connect dots to other dots/symbols
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 100) { // Connection threshold
                        ctx.beginPath();
                        // Opacity based on distance
                        ctx.globalAlpha = (1 - distance / 100) * 0.2;
                        ctx.moveTo(p1.x, p1.y);
                        // If symbol, correct line position roughly (center is text baseline left)
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        // Initial setup
        init();
        animate();

        // Resize handler using ResizeObserver for better performance
        const resizeObserver = new ResizeObserver(() => {
            init();
        });
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden bg-slate-900">
            {/* Background Gradient */}
            <div
                className="absolute inset-0 w-full h-full"
                style={{ background: 'linear-gradient(to top, #0f172a, #312e81)' }}
            />

            {/* Canvas Layer */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ mixBlendMode: 'screen' }}
            />

            {/* Vignette Overlay */}
            <div className="absolute inset-0 bg-radial-gradient(circle at center, transparent 0%, #020617 100%) pointer-events-none opacity-50" />
        </div>
    );
}
