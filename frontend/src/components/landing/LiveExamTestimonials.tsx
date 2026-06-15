import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const testimonials = [
    {
        id: 1,
        src: '/testimonials/live-exam-in-coaching-institute.png',
        title: 'Conduct Online Exams in Your Coaching Institute',
    },
    {
        id: 2,
        src: '/testimonials/live-exam-in-school1.png',
        title: 'Conduct Online Exams in Your School',
    },
    {
        id: 3,
        src: '/testimonials/live-exam-in-coaching-institute2.png',
        title: 'Assess Your Students Seamlessly',
    },
    {
        id: 4,
        src: '/testimonials/live-exam-in-school2.png',
        title: 'Empower Your Educational Institution',
    },
];

export default function LiveExamTestimonials() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % testimonials.length);
        }, 5000); // Slide every 5 seconds
        return () => clearInterval(timer);
    }, []);

    return (
        <section className="py-16 bg-slate-50 dark:bg-slate-900/20 overflow-hidden border-b border-slate-100 dark:border-slate-800">
            <div className="container mx-auto px-6 max-w-6xl">
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Trusted by Educators Everywhere
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        See how schools and coaching institutes are transforming their examination processes.
                    </p>
                </div>

                <div className="relative w-full max-w-4xl mx-auto aspect-video md:aspect-[21/9] rounded-2xl overflow-hidden shadow-2xl bg-slate-200 dark:bg-slate-800">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ duration: 0.6, ease: "easeInOut" }}
                            className="absolute inset-0"
                        >
                            {/* Image */}
                            <img
                                src={testimonials[currentIndex].src}
                                alt={testimonials[currentIndex].title}
                                className="w-full h-full object-cover opacity-80"
                            />
                            
                            {/* Dark Overlay for better text readability */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/60" />

                            {/* Text coming from top */}
                            <motion.div
                                initial={{ opacity: 0, y: -50 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="absolute top-0 left-0 right-0 p-8 text-center"
                            >
                                <h3 className="text-2xl md:text-4xl font-bold text-white drop-shadow-md">
                                    {testimonials[currentIndex].title}
                                </h3>
                            </motion.div>

                            {/* Tiny AI Generated Text */}
                            <div className="absolute bottom-4 right-4 text-[10px] text-white/50 bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                                AI Generated
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Dots */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
                        {testimonials.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                    idx === currentIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'
                                }`}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
