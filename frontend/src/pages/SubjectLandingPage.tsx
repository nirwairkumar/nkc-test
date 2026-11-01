import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import {
  Sparkles, ArrowRight, Check, BookOpen, Atom, Calculator, Leaf, Code,
  Landmark, Globe, Lightbulb, Brain, ShieldCheck, Award, Zap, ChevronRight
} from 'lucide-react';
import { subjectPages, type SubjectPageData } from '@/data/seoPages';

// Note: FlaskConical and IndianRupee may not exist in all lucide versions.
// We map to available alternatives as needed.
const iconMap: Record<string, React.ElementType> = {
  Atom, Calculator, Leaf, BookOpen, Code, Landmark, Globe, Lightbulb, Brain,
  FlaskConical: Sparkles, // fallback
  IndianRupee: Globe, // fallback
};

const colorClasses: Record<string, { badge: string; accent: string; gradient: string }> = {
  blue: { badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', accent: 'text-blue-600 dark:text-blue-400', gradient: 'from-blue-600 to-indigo-600' },
  green: { badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', accent: 'text-green-600 dark:text-green-400', gradient: 'from-green-600 to-emerald-600' },
  purple: { badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', accent: 'text-purple-600 dark:text-purple-400', gradient: 'from-purple-600 to-indigo-600' },
  emerald: { badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', accent: 'text-emerald-600 dark:text-emerald-400', gradient: 'from-emerald-600 to-teal-600' },
  amber: { badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', accent: 'text-amber-600 dark:text-amber-400', gradient: 'from-amber-600 to-orange-600' },
  sky: { badge: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300', accent: 'text-sky-600 dark:text-sky-400', gradient: 'from-sky-600 to-blue-600' },
  orange: { badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', accent: 'text-orange-600 dark:text-orange-400', gradient: 'from-orange-600 to-red-600' },
  teal: { badge: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300', accent: 'text-teal-600 dark:text-teal-400', gradient: 'from-teal-600 to-cyan-600' },
  yellow: { badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', accent: 'text-yellow-600 dark:text-yellow-400', gradient: 'from-yellow-600 to-amber-600' },
  rose: { badge: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300', accent: 'text-rose-600 dark:text-rose-400', gradient: 'from-rose-600 to-pink-600' },
  violet: { badge: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300', accent: 'text-violet-600 dark:text-violet-400', gradient: 'from-violet-600 to-purple-600' },
};

export default function SubjectLandingPage() {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const pageData = subjectPages.find(p => p.slug === subject);

  if (!pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Subject Not Found</h1>
          <p className="text-slate-500 dark:text-slate-400">This subject page doesn't exist yet.</p>
        </div>
      </div>
    );
  }

  const Icon = iconMap[pageData.icon] || Sparkles;
  const colors = colorClasses[pageData.color] || colorClasses.blue;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How to create a ${pageData.name} test online?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Sign up on TestoZa (free), go to "Generate with AI", upload your ${pageData.name} study material (PDF, text, or YouTube video), and AI will generate a complete ${pageData.name} test with answer keys and explanations in under a minute. Review, edit, and publish.`
        }
      },
      {
        '@type': 'Question',
        name: `What question types are supported for ${pageData.name} tests?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `TestoZa supports MCQ (single correct), multiple-select (multiple correct), fill-in-the-blank (text and numerical), and true/false questions for ${pageData.name} assessments. All question types support rich media, LaTeX equations, and detailed explanations.`
        }
      },
      {
        '@type': 'Question',
        name: `Is creating ${pageData.name} tests free on TestoZa?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes. TestoZa's free plan includes unlimited test creation and unlimited students. You can create as many ${pageData.name} tests as you need without any cost.`
        }
      }
    ]
  };

  return (
    <>
      <SEO
        title={pageData.seoTitle}
        description={pageData.seoDescription}
        canonicalUrl={`https://testoza.com/create-test/${pageData.slug}`}
        keywords={pageData.keywords}
        schemas={[faqSchema]}
      />

      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 font-sans">

        {/* Hero */}
        <section className="relative overflow-hidden py-24 md:py-32 bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-transparent border-b border-slate-200/50 dark:border-slate-800/30">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-1/4 left-[10%] w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-[10%] w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10 max-w-5xl text-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.badge} mb-6 font-medium text-sm`}>
              <Icon className="w-4 h-4" />
              <span>{pageData.name} Test Maker</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-300 bg-clip-text text-transparent">
              Create {pageData.name} Tests<br />
              <span className={`bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent`}>Online with AI</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              {pageData.heroDescription}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/generate-with-ai')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/25"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create {pageData.name} Test with AI</span>
              </button>
              <button
                onClick={() => navigate('/create-test')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-all"
              >
                <span>Create Manually</span>
              </button>
            </div>

            <div className="mt-16 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Secure & Private</span>
              <span className="flex items-center gap-1.5"><Award className="w-4 h-4" /> Auto-Graded</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> Free Forever</span>
            </div>
          </div>
        </section>

        {/* Topics Grid */}
        <section className="py-20 md:py-28 bg-white dark:bg-slate-950">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
                {pageData.name} Topics You Can Cover
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                Upload content on any {pageData.name.toLowerCase()} topic and let AI generate assessment-ready questions.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pageData.sampleTopics.map((topic, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${colors.gradient}`}></div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{topic}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Question Types + How It Works */}
        <section className="py-20 md:py-28 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/30">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Question types */}
              <div>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
                  Question Types for {pageData.name}
                </h2>
                <div className="space-y-3">
                  {pageData.questionTypes.map((qt, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{qt}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Fill-in-the-blank (text & numerical)</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">True/False with explanations</span>
                  </div>
                </div>
              </div>

              {/* How it works */}
              <div>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
                  How to Create a {pageData.name} Test
                </h2>
                <div className="space-y-6">
                  {[
                    { step: '1', title: 'Upload Your Content', desc: `Upload ${pageData.name.toLowerCase()} notes, textbook PDFs, or paste a YouTube lecture link.` },
                    { step: '2', title: 'AI Generates Questions', desc: `AI analyses your content and generates diverse ${pageData.name.toLowerCase()} questions with answer keys.` },
                    { step: '3', title: 'Review & Publish', desc: 'Edit any question, adjust difficulty, configure timer and settings, then publish.' },
                    { step: '4', title: 'Share & Grade', desc: 'Share via link or QR code. Students take the test, and results are auto-graded instantly.' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${colors.gradient} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                        {item.step}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{item.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center relative overflow-hidden bg-white dark:bg-slate-950">
          <div className="container mx-auto px-6 max-w-4xl relative z-10">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-slate-900 dark:text-white">
              Start Creating {pageData.name} Tests Now
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto">
              Upload your {pageData.name.toLowerCase()} materials and get a complete test in under 3 minutes. Free forever.
            </p>
            <button
              onClick={() => navigate('/generate-with-ai')}
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/25"
            >
              <span>Create {pageData.name} Test Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
