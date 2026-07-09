import React from "react";
import { SEO } from "@/components/SEO";

const SurveyPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50 selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      <SEO
        title="TestoZa Community Survey – Help Us Improve"
        description="Share your valuable insights and guidance with TestoZa to help us build a better online exam platform for teachers and students."
        canonicalUrl="https://testoza.com/survey"
        keywords={["testoza survey", "feedback", "online testing tools", "education survey"]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Community Survey
          </h1>
          <a href="/" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
            Back to Home
          </a>
        </div>

        {/* Embedded Iframe Container with Premium Glassmorphism styling */}
        <div className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-slate-100/50 dark:shadow-none p-2 sm:p-4">
          <div className="relative w-full overflow-hidden" style={{ minHeight: "600px" }}>
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSfSR7WQGSXNtDNx0JztlWRddL12CAh64nxYn3-4HibqqinXmA/viewform?embedded=true"
              className="w-full min-h-[1600px] sm:min-h-[2350px] border-0"
              title="Google Form Survey"
            >
              Loading…
            </iframe>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyPage;
