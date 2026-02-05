import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d', { alpha: true }); // optimize: alpha: true is default but being explicit
        if (!ctx) return;

        let animationFrameId: number;
        let isAnimating = false;

        // Set canvas size
        const setCanvasSize = () => {
            const dpr = window.devicePixelRatio || 1;
            // Handle resizing more gracefully
            const { width, height } = container.getBoundingClientRect();

            canvas.width = width * dpr;
            canvas.height = height * dpr;

            // Scale context to match dpr
            ctx.scale(dpr, dpr);

            // Set style width/height
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        };

        setCanvasSize();

        // Debounce resize handler
        let resizeTimeout: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                setCanvasSize();
                initParticles(); // Re-init particles on significant resize
            }, 200);
        };
        window.addEventListener('resize', handleResize);

        // Particle class
        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            opacity: number;
            color: string;
            width: number;
            height: number;

            constructor(w: number, h: number) {
                this.width = w;
                this.height = h;
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.size = Math.random() * 3 + 1;
                this.speedX = (Math.random() - 0.5) * 0.5;
                this.speedY = (Math.random() - 0.5) * 0.5;
                this.opacity = Math.random() * 0.5 + 0.2;

                // Beautiful gradient colors
                const colors = [
                    'rgba(59, 130, 246, ', // blue
                    'rgba(139, 92, 246, ', // purple
                    'rgba(236, 72, 153, ', // pink
                    'rgba(34, 211, 238, ', // cyan
                ];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                // Wrap around edges
                if (this.x > this.width) this.x = 0;
                if (this.x < 0) this.x = this.width;
                if (this.y > this.height) this.y = 0;
                if (this.y < 0) this.y = this.height;
            }

            draw() {
                if (!ctx) return;

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color + this.opacity + ')';
                ctx.fill();

                // Add glow effect - ONLY for larger particles to save performance
                if (this.size > 2.5) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = this.color + this.opacity + ')';
                } else {
                    ctx.shadowBlur = 0;
                }
            }
        }

        // Create particles
        let particles: Particle[] = [];

        const initParticles = () => {
            const { width, height } = container.getBoundingClientRect();
            particles = [];
            // Optimize count for mobile/desktop
            // Reduce count on smaller screens
            const isMobile = width < 768;
            const particleCount = isMobile ? 35 : 80;

            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle(width, height));
            }
        };

        initParticles();

        // Animation loop
        const animate = () => {
            if (!isAnimating) return;

            const { width, height } = container.getBoundingClientRect();

            ctx.clearRect(0, 0, width, height);

            // Draw background explicitly (optional if parent has bg, but ensures clean slate)
            // ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; // This accumulation effect can be heavy
            // Instead, just clear and let CSS handle background gradient, or draw simple overlay

            // Reset composite operation
            ctx.globalCompositeOperation = 'source-over';

            particles.forEach((particle) => {
                particle.update();
                particle.draw();
            });

            // Draw connections between nearby particles
            // Optimization: Use squared distance to avoid Math.sqrt
            // Optimization: Limit connection distance based on screen size
            const connectionDistance = 150;
            const connectionDistanceSq = connectionDistance * connectionDistance;

            // Double loop optimization: start internal loop from next index
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distanceSq = dx * dx + dy * dy;

                    if (distanceSq < connectionDistanceSq) {
                        ctx.beginPath();
                        // Linear interpolation for opacity based on squared distance roughly
                        const opacity = 0.15 * (1 - distanceSq / connectionDistanceSq);

                        ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        // Intersection Observer to pause animation when off-screen
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    if (!isAnimating) {
                        isAnimating = true;
                        animate();
                    }
                } else {
                    isAnimating = false;
                    cancelAnimationFrame(animationFrameId);
                }
            });
        }, { threshold: 0 }); // Trigger as soon as 1 pixel is visible/invisible

        observer.observe(container);

        return () => {
            isAnimating = false;
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            observer.disconnect();
            clearTimeout(resizeTimeout);
        };
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <canvas
                ref={canvasRef}
                className="block w-full h-full"
            />
        </div>
    );
}
