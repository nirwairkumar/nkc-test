import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { getAppUrl } from '@/utils/subdomain';
import { 
  Sparkles, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  GraduationCap, 
  Zap, 
  BarChart3,
  Search,
  Check,
  ShieldCheck,
  Award
} from 'lucide-react';

export default function GoogleAdsLanding() {
  const navigate = useNavigate();

  const handleStartFree = () => {
    window.location.href = getAppUrl('/generate-with-ai');
  };

  const handleLogin = () => {
    window.location.href = getAppUrl('/login');
  };

  return (
    <>
      <SEO
        title="Free AI Test & Exam Generator for Teachers"
        description="Instantly create tests, quizzes, and exams online using AI. Generate assessments from text, PDFs, or YouTube videos. Clean, modern, and distraction-free CBT simulator."
        canonicalUrl="https://testoza.com/quiz-creator"
        keywords={[
          "online test maker for teachers",
          "ai quiz generator",
          "create test from pdf",
          "free online exam maker",
          "computer based test platform",
          "classroom assessment creator"
        ]}
      />

      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 font-sans">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32 bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-transparent border-b border-slate-200/50 dark:border-slate-800/30">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 mb-6 font-medium text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>AI-Powered Test Platform</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-300 bg-clip-text text-transparent">
              Create Exams and Quizzes <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">in Seconds with AI</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              TestoZa is the fastest online assessment platform. Upload your notes, PDFs, or paste a link to generate professional, ready-to-take exams immediately.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={handleStartFree}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/25"
              >
                <span>Create a Test Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={handleLogin}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-all"
              >
                <span>Login to Dashboard</span>
              </button>
            </div>

            {/* Quick trust banner */}
            <div className="mt-16 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Secure & Private</span>
              <span className="flex items-center gap-1.5"><Award className="w-4 h-4" /> Instantly Graded</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> Zero-Setup Required</span>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="py-20 md:py-28 bg-white dark:bg-slate-950">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
                Assess Smarter, Not Harder
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                Discover a suite of tools designed to take the friction out of test creation and grading.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20 hover:border-indigo-500/30 dark:hover:border-indigo-500/20 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  AI Question Generator
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Enter any topic, paste lecture notes, upload a textbook PDF, or use a YouTube URL. Our AI creates customized single-choice, multiple-choice, or numerical questions instantly.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20 hover:border-indigo-500/30 dark:hover:border-indigo-500/20 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Realistic CBT Engine
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Provide students with a clean, standard computer-based test simulator. Ideal for preparing candidates for major competitive exams, term tests, or self-assessment.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20 hover:border-indigo-500/30 dark:hover:border-indigo-500/20 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Instant Auto-Grading
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  No more manual grading. Receive instant reports containing accuracy metrics, performance distribution curves, and solution keys as soon as a student submits.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits & Trust */}
        <section className="py-20 md:py-28 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/30">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white leading-tight">
                  Designed for Teachers, Educators, and Self-Learners
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  Creating test materials manually takes hours of planning, writing, and proofreading. TestoZa shortens this entire cycle into minutes, allowing you to spend more time addressing learning gaps.
                </p>

                <div className="space-y-4">
                  {[
                    "Supports multiple-choice & numerical answer types",
                    "Shuffle questions and options to personalize tests",
                    "Easy schedule and timing controls for student access",
                    "Distraction-free environment that keeps students focused",
                    "Export clean result sheets and performance metrics"
                  ].map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mt-1 flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-lg font-bold text-slate-800 dark:text-slate-200">
                      JS
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Prof. Jayant Sharma</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Physics Faculty, Apex Academy</p>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 italic mb-4 leading-relaxed">
                    "Using TestoZa, I can compile weekly practice worksheets and chapter mock exams in under five minutes. The AI excels at picking up context from my slide uploads and generating highly relevant questions."
                  </p>
                  <div className="flex gap-1 text-amber-500">
                    {"★★★★★".split("").map((star, i) => <span key={i}>{star}</span>)}
                  </div>
                </div>
                
                {/* Decorative mesh */}
                <div className="absolute -inset-4 bg-indigo-500/5 rounded-3xl blur-2xl z-0 pointer-events-none"></div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center relative overflow-hidden bg-white dark:bg-slate-950">
          <div className="container mx-auto px-6 max-w-4xl relative z-10">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-slate-900 dark:text-white">
              Ready to Save Hours of Assessment Time?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto">
              Get started for free. Generate online exams, assign them to students, and view analytical reports today.
            </p>
            <button 
              onClick={handleStartFree}
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/25"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
