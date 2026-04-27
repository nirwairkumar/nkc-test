import React, { useEffect, useRef } from 'react';
import { SEO } from '@/components/SEO';

const AboutPage = () => {
  const revealRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-4');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });


    revealRefs.current.forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50 selection:bg-indigo-100 selection:text-indigo-900 leading-relaxed pb-20">
      <SEO
        title="About — TestoZa"
        description="TestoZa is a social assessment platform where educators can create professional mock tests in minutes."
        keywords={["about testoza", "online test platform", "assessment tool"]}
      />

      {/* Font Injection for precise matching of the requested user style */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        .font-display { font-family: 'Instrument Serif', Georgia, serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        .reveal-transition { transition: opacity 0.7s ease, transform 0.7s ease; }
      `}} />

      <div className="max-w-3xl mx-auto px-6 font-body">

        {/* Hero */}
        <section
          className="pt-24 pb-16 opacity-0 translate-y-4 reveal-transition"
          ref={addToRefs}
        >
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-indigo-600 dark:text-indigo-400 mb-5">
            <div className="w-6 h-px bg-indigo-600 dark:bg-indigo-400"></div>
            About <span style={{ fontFamily: "'Ribeye', serif", letterSpacing: '1.2px' }}>TestoZa</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-normal leading-tight tracking-tight mb-6 text-slate-900 dark:text-white">
            Assessments built for how<br />
            <em className="italic text-slate-600 dark:text-slate-400">India actually studies.</em>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl font-light leading-relaxed">
            TestoZa is a social assessment platform where any educator — with no technical background — can create professional mock tests in minutes, and where students can practice, analyse, and improve with the help of AI.
          </p>
        </section>

        {/* Origin */}
        <section className="opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <p className="text-[11px] font-medium tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-2">Where it started</p>
          <h2 className="font-display text-3xl font-normal tracking-tight mb-4 leading-snug">A student, a real gap, and one stubborn question</h2>

          <p className="text-slate-600 dark:text-slate-300 font-light mb-4">
            Millions of students across India are preparing for competitive exams conducted entirely on computers — JEE Main, NEET, GATE, SSC CGL, IBPS PO, RRB, CUET, UGC NET, and dozens more. The final exam is digital. But the practice? Still happening on photocopied sheets and pen-and-paper answer booklets at most coaching centres.
          </p>

          <div className="flex flex-wrap gap-2 my-6">
            {['JEE Main', 'NEET', 'GATE', 'SSC CGL', 'IBPS PO', 'RRB JE', 'CUET', 'UGC NET'].map(exam => (
              <span key={exam} className="text-xs font-medium px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50 mix-blend-multiply dark:mix-blend-normal">
                {exam}
              </span>
            ))}
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
              + many more
            </span>
          </div>

          <p className="text-slate-600 dark:text-slate-300 font-light mb-6">
            I experienced this myself while preparing for a competitive exam at my coaching centre. My teacher was dedicated and knowledgeable — but conducting a proper computer-based mock test was simply out of reach. It wasn't a lack of effort. Good tools that a non-technical teacher could actually use just didn't exist at a price that made sense.
          </p>

          <div className="border-l-2 border-indigo-500 pl-6 py-4 my-8 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-r-lg">
            <p className="font-display text-xl italic text-slate-800 dark:text-slate-200 mb-2 leading-relaxed">
              "My final exam was going to be on a computer. But every practice test I took was on paper. That gap wasn't anyone's fault — the right tools just didn't exist for people who needed them most."
            </p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">— Founder, <span style={{ fontFamily: "'Ribeye', serif", letterSpacing: '1px' }}>TestoZa</span></p>
          </div>

          <p className="text-slate-600 dark:text-slate-300 font-light">
            That frustration led to one question I couldn't let go of: what if any teacher — someone who just uses their phone for daily tasks — could spin up a proper CBT-style mock test in minutes? And what if students could get honest, detailed feedback the moment they hit submit? TestoZa was built to answer both.
          </p>
        </section>

        <hr className="border-t border-slate-200 dark:border-slate-800 my-12 md:my-16" />

        {/* What we do */}
        <section className="opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <p className="text-[11px] font-medium tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-2">What we do</p>
          <h2 className="font-display text-3xl font-normal tracking-tight mb-4 leading-snug">One platform. Every step of the assessment journey.</h2>
          <p className="text-slate-600 dark:text-slate-300 font-light mb-8">From creating a test to deep performance analysis, TestoZa handles the entire workflow — so educators can focus on teaching, and students can focus on getting better.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-200">
              <span className="text-2xl mb-3 block">✏️</span>
              <p className="font-medium text-sm text-slate-900 dark:text-slate-100 mb-1">Create tests in minutes</p>
              <p className="text-[13px] text-slate-600 dark:text-slate-400 font-light leading-relaxed">Upload a PDF, image, or type directly. AI structures it into a ready-to-share mock test.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-200">
              <span className="text-2xl mb-3 block">🖥️</span>
              <p className="font-medium text-sm text-slate-900 dark:text-slate-100 mb-1">Live CBT environment</p>
              <p className="text-[13px] text-slate-600 dark:text-slate-400 font-light leading-relaxed">Scheduled sessions with tab monitoring, real-time scoring, and zero infrastructure cost.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-200">
              <span className="text-2xl mb-3 block">🤖</span>
              <p className="font-medium text-sm text-slate-900 dark:text-slate-100 mb-1">AI-powered analysis</p>
              <p className="text-[13px] text-slate-600 dark:text-slate-400 font-light leading-relaxed">An AI chatbot on your result page with full performance context — honest insights, strategy, next steps.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-200">
              <span className="text-2xl mb-3 block">🌐</span>
              <p className="font-medium text-sm text-slate-900 dark:text-slate-100 mb-1">Share & discover</p>
              <p className="text-[13px] text-slate-600 dark:text-slate-400 font-light leading-relaxed">Publish tests and notes publicly. Follow educators. Build a community around learning.</p>
            </div>
          </div>
        </section>

        <hr className="border-t border-slate-200 dark:border-slate-800 my-12 md:my-16" />

        {/* Mission */}
        <section className="opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <p className="text-[11px] font-medium tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-2">Our mission</p>
          <h2 className="font-display text-3xl font-normal tracking-tight mb-4 leading-snug">Professional assessment tools for every educator — not just the well-funded ones.</h2>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            Large coaching chains have enterprise software. Everyone else makes do. A dedicated tutor in a small town preparing students for GATE or SSC deserves the same quality of tools as a big-city institute. TestoZa exists to close that gap — without complexity, without high costs, and without needing a tech team to run it.
          </p>
        </section>

        <hr className="border-t border-slate-200 dark:border-slate-800 my-12 md:my-16" />

        {/* Differentiators */}
        <section className="opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <p className="text-[11px] font-medium tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-4">What makes us different</p>
          <ul className="space-y-3">
            {[
              "Create tests from any file format — PDFs, images, documents — with AI assistance",
              "A true CBT-style test environment that mirrors how major exams actually feel",
              "AI chatbot on the result page with full student performance context",
              "Public sharing and discovery of structured academic materials",
              "Built for non-technical users — if you can use a smartphone, you can use <span style={{ fontFamily: 'Ribeye, serif', letterSpacing: '1px' }}>TestoZa</span>",
              "One unified platform for students, educators, and institutions"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">→</span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <hr className="border-t border-slate-200 dark:border-slate-800 my-12 md:my-16" />

        {/* Who */}
        <section className="opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <p className="text-[11px] font-medium tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-4">Who we serve</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-5">
              <p className="text-[11px] font-medium tracking-widest uppercase text-indigo-600 dark:text-indigo-400 mb-2">Students</p>
              <div className="text-[13px] text-slate-600 dark:text-slate-300 font-light leading-relaxed">
                Competitive exam aspirants<br />Self-study learners<br />College & school students
              </div>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-5">
              <p className="text-[11px] font-medium tracking-widest uppercase text-indigo-600 dark:text-indigo-400 mb-2">Educators</p>
              <div className="text-[13px] text-slate-600 dark:text-slate-300 font-light leading-relaxed">
                Independent tutors<br />Coaching institutes<br />School & college teachers
              </div>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-5">
              <p className="text-[11px] font-medium tracking-widest uppercase text-indigo-600 dark:text-indigo-400 mb-2">Institutions</p>
              <div className="text-[13px] text-slate-600 dark:text-slate-300 font-light leading-relaxed">
                EdTech content creators<br />Corporate trainers<br />Certification providers
              </div>
            </div>
          </div>
        </section>

        <hr className="border-t border-slate-200 dark:border-slate-800 my-12 md:my-16" />

        {/* Founder */}
        <section className="opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <p className="text-[11px] font-medium tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-4">The founder</p>
          <div className="flex flex-col sm:flex-row gap-5 items-start bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-medium text-lg border border-indigo-200 dark:border-indigo-800/50 shrink-0">
              NK
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100 text-base mb-1">Nirwair Kumar Chaudhary</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-3">Founder · B.Tech student, IIT Madras</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-light leading-relaxed">
                Built TestoZa from a personal frustration — the missing link between how students practice and how competitive exams are actually conducted. An IIT Madras student who experienced the paper-vs-computer gap firsthand, and decided to fix it.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-t border-slate-200 dark:border-slate-800 my-12 md:my-16" />

        {/* Stage */}
        <section className="opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <p className="text-[11px] font-medium tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-2">Where we are now</p>
          <h2 className="font-display text-3xl font-normal tracking-tight mb-4 leading-snug">Live, growing, and just getting started.</h2>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-6">TestoZa is a fully live product with end-to-end test workflows, public content sharing, and AI-powered result analysis. We're currently focused on refining the experience, expanding our educator community, and building institutional partnerships across India.</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-center">
              <p className="font-display text-2xl text-indigo-600 dark:text-indigo-400 mb-1">Live</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-light">Full platform up & running</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-center">
              <p className="font-display text-2xl text-indigo-600 dark:text-indigo-400 mb-1">AI</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-light">Result chatbot in production</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-center col-span-2 md:col-span-1">
              <p className="font-display text-2xl text-indigo-600 dark:text-indigo-400 mb-1">Growing</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-light">New features shipping weekly</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div
          className="bg-indigo-600 rounded-xl p-10 md:p-12 text-center mt-12 md:mt-16 opacity-0 translate-y-4 reveal-transition shadow-lg shadow-indigo-600/10"
          ref={addToRefs}
        >
          <p className="font-display text-3xl text-white mb-2 tracking-tight">Want to be part of what comes next?</p>
          <p className="text-[15px] text-indigo-100 font-light opacity-90 max-w-lg mx-auto">
            Whether you're a student, an educator, or an institution — there's a place for you on <span style={{ fontFamily: "'Ribeye', serif", letterSpacing: '1px' }}>TestoZa</span>.
          </p>
        </div>

      </div>
    </div>
  );
};

export default AboutPage;
