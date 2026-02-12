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

        // Physics Symbols
        const symbols = ['π', 'Σ', 'Ω', 'λ', 'μ', 'ħ', 'Ψ', 'φ', 'θ'];

        class Particle {
            x: number;
            y: number;
            size: number;
            speedY: number;
            speedX: number;
            type: 'dot' | 'symbol';
            text?: string;
            opacity: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.opacity = Math.random() * 0.5 + 0.1;
                this.speedY = -(Math.random() * 0.5 + 0.2); // Upward "antigravity"
                this.speedX = (Math.random() - 0.5) * 0.4; // Slight drift

                // 15% chance to be a physics symbol
                if (Math.random() < 0.15) {
                    this.type = 'symbol';
                    this.text = symbols[Math.floor(Math.random() * symbols.length)];
                    this.size = Math.random() * 14 + 10; // 10px-24px
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
