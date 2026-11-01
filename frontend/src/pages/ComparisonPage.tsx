import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { ArrowRight, Check, X, Sparkles, ShieldCheck, Award, Zap } from 'lucide-react';
import { comparisonPages } from '@/data/seoPages';

export default function ComparisonPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const pageData = comparisonPages.find(p => p.slug === slug);

  if (!pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Page Not Found</h1>
          <p className="text-slate-500 dark:text-slate-400">This comparison page doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={pageData.seoTitle}
        description={pageData.seoDescription}
        canonicalUrl={`https://testoza.com/compare/${pageData.slug}`}
        keywords={pageData.keywords}
      />

      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 font-sans">

        {/* Hero */}
        <section className="relative overflow-hidden py-24 md:py-32 bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-transparent border-b border-slate-200/50 dark:border-slate-800/30">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-1/4 left-[10%] w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-[10%] w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 mb-6 font-medium text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Compare Platforms</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-300 bg-clip-text text-transparent">
              TestoZa vs {pageData.competitorName}
            </h1>

            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              {pageData.heroDescription}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/generate-with-ai')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/25"
              >
                <span>Try TestoZa Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-all"
              >
                <span>See Pricing</span>
              </button>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-20 md:py-28 bg-white dark:bg-slate-950">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
                Feature Comparison
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                See how TestoZa compares to {pageData.competitorName} across key features.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-900/80 font-bold text-sm">
                <div className="px-6 py-4 text-slate-700 dark:text-slate-300">Feature</div>
                <div className="px-6 py-4 text-center text-indigo-700 dark:text-indigo-400 border-x border-slate-200 dark:border-slate-700">
                  TestoZa
                </div>
                <div className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                  {pageData.competitorName}
                </div>
              </div>

              {/* Table Rows */}
              {pageData.comparisonRows.map((row, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-3 text-sm ${idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/30'} ${idx < pageData.comparisonRows.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/50' : ''}`}
                >
                  <div className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                    {row.feature}
                  </div>
                  <div className="px-6 py-4 text-center border-x border-slate-100 dark:border-slate-800/50">
                    <span className={`text-sm ${row.testozaWins ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                      {row.testoza}
                    </span>
                  </div>
                  <div className="px-6 py-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                    {row.competitor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Switch */}
        <section className="py-20 md:py-28 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/30">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                Why Switch from {pageData.competitorName} to TestoZa?
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {pageData.whySwitch.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium text-sm">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center relative overflow-hidden bg-white dark:bg-slate-950">
          <div className="container mx-auto px-6 max-w-4xl relative z-10">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-slate-900 dark:text-white">
              Ready to Make the Switch?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto">
              Start free. No credit card needed. Create your first test in under 5 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/generate-with-ai')}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/25"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-all"
              >
                <span>See Pricing</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
