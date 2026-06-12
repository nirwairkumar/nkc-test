import React, { useEffect, useRef } from 'react';
import { SEO } from '@/components/SEO';

const PrivacyPolicy = () => {
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
      const top = element.getBoundingClientRect().top + window.pageYOffset - 100; // offset for any sticky header if present
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50 selection:bg-indigo-100 selection:text-indigo-900 leading-relaxed pb-20">
      <SEO
        title="Privacy Policy — TestoZa"
        description="Privacy Policy for TestoZa. Learn how we collect, use, and protect your data."
        keywords={["privacy policy", "testoza privacy", "data protection platform"]}
      />

      {/* Font Injection for precise matching of the requested user style */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .font-display { font-family: 'Instrument Serif', Georgia, serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        .reveal-transition { transition: opacity 0.7s ease, transform 0.7s ease; }
      `}} />

      <div className="max-w-3xl mx-auto px-6 font-body pt-24">

        {/* Hero */}
        <section className="pb-12">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-indigo-600 dark:text-indigo-400 mb-5">
            <div className="w-6 h-px bg-indigo-600 dark:bg-indigo-400"></div>
            Legal
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-normal leading-tight tracking-tight mb-6 text-slate-900 dark:text-white">
            Privacy Policy
          </h1>
          <div className="flex flex-wrap gap-4 sm:gap-6 text-[13px] text-slate-500 dark:text-slate-400">
            <span><strong className="text-slate-700 dark:text-slate-300 font-medium">Effective date:</strong> April 10, 2026</span>
            <span><strong className="text-slate-700 dark:text-slate-300 font-medium">Last updated:</strong> April 10, 2026</span>
            <span><strong className="text-slate-700 dark:text-slate-300 font-medium">Version:</strong> 2.0</span>
          </div>
        </section>

        {/* Intro note (Highlight Box) */}
        <div className="border-l-2 border-indigo-500 pl-6 py-5 mb-14 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-r-lg">
          <p className="text-[15px] text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            <strong className="text-indigo-600 dark:text-indigo-400 font-medium">Plain-language summary:</strong> TestoZa collects only the data needed to run the platform. We do not sell your data. You can access, correct, or delete your information at any time by writing to us at <a href="mailto:support@testoza.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@testoza.com</a>. The full details are below.
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 mb-16">
          <p className="text-[11px] font-medium tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-5">Contents</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              { id: "s1", num: "01", title: "Who We Are" },
              { id: "s2", num: "02", title: "Information We Collect" },
              { id: "s3", num: "03", title: "How We Use Your Information" },
              { id: "s4", num: "04", title: "How We Store & Protect Data" },
              { id: "s5", num: "05", title: "Cookies & Tracking Technologies" },
              { id: "s6", num: "06", title: "Sharing Your Information" },
              { id: "s7", num: "07", title: "Your Rights" },
              { id: "s8", num: "08", title: "Children's Privacy" },
              { id: "s9", num: "09", title: "Data Retention" },
              { id: "s10", num: "10", title: "Third-Party Links" },
              { id: "s11", num: "11", title: "Changes to This Policy" },
              { id: "s12", num: "12", title: "Contact Us" }
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
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Who We Are</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            TestoZa ("we", "us", or "our") is a social assessment platform that enables educators to create and conduct structured tests, and enables students to practise, evaluate, and collaborate in a unified digital environment. This Privacy Policy explains how we collect, use, store, and protect personal information when you access or use our website, mobile applications, and related services (collectively, the "Platform").
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            By accessing or using the Platform, you acknowledge that you have read and understood this Privacy Policy and agree to its terms. If you do not agree, please do not use the Platform.
          </p>
        </section>

        {/* Section 2 */}
        <section id="s2" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">02</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Information We Collect</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-6">
            We collect information in three ways — directly from you, automatically as you use the Platform, and from third-party services where applicable.
          </p>

          <p className="font-medium text-[15px] text-slate-800 dark:text-slate-200 mb-3">Information you provide directly</p>
          <ul className="space-y-3 mb-8">
            {[
              "Name, email address, and password when you register an account",
              "Profile details such as display name, photo, and institutional affiliation",
              "Content you create — tests, questions, notes, and other educational materials",
              "Answers, submissions, and responses when you attempt a test",
              "Messages or feedback you send to us directly"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>

          <p className="font-medium text-[15px] text-slate-800 dark:text-slate-200 mb-3">Information collected automatically</p>
          <ul className="space-y-3 mb-8">
            {[
              "Usage data — tests created, attempted, scores, performance history, and interaction logs",
              "Technical data — IP address, browser type, device model, operating system, and session identifiers",
              "Log data — pages visited, features used, timestamps, and error reports",
              "Cookies and similar tracking technologies (see Section 5)"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>

          <p className="font-medium text-[15px] text-slate-800 dark:text-slate-200 mb-3">Information from third parties</p>
          <ul className="space-y-3 mb-4">
            {[
              "If you sign in using a third-party service (such as Google), we receive basic profile information such as your name and email address, in accordance with your permissions on that service",
              "Payment processors may share transaction confirmation details if you use a paid feature"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 3 */}
        <section id="s3" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">03</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">How We Use Your Information</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-6">
            We use the information we collect only for the following purposes:
          </p>

          <ul className="space-y-3 mb-8">
            {[
              "To create and manage your account and authenticate your identity",
              "To enable test creation, scheduling, participation, and result generation",
              "To power AI-assisted features, including performance analysis and personalised recommendations on the result page",
              "To detect and prevent cheating, misuse, fraud, and security incidents",
              "To send essential service communications — such as account updates, security alerts, and exam notifications",
              "To improve the Platform through aggregated, anonymised usage analysis",
              "To respond to your queries, support requests, or feedback",
              "To comply with applicable laws and legal obligations"
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0 border-dashed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
                <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">{text}</span>
              </li>
            ))}
          </ul>

          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
            <p className="text-[14px] text-slate-700 dark:text-slate-300 font-medium">
              We do not use your personal data for advertising, profiling for commercial purposes, or any purpose not listed above.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section id="s4" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">04</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">How We Store & Protect Data</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            All user data is stored on secure, reliable third-party cloud infrastructure using industry-standard security measures, including encryption in transit (TLS/HTTPS) and access controls that limit who within our team can view user data.
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            We take reasonable and appropriate technical and organisational steps to protect your information against unauthorised access, loss, alteration, or disclosure. However, no method of electronic transmission or storage is completely secure, and we cannot guarantee absolute security.
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            In the event of a data breach that is likely to affect your rights, we will notify affected users and, where required by law, the relevant authorities within the timelines required by applicable regulations.
          </p>
        </section>

        {/* Section 5 */}
        <section id="s5" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">05</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Cookies & Tracking Technologies</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-6">
            We use cookies and similar technologies to maintain your login session, remember your preferences, and understand how the Platform is used. Specifically, we use:
          </p>
          <ul className="space-y-4 mb-6">
            <li className="flex gap-3 items-start py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
              <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">
                <strong className="text-slate-800 dark:text-slate-200 font-medium">Essential cookies</strong> — required for core Platform functionality such as keeping you signed in and maintaining test sessions. These cannot be disabled without breaking the Platform.
              </span>
            </li>
            <li className="flex gap-3 items-start py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
              <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">
                <strong className="text-slate-800 dark:text-slate-200 font-medium">Analytics cookies</strong> — used to understand how users interact with the Platform so we can improve it. These are anonymised and aggregated.
              </span>
            </li>
          </ul>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            You may disable non-essential cookies through your browser settings at any time. Please note that disabling essential cookies may prevent certain features from functioning correctly.
          </p>
        </section>

        {/* Section 6 */}
        <section id="s6" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">06</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Sharing Your Information</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-6">
            We do not sell, rent, or trade your personal information to any third party. Information may be shared only in the following limited circumstances:
          </p>
          <ul className="space-y-4 mb-4">
            <li className="flex gap-3 items-start py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
              <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">
                <strong className="text-slate-800 dark:text-slate-200 font-medium">Service providers:</strong> Trusted third-party vendors who assist us in operating the Platform (such as cloud hosting, email delivery, and payment processing) receive only the data necessary for their specific function and are bound by confidentiality obligations.
              </span>
            </li>
            <li className="flex gap-3 items-start py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
              <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">
                <strong className="text-slate-800 dark:text-slate-200 font-medium">Legal requirements:</strong> We may disclose information if required to do so by law, court order, or governmental authority.
              </span>
            </li>
            <li className="flex gap-3 items-start py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
              <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">
                <strong className="text-slate-800 dark:text-slate-200 font-medium">Protection of rights:</strong> We may share information when necessary to protect the safety, rights, or property of TestoZa, its users, or the public.
              </span>
            </li>
            <li className="flex gap-3 items-start py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0 mt-2"></span>
              <span className="text-[15px] text-slate-600 dark:text-slate-300 font-light">
                <strong className="text-slate-800 dark:text-slate-200 font-medium">Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, user data may be transferred as part of that transaction. We will notify affected users before their data becomes subject to a different privacy policy.
              </span>
            </li>
          </ul>
        </section>

        {/* Section 7 */}
        <section id="s7" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">07</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Your Rights</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-8">
            You have the following rights with respect to your personal data. To exercise any of these rights, contact us at <a href="mailto:support@testoza.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@testoza.com</a>. We will respond within a reasonable timeframe and in accordance with applicable law.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
              <p className="font-medium text-[14px] text-slate-800 dark:text-slate-200 mb-1">Access</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 font-light leading-relaxed">Request a copy of the personal data we hold about you.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
              <p className="font-medium text-[14px] text-slate-800 dark:text-slate-200 mb-1">Correction</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 font-light leading-relaxed">Ask us to correct inaccurate or incomplete information.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
              <p className="font-medium text-[14px] text-slate-800 dark:text-slate-200 mb-1">Deletion</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 font-light leading-relaxed">Request that we delete your personal data, subject to legal obligations.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
              <p className="font-medium text-[14px] text-slate-800 dark:text-slate-200 mb-1">Portability</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 font-light leading-relaxed">Request your data in a structured, machine-readable format.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
              <p className="font-medium text-[14px] text-slate-800 dark:text-slate-200 mb-1">Objection</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 font-light leading-relaxed">Object to specific uses of your data where permitted by law.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
              <p className="font-medium text-[14px] text-slate-800 dark:text-slate-200 mb-1">Withdraw consent</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 font-light leading-relaxed">Withdraw any consent you have previously given at any time.</p>
            </div>
          </div>
        </section>

        {/* Section 8 */}
        <section id="s8" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">08</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Children's Privacy</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            The Platform is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13 without verifiable parental or guardian consent.
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            If you are a parent or guardian and believe that your child has provided us with personal information without your consent, please contact us immediately at <a href="mailto:support@testoza.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@testoza.com</a>. Upon verification, we will promptly delete such information from our systems.
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            Users between the ages of 13 and 18 should review this Privacy Policy with a parent or guardian before using the Platform.
          </p>
        </section>

        {/* Section 9 */}
        <section id="s9" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">09</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Data Retention</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            We retain your personal data for as long as your account is active or as needed to provide the Platform's services. If you request deletion of your account, we will delete or anonymise your personal data within a reasonable period, except where we are required to retain it for legal, regulatory, or legitimate business purposes (such as resolving disputes or preventing fraud).
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            Aggregated and anonymised data — which cannot identify you — may be retained indefinitely for analytical and improvement purposes.
          </p>
        </section>

        {/* Section 10 */}
        <section id="s10" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">10</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Third-Party Links</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            The Platform may contain links to third-party websites, tools, or services. This Privacy Policy does not apply to those external sites. We encourage you to review the privacy policies of any third-party services you visit, as we have no control over their data practices and accept no responsibility for them.
          </p>
        </section>

        {/* Section 11 */}
        <section id="s11" className="mb-14 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">11</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Changes to This Policy</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-4">
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or applicable law. When we make significant changes, we will notify you by email or through a prominent notice on the Platform at least 7 days before the changes take effect.
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
            The "Last updated" date at the top of this page will always reflect the most recent version. Continued use of the Platform after changes take effect constitutes your acceptance of the revised Privacy Policy. If you do not agree to the updated policy, you should discontinue use of the Platform and may request deletion of your account.
          </p>
        </section>

        {/* Section 12 */}
        <section id="s12" className="mb-16 opacity-0 translate-y-4 reveal-transition" ref={addToRefs}>
          <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wider">12</span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">Contact Us</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-6">
            If you have any questions, concerns, or requests relating to this Privacy Policy or the way we handle your personal data, please reach out to us. We aim to respond to all privacy-related enquiries within 7 business days.
          </p>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-xl shrink-0">
              ✉️
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-1">Privacy & data enquiries</p>
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

export default PrivacyPolicy;
