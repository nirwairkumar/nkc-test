import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import {
  Sparkles, Share2, BarChart3, ShieldCheck, Clock, Palette, Globe, Award,
  Zap, FileDown, Eye, Maximize, Shuffle, FileText, Layers, Pencil,
  Upload, CheckCircle2, Play, BookOpen, Building, Users, TrendingUp,
  GraduationCap, ArrowRight, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import { useCasePages, type UseCasePageData } from '@/data/seoPages';

const iconMap: Record<string, React.ElementType> = {
  Sparkles, Share2, BarChart3, ShieldCheck, Clock, Palette, Globe, Award,
  Zap, FileDown, Eye, Maximize, Shuffle, FileText, Layers, Pencil,
  Upload, CheckCircle2, Play, BookOpen, Building, Users, TrendingUp,
  GraduationCap
};

const colorMap: Record<string, { bg: string; text: string; darkBg: string; darkText: string; hoverText: string; darkHoverText: string }> = {
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', darkBg: 'dark:bg-indigo-950/50', darkText: 'dark:text-indigo-400', hoverText: 'group-hover:text-indigo-600', darkHoverText: 'dark:group-hover:text-indigo-400' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', darkBg: 'dark:bg-purple-950/50', darkText: 'dark:text-purple-400', hoverText: 'group-hover:text-purple-600', darkHoverText: 'dark:group-hover:text-purple-400' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', darkBg: 'dark:bg-cyan-950/50', darkText: 'dark:text-cyan-400', hoverText: 'group-hover:text-cyan-600', darkHoverText: 'dark:group-hover:text-cyan-400' },
};

function FAQAccordion({ items }: { items: UseCasePageData['faqItems'] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50"
        >
          <button
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <span>{item.question}</span>
            {openIndex === idx ? (
              <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0 ml-4" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0 ml-4" />
            )}
          </button>
          {openIndex === idx && (
            <div className="px-6 pb-5 text-slate-600 dark:text-slate-400 leading-relaxed">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function UseCaseLandingPage() {
  const navigate = useNavigate();
  // Derive slug from the current pathname (e.g., /online-test-maker -> online-test-maker)
  const slug = typeof window !== 'undefined' ? window.location.pathname.replace(/^\//, '').replace(/\/$/, '') : '';
  const pageData = useCasePages.find(p => p.slug === slug);

  if (!pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Page Not Found</h1>
          <p className="text-slate-500 dark:text-slate-400">The page you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pageData.faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };

  return (
    <>
      <SEO
        title={pageData.seoTitle}
        description={pageData.seoDescription}
        canonicalUrl={`https://testoza.com${pageData.canonicalPath}`}
        keywords={pageData.keywords}
        schemas={[faqSchema]}
      />

      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 font-sans">

        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32 bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-transparent border-b border-slate-200/50 dark:border-slate-800/30">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-1/4 left-[10%] w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-[10%] w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 mb-6 font-medium text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{pageData.heroBadge}</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-300 bg-clip-text text-transparent">
              {pageData.heroTitle}<br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{pageData.heroHighlight}</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              {pageData.heroDescription}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/generate-with-ai')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/25"
              >
                <span>Create a Test Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-all"
              >
                <span>Login to Dashboard</span>
              </button>
            </div>

            {/* Trust badges */}
            <div className="mt-16 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Secure & Private</span>
              <span className="flex items-center gap-1.5"><Award className="w-4 h-4" /> Instantly Graded</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> Zero-Setup Required</span>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 md:py-28 bg-white dark:bg-slate-950">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
                Key Features
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                Everything you need to create, conduct, and analyse assessments.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {pageData.features.map((feature, idx) => {
                const Icon = iconMap[feature.icon] || Sparkles;
                const colors = colorMap[feature.color] || colorMap.indigo;

                return (
                  <div key={idx} className="p-8 rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20 hover:border-indigo-500/30 dark:hover:border-indigo-500/20 transition-all group">
                    <div className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.darkBg} ${colors.text} ${colors.darkText} flex items-center justify-center mb-6`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className={`text-xl font-bold mb-3 text-slate-900 dark:text-white ${colors.hoverText} ${colors.darkHoverText} transition-colors`}>
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 md:py-28 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/30">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white leading-tight">
                  {pageData.benefitHeadline}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  {pageData.benefitDescription}
                </p>

                <div className="space-y-4">
                  {pageData.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mt-1 flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ Section */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                  Frequently Asked Questions
                </h3>
                <FAQAccordion items={pageData.faqItems} />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center relative overflow-hidden bg-white dark:bg-slate-950">
          <div className="container mx-auto px-6 max-w-4xl relative z-10">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-slate-900 dark:text-white">
              {pageData.ctaHeadline}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto">
              {pageData.ctaDescription}
            </p>
            <button
              onClick={() => navigate('/generate-with-ai')}
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
