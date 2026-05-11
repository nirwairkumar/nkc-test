import React, { useEffect, useRef } from 'react';
import { SEO } from '@/components/SEO';

const TermsAndConditions = () => {
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
    }, { threshold: 0.08 });

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

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const top = element.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50 selection:bg-indigo-100 selection:text-indigo-900 leading-relaxed pb-20">
      <SEO
        title="Terms & Conditions — TestoZa"
        description="Terms and Conditions for TestoZa. Learn about the rules and guidelines for using our platform."
        keywords={["terms and conditions", "testoza terms", "legal", "terms of service"]}
      />

      {/* Font Injection for precise matching of the requested user style */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        .font-display { font-family: 'Instrument Serif', Georgia, serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        .reveal-transition { transition: opacity 0.7s ease, transform 0.7s ease; }
      `}} />

      <div className="max-w-3xl mx-auto px-6 font-body pt-24">

        {/* Hero */}
        <section 
          className="pb-12 opacity-0 translate-y-4 reveal-transition"
          ref={addToRefs}
        >
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-indigo-600 dark:text-indigo-400 mb-5">
            <div className="w-6 h-px bg-indigo-600 dark:bg-indigo-400"></div>
            Legal
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-normal leading-tight tracking-tight mb-6 text-slate-900 dark:text-white">
            Terms & Conditions
          </h1>
          <div className="flex flex-wrap gap-4 sm:gap-6 text-[13px] text-slate-500 dark:text-slate-400">
            <span><strong className="text-slate-700 dark:text-slate-300 font-medium">Effective date:</strong> April 10, 2026</span>
            <span><strong className="text-slate-700 dark:text-slate-300 font-medium">Last updated:</strong> April 10, 2026</span>
            <span><strong className="text-slate-700 dark:text-slate-300 font-medium">Version:</strong> 2.0</span>
          </div>
        </section>

        {/* Intro note (Highlight Box) */}
        <div 
          className="border-l-2 border-indigo-500 pl-6 py-5 mb-14 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-r-lg opacity-0 translate-y-4 reveal-transition" 
          ref={addToRefs}
        >
          <p className="text-[15px] text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            <strong className="text-indigo-600 dark:text-indigo-400 font-medium">Plain-language summary:</strong> By using TestoZa, you agree to use the platform responsibly and honestly. You own the content you create, but give us permission to host it. <strong className="text-indigo-600 dark:text-indigo-400 font-medium">Note: Public tests may be used, modified, or monetized by TestoZa.</strong> We are not liable for exam outcomes or results. Violations of these terms — such as cheating or abuse — may result in account suspension. The full details are below.
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 mb-16 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <p className="text-[11px] font-medium tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-5">Contents</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              { id: "s1", num: "01", title: "Acceptance of Terms" },
              { id: "s2", num: "02", title: "Eligibility" },
              { id: "s3", num: "03", title: "Your Account" },
              { id: "s4", num: "04", title: "Acceptable Use" },
              { id: "s5", num: "05", title: "Academic Integrity" },
              { id: "s6", num: "06", title: "Intellectual Property" },
              { id: "s7", num: "07", title: "User-Generated Content" },
              { id: "s8", num: "08", title: "AI Features" },
              { id: "s9", num: "09", title: "Disclaimer of Warranties" },
              { id: "s10", num: "10", title: "Limitation of Liability" },
              { id: "s11", num: "11", title: "Service Availability" },
              { id: "s12", num: "12", title: "Suspension & Termination" },
              { id: "s13", num: "13", title: "Governing Law & Disputes" },
              { id: "s14", num: "14", title: "Changes to These Terms" },
              { id: "s15", num: "15", title: "Contact & Legal Notices" }
            ].map(item => (
              <li key={item.id}>
                <a 
                  href={`#${item.id}`} 
                   onClick={(e) => scrollToSection(e, item.id)}
                  className="flex items-center gap-3 py-1 group"
                >
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium w-4">{item.num}</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400 font-light group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Section 1 */}
        <section id="s1" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">01</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Acceptance of Terms</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            These Terms and Conditions ("Terms") constitute a legally binding agreement between you and TestoZa governing your access to and use of the TestoZa website, mobile applications, and all related services (collectively, the "Platform").
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            By registering an account, accessing the Platform, or using any feature of our services, you confirm that you have read, understood, and agree to be bound by these Terms and our <a href="/privacy-policy" className="text-indigo-600 dark:text-indigo-400 hover:underline">Privacy Policy</a>. If you do not agree to these Terms, you must not use the Platform.
          </p>
        </section>

        {/* Section 2 */}
        <section id="s2" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">02</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Eligibility</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            The Platform is intended for users who are at least 13 years of age. By using the Platform, you represent and warrant that:
          </p>
          <ul className="space-y-3 mb-6">
            {[
              "You are at least 13 years old",
              "If you are between 13 and 18 years of age, you have obtained consent from a parent or legal guardian to use the Platform",
              "You are legally capable of entering into a binding agreement",
              "Your use of the Platform does not violate any applicable law or regulation in your jurisdiction"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            If you are registering on behalf of an institution, coaching centre, or organisation, you represent that you have the authority to bind that entity to these Terms.
          </p>
        </section>

        {/* Section 3 */}
        <section id="s3" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">03</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Your Account</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            To access most features of the Platform, you must create an account. When doing so, you agree to:
          </p>
          <ul className="space-y-3 mb-6">
            <li className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 border-dashed">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
              <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">Provide accurate, complete, and up-to-date information during registration</span>
            </li>
            <li className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 border-dashed">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
              <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">Keep your login credentials confidential and not share them with anyone else</span>
            </li>
            <li className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 border-dashed">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
              <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">Notify us immediately at <a href="mailto:support@testoza.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@testoza.com</a> if you suspect unauthorised access to your account</span>
            </li>
            <li className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
              <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">Take full responsibility for all activities that occur under your account</span>
            </li>
          </ul>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            You may not create accounts for others without their explicit consent, impersonate another person, or use a name or email address that you do not own. We reserve the right to refuse registration or cancel accounts at our discretion.
          </p>
        </section>

        {/* Section 4 */}
        <section id="s4" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">04</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Acceptable Use</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-6">
            You agree to use the Platform only for its intended educational and assessment purposes. The following sets out what is and is not permitted.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-500/20 rounded-lg p-5">
              <p className="text-[11px] font-medium tracking-widest uppercase text-emerald-600 dark:text-emerald-500 mb-3">Permitted</p>
              <div className="space-y-2">
                <div className="flex gap-2 items-start"><span className="text-emerald-600 dark:text-emerald-500 mt-0.5">✓</span><span className="text-[13px] text-slate-600 dark:text-slate-300 font-light">Creating and sharing tests and study materials</span></div>
                <div className="flex gap-2 items-start"><span className="text-emerald-600 dark:text-emerald-500 mt-0.5">✓</span><span className="text-[13px] text-slate-600 dark:text-slate-300 font-light">Attempting tests honestly for practice or evaluation</span></div>
                <div className="flex gap-2 items-start"><span className="text-emerald-600 dark:text-emerald-500 mt-0.5">✓</span><span className="text-[13px] text-slate-600 dark:text-slate-300 font-light">Following and collaborating with other educators</span></div>
                <div className="flex gap-2 items-start"><span className="text-emerald-600 dark:text-emerald-500 mt-0.5">✓</span><span className="text-[13px] text-slate-600 dark:text-slate-300 font-light">Using AI features for personal learning</span></div>
                <div className="flex gap-2 items-start"><span className="text-emerald-600 dark:text-emerald-500 mt-0.5">✓</span><span className="text-[13px] text-slate-600 dark:text-slate-300 font-light">Reporting bugs or policy violations to us</span></div>
              </div>
            </div>
            <div className="bg-rose-50/50 dark:bg-rose-900/10 border border-rose-500/20 rounded-lg p-5">
              <p className="text-[11px] font-medium tracking-widest uppercase text-rose-600 dark:text-rose-500 mb-3">Prohibited</p>
              <div className="space-y-2">
                <div className="flex gap-2 items-start"><span className="text-rose-600 dark:text-rose-500 mt-0.5">✕</span><span className="text-[13px] text-slate-600 dark:text-slate-300 font-light">Cheating, manipulating scores, or exploiting bugs</span></div>
                <div className="flex gap-2 items-start"><span className="text-rose-600 dark:text-rose-500 mt-0.5">✕</span><span className="text-[13px] text-slate-600 dark:text-slate-300 font-light">Bypassing proctoring or tab-monitoring systems</span></div>
                <div className="flex gap-2 items-start"><span className="text-rose-600 dark:text-rose-500 mt-0.5">✕</span><span className="text-[13px] text-slate-600 dark:text-slate-300 font-light">Scraping, copying, or republishing platform content</span></div>
                <div className="flex gap-2 items-start"><span className="text-rose-600 dark:text-rose-500 mt-0.5">✕</span><span className="text-[13px] text-slate-600 dark:text-slate-300 font-light">Uploading harmful, abusive, or misleading content</span></div>
                <div className="flex gap-2 items-start"><span className="text-rose-600 dark:text-rose-500 mt-0.5">✕</span><span className="text-[13px] text-slate-600 dark:text-slate-300 font-light">Attempting to disrupt or overload our systems</span></div>
              </div>
            </div>
          </div>

          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            Violations of these rules may result in immediate account suspension or permanent termination without prior notice. We reserve the right to investigate suspected violations and take appropriate legal action where warranted.
          </p>
        </section>

        {/* Section 5 */}
        <section id="s5" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">05</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Academic Integrity</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            TestoZa is built on the principle of honest, fair assessment. You agree not to engage in any form of academic dishonesty while using the Platform, including but not limited to:
          </p>

          <ul className="space-y-3 mb-6">
            {[
              "Using unauthorised resources, tools, or assistance during a proctored or timed test",
              "Sharing test questions, answers, or content from live exams with others",
              "Allowing another person to take a test on your behalf",
              "Attempting to access another user's test results or account without authorisation",
              "Using automated bots, scripts, or tools to complete tests"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2"></span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>

          <div className="border-l-2 border-amber-500 pl-6 py-5 bg-amber-50/50 dark:bg-amber-900/10 rounded-r-lg">
            <p className="text-[15px] text-amber-900 dark:text-amber-200/80 font-light leading-relaxed">
              <strong className="text-amber-700 dark:text-amber-400 font-medium">Note:</strong> Test results generated on TestoZa are intended for practice and self-assessment only. They do not constitute official academic, competitive, or professional credentials and should not be represented as such to any institution or employer.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section id="s6" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">06</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Intellectual Property</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            All intellectual property rights in the Platform — including software, design, user interface, logos, branding, and proprietary features — are owned exclusively by TestoZa or its licensors. These are protected by applicable copyright, trademark, and intellectual property laws.
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform for its intended purposes. This licence does not permit you to:
          </p>
          <ul className="space-y-3">
            {[
              "Copy, reproduce, or redistribute Platform software or design",
              "Reverse-engineer, decompile, or create derivative works from the Platform",
              "Use our name, logo, or branding without prior written consent",
              "Claim ownership of any part of the Platform or its content"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 7 */}
        <section id="s7" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">07</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">User-Generated Content</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            You retain full ownership of the content you create on the Platform — including tests, questions, notes, and educational materials ("Your Content"). By submitting or publishing Your Content on the Platform, you grant TestoZa a non-exclusive, royalty-free, worldwide licence to host, store, display, and distribute Your Content solely for the purpose of operating and improving the Platform.
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4 bg-indigo-50/30 dark:bg-indigo-950/20 p-4 rounded-lg border-l-2 border-indigo-500">
            <strong className="text-slate-900 dark:text-white font-medium">Public Content Usage:</strong> If you choose to make Your Content (such as tests or materials) **Public** on the Platform, you acknowledge and agree that TestoZa reserves the right to use such content for any purpose at its sole discretion. This includes, without limitation, the right to edit, modify, publish, monetize, sell, distribute, allow other users to copy or conduct exams using said content, or remove it from the Platform without further notice or compensation to you.
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-6">
            This licence for private content ends when you delete Your Content or close your account, except where copies have been made as part of backups or shared by other users.
          </p>
          <p className="font-medium text-[15px] text-slate-800 dark:text-slate-200 mb-3">By submitting Your Content, you represent and warrant that:</p>
          <ul className="space-y-3 mb-6">
            {[
              "You own or have the necessary rights to publish the content",
              "The content does not infringe any third-party intellectual property, privacy, or other rights",
              "The content is accurate, lawful, and not misleading",
              "The content does not contain harmful, abusive, obscene, or illegal material"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            We reserve the right to remove content that violates these Terms or that we reasonably determine to be harmful, inaccurate, or inappropriate, without prior notice.
          </p>
        </section>

        {/* Section 8 */}
        <section id="s8" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">08</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">AI Features</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-6">
            TestoZa includes AI-powered features such as automated test generation from uploaded materials and an AI chatbot on the result page that analyses your performance and suggests study strategies.
          </p>

          <div className="border-l-2 border-indigo-500 pl-6 py-5 mb-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-r-lg">
            <p className="text-[15px] text-slate-600 dark:text-slate-300 font-light leading-relaxed">
              <strong className="text-indigo-600 dark:text-indigo-400 font-medium">Important:</strong> AI-generated content and feedback on the Platform are provided for informational and educational purposes only. They are not a substitute for professional academic guidance, coaching, or counselling. TestoZa does not guarantee the accuracy, completeness, or suitability of any AI-generated output.
            </p>
          </div>

          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            By using AI features, you acknowledge that outputs may occasionally be imperfect or require verification. You agree not to misuse AI features to generate harmful, misleading, or plagiarised content.
          </p>
        </section>

        {/* Section 9 */}
        <section id="s9" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">09</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Disclaimer of Warranties</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            The Platform and all content, tests, results, and services are provided on an "as is" and "as available" basis, without warranties of any kind — express, implied, or statutory.
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            To the fullest extent permitted by applicable law, TestoZa expressly disclaims all warranties, including but not limited to:
          </p>
          <ul className="space-y-3 mb-6">
            {[
              "Warranties of merchantability, fitness for a particular purpose, or non-infringement",
              "Guarantees that the Platform will be uninterrupted, error-free, or free of viruses",
              "Guarantees as to the accuracy, completeness, or reliability of any test, question, score, or result",
              "Guarantees that the Platform will meet your specific academic, competitive, or professional needs"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            Test results on TestoZa are for practice and self-evaluation purposes only. They are not official credentials and must not be used as a substitute for performance in actual examinations.
          </p>
        </section>

        {/* Section 10 */}
        <section id="s10" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">10</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Limitation of Liability</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            To the maximum extent permitted by applicable law, TestoZa, its founders, employees, and service providers shall not be liable for any loss or damage arising out of or in connection with your use of the Platform, including but not limited to:
          </p>
          <ul className="space-y-3 mb-6">
            {[
              "Loss of data, test history, or account content",
              "Academic outcomes, exam results, or career decisions based on Platform usage",
              "Indirect, incidental, consequential, or special damages of any kind",
              "Damages resulting from unauthorised access to your account due to your failure to maintain credential security",
              "Service interruptions, downtime, or technical failures"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>

          <div className="border-l-2 border-rose-500 pl-6 py-5 bg-rose-50/50 dark:bg-rose-900/10 rounded-r-lg">
            <p className="text-[15px] text-rose-900 dark:text-rose-200/80 font-light leading-relaxed">
              <strong className="text-rose-700 dark:text-rose-400 font-medium">Your use of the Platform is entirely at your own risk.</strong> Nothing in these Terms limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.
            </p>
          </div>
        </section>

        {/* Section 11 */}
        <section id="s11" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">11</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Service Availability</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            We aim to make the Platform available at all times, but we do not guarantee uninterrupted access. The Platform may be temporarily unavailable due to:
          </p>
          <ul className="space-y-3 mb-6">
            {[
              "Scheduled maintenance or updates (we will try to notify users in advance where possible)",
              "Unplanned technical issues or infrastructure failures",
              "Circumstances beyond our reasonable control, including natural events, internet outages, or third-party service failures"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            We strongly advise against scheduling critical, high-stakes assessments without a contingency plan. TestoZa shall not be held responsible for any consequences arising from service unavailability during an assessment.
          </p>
        </section>

        {/* Section 12 */}
        <section id="s12" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">12</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Suspension & Termination</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            We reserve the right to suspend or permanently terminate your access to the Platform, with or without prior notice, in cases including but not limited to:
          </p>
          <ul className="space-y-3 mb-6">
            {[
              "Violation of any provision of these Terms",
              "Engaging in cheating, fraud, or academic dishonesty",
              "Uploading content that is harmful, illegal, or infringes third-party rights",
              "Conduct that poses a security threat to the Platform or its users",
              "A legal obligation or order requiring us to do so"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            You may also delete your account at any time by contacting us at <a href="mailto:support@testoza.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@testoza.com</a>. Upon termination, your right to use the Platform ceases immediately. Provisions of these Terms that by their nature should survive termination — including intellectual property, disclaimers, and limitation of liability — will continue to apply.
          </p>
        </section>

        {/* Section 13 */}
        <section id="s13" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">13</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Governing Law & Disputes</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles.
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            In the event of any dispute arising out of or relating to these Terms or your use of the Platform, we encourage you to first contact us at <a href="mailto:support@testoza.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@testoza.com</a> so that we may attempt to resolve the matter amicably.
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            If a dispute cannot be resolved informally, it shall be subject to the exclusive jurisdiction of the competent courts located in India. You agree to submit to the personal jurisdiction of such courts for the purpose of resolving any such dispute.
          </p>
        </section>

        {/* Section 14 */}
        <section id="s14" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">14</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Changes to These Terms</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            We may revise these Terms from time to time to reflect changes in our services, legal requirements, or platform policies. When we make material changes, we will notify you via email or a prominent notice on the Platform at least 7 days before the changes take effect.
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            The "Last updated" date at the top of this page will always reflect the most recent version. Your continued use of the Platform after changes take effect constitutes acceptance of the revised Terms. If you do not agree with the updated Terms, you should stop using the Platform and may request deletion of your account.
          </p>
        </section>

        {/* Section 15 */}
        <section id="s15" className="mb-16 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">15</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Contact & Legal Notices</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-6">
            For general questions, concerns, or feedback about these Terms, or to submit a legal notice, please contact us using the details below. We aim to respond to all legal and compliance-related enquiries within 7 business days.
          </p>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-xl shrink-0">
              ✉️
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-1">Legal & compliance enquiries</p>
              <a href="mailto:support@testoza.com" className="text-indigo-600 dark:text-indigo-400 font-medium text-[15px] hover:underline">
                support@testoza.com
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default TermsAndConditions;
