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
            'e = mc²', 'F = ma', 'a² + b² = c²', 'i² = -1', 'PV = nRT',
            '∫ xⁿ dx = (xⁿ⁺¹)/(n+1)', 'dy/dx = k y', 'd/dx(eˣ) = eˣ',
            '∫ eˣ dx = eˣ + C', '∇ × E = -∂B/∂t', 'iħ ∂/∂t |Ψ⟩ = Ĥ |Ψ⟩',
            'f\'(x) = lim(h→0) [f(x+h) - f(x)]/h', 'd/dx(sin x) = cos x',
            '∫(0→∞) e⁻ˣ² dx = √π/2', '∂²u/∂t² = c² ∇²u', 'd/dx(ln x) = 1/x',
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
            chemicalType?: 'benzene' | 'h2o' | 'co2' | 'glucose' | 'benzoic_acid' | 'ethanol';
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
                    const chems: ('benzene' | 'h2o' | 'co2' | 'glucose' | 'benzoic_acid' | 'ethanol')[] = 
                        ['benzene', 'h2o', 'co2', 'glucose', 'benzoic_acid', 'ethanol'];
                    this.chemicalType = chems[Math.floor(Math.random() * chems.length)];
                    // Complex structures get slightly larger size for readability
                    this.size = (this.chemicalType === 'glucose' || this.chemicalType === 'benzoic_acid')
                        ? Math.random() * 6 + 18  // 18px-24px
                        : Math.random() * 8 + 12; // 12px-20px radius
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
                    } else if (this.chemicalType === 'benzoic_acid') {
                        const r = this.size;
                        // Rotated hexagon so vertex is at top
                        ctx.beginPath();
                        for (let i = 0; i < 6; i++) {
                            const angle = (i * Math.PI) / 3 - Math.PI / 2;
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
                            const a1 = (i * Math.PI) / 3 - Math.PI / 2;
                            const a2 = ((i + 1) * Math.PI) / 3 - Math.PI / 2;
                            ctx.moveTo(this.x + r2 * Math.cos(a1), this.y + r2 * Math.sin(a1));
                            ctx.lineTo(this.x + r2 * Math.cos(a2), this.y + r2 * Math.sin(a2));
                        }
                        ctx.stroke();

                        // Carboxyl group at top vertex
                        const topX = this.x;
                        const topY = this.y - r;
                        const cX = topX;
                        const cY = topY - r * 0.45;

                        // C-C bond
                        ctx.beginPath();
                        ctx.moveTo(topX, topY);
                        ctx.lineTo(cX, cY);
                        ctx.stroke();

                        // C=O double bond
                        const o1X = cX + r * 0.35;
                        const o1Y = cY - r * 0.25;
                        ctx.beginPath();
                        ctx.moveTo(cX - 1.5, cY);
                        ctx.lineTo(o1X - 1.5, o1Y);
                        ctx.moveTo(cX + 1.5, cY);
                        ctx.lineTo(o1X + 1.5, o1Y);
                        ctx.stroke();

                        // C-OH single bond
                        const o2X = cX - r * 0.35;
                        const o2Y = cY - r * 0.25;
                        ctx.beginPath();
                        ctx.moveTo(cX, cY);
                        ctx.lineTo(o2X, o2Y);
                        ctx.stroke();

                        // Text labels
                        ctx.font = `${r * 0.45}px sans-serif`;
                        ctx.fillText('O', o1X + 2, o1Y);
                        ctx.fillText('OH', o2X - r * 0.5, o2Y);
                    } else if (this.chemicalType === 'ethanol') {
                        const r = this.size;
                        const p1x = this.x - r * 0.8;
                        const p1y = this.y + r * 0.25;
                        const p2x = this.x - r * 0.1;
                        const p2y = this.y - r * 0.25;
                        const p3x = this.x + r * 0.5;
                        const p3y = this.y + r * 0.25;

                        // Zigzag skeleton line C-C-O
                        ctx.beginPath();
                        ctx.moveTo(p1x, p1y);
                        ctx.lineTo(p2x, p2y);
                        ctx.lineTo(p3x, p3y);
                        ctx.stroke();

                        // Label OH at oxygen vertex
                        ctx.font = `${r * 0.45}px sans-serif`;
                        ctx.fillText('OH', p3x + 2, p3y + 4);
                    } else if (this.chemicalType === 'glucose') {
                        const r = this.size;
                        const vertices: { x: number; y: number }[] = [];
                        for (let i = 0; i < 6; i++) {
                            const angle = (i * Math.PI) / 3 - Math.PI / 6;
                            vertices.push({
                                x: this.x + r * Math.cos(angle),
                                y: this.y + r * Math.sin(angle)
                            });
                        }

                        // Draw pyranose ring
                        ctx.beginPath();
                        // C1-C2-C3-C4-C5
                        ctx.moveTo(vertices[0].x, vertices[0].y);
                        ctx.lineTo(vertices[1].x, vertices[1].y);
                        ctx.lineTo(vertices[2].x, vertices[2].y);
                        ctx.lineTo(vertices[3].x, vertices[3].y);
                        ctx.lineTo(vertices[4].x, vertices[4].y);
                        // C5 to Oxygen (vertex index 5)
                        const oX = vertices[5].x;
                        const oY = vertices[5].y;
                        ctx.lineTo(oX - r * 0.12 * Math.cos(-Math.PI/6), oY - r * 0.12 * Math.sin(-Math.PI/6));
                        ctx.stroke();

                        ctx.beginPath();
                        // C1 to Oxygen
                        ctx.moveTo(vertices[0].x, vertices[0].y);
                        ctx.lineTo(oX + r * 0.12 * Math.cos(-Math.PI/6), oY + r * 0.12 * Math.sin(-Math.PI/6));
                        ctx.stroke();

                        // Oxygen label
                        ctx.font = `bold ${r * 0.38}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('O', oX, oY);

                        // CH2OH group at Carbon 5 (index 4)
                        const c5 = vertices[4];
                        const ch2ohX = c5.x - r * 0.35;
                        const ch2ohY = c5.y - r * 0.45;
                        ctx.beginPath();
                        ctx.moveTo(c5.x, c5.y);
                        ctx.lineTo(ch2ohX, ch2ohY);
                        ctx.stroke();

                        ctx.font = `${r * 0.3}px sans-serif`;
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText('CH₂OH', ch2ohX, ch2ohY);

                        // OH groups at C1, C2, C3, C4
                        const ohDirs = [1, -1, 1, -1];
                        ohDirs.forEach((dir, idx) => {
                            const c = vertices[idx];
                            const endX = c.x;
                            const endY = c.y + dir * r * 0.35;
                            ctx.beginPath();
                            ctx.moveTo(c.x, c.y);
                            ctx.lineTo(endX, endY);
                            ctx.stroke();

                            ctx.font = `${r * 0.28}px sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = dir === 1 ? 'top' : 'bottom';
                            ctx.fillText('OH', endX, endY);
                        });

                        // Restore context text alignment settings
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'alphabetic';
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
            {/* <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ mixBlendMode: 'screen' }}
            /> */}

            {/* Vignette Overlay */}
            <div className="absolute inset-0 bg-radial-gradient(circle at center, transparent 0%, #020617 100%) pointer-events-none opacity-50" />
        </div>
    );
}
