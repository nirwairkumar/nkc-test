import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, X, Sparkles, Navigation, ArrowRight, CornerRightDown } from 'lucide-react';
import { toast } from 'sonner';

interface TourProps {
  tests: any[];
  configuringTest: any;
  conductExamTest: any;
  onSkip: () => void;
}

export default function CreatorDashboardTour({
  tests,
  configuringTest,
  conductExamTest,
  onSkip
}: TourProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' }>({ top: 0, left: 0, placement: 'bottom' });
  const requestRef = useRef<number>(0);

  // Find the example test
  const exampleTest = tests.find(t => t.settings?.is_user_example === true);

  // Helper to check if proctoring is enabled in local settings
  const getActiveTab = () => {
    const accessTab = document.querySelector('#tour-tab-access');
    const resultsTab = document.querySelector('#tour-tab-results');
    
    if (accessTab && accessTab.getAttribute('data-state') === 'active') {
      return 'access';
    }
    if (resultsTab && resultsTab.getAttribute('data-state') === 'active') {
      return 'results';
    }
    return 'proctoring';
  };

  // Determine current step based on application state
  useEffect(() => {
    if (!exampleTest) return;

    const isConducted = !!exampleTest.settings?.conduct_exam;
    
    if (!isConducted) {
      if (!conductExamTest) {
        setCurrentStep(1); // Step 1: Highlight Conduct button
      } else {
        setCurrentStep(2); // Step 2: Highlight Start button in popup
      }
    } else {
      // Test is conducted
      if (!configuringTest) {
        const tourCompleted = localStorage.getItem('creator_dashboard_tour_completed') === 'true';
        const linkCopied = localStorage.getItem('tour_link_copied') === 'true';
        
        if (linkCopied || tourCompleted) {
          setCurrentStep(0); // Finished
        } else if (localStorage.getItem('tour_save_completed') === 'true') {
          setCurrentStep(11); // Step 11: Highlight Copy Link button
        } else {
          setCurrentStep(3); // Step 3: Highlight Settings in active test
        }
      } else {
        // Settings panel is open
        const settings = configuringTest.settings || {};
        const activeTab = getActiveTab();

        if (activeTab === 'proctoring') {
          if (!settings.force_fullscreen) {
            setCurrentStep(4); // Step 4: Highlight Force Fullscreen Switch
          } else if (settings.tab_switch_mode === 'off' || !settings.tab_switch_mode) {
            setCurrentStep(5); // Step 5: Highlight Tab Switch Detection
          } else if (
            settings.violation_limit === null ||
            settings.violation_limit === undefined ||
            settings.violation_limit === 0
          ) {
            setCurrentStep(6); // Step 6: Highlight warnings count option
          } else {
            setCurrentStep(7); // Step 7: Highlight Access & Control Tab
          }
        } else if (activeTab === 'access') {
          if (settings.attempt_limit !== 1) {
            setCurrentStep(8); // Step 8: Highlight Attempt Limit
          } else if (!settings.start_form?.enabled) {
            setCurrentStep(9); // Step 9: Highlight Start Form Switch
          } else {
            setCurrentStep(10); // Step 10: Highlight Results & Timing Tab
          }
        } else if (activeTab === 'results') {
          if (settings.allow_flexible_timer !== false) {
            setCurrentStep(110); // Step 110: Highlight Allow Flexible Timer Switch
          } else {
            setCurrentStep(12); // Step 12: Highlight Save Settings Button
          }
        }
      }
    }
  }, [exampleTest, configuringTest, conductExamTest]);

  // Track target element position and calculate tooltip placement
  useEffect(() => {
    const updatePosition = () => {
      let selector = '';
      switch (currentStep) {
        case 1:
          selector = '#tour-conduct-btn';
          break;
        case 2:
          selector = '#tour-start-conducting-btn';
          break;
        case 3:
          selector = '#tour-settings-btn-active';
          break;
        case 4:
          selector = '#tour-force-fullscreen';
          break;
        case 5:
          selector = '#tour-tab-switch';
          break;
        case 6:
          selector = '#tour-vl-count-radio';
          break;
        case 7:
          selector = '#tour-tab-access';
          break;
        case 8:
          selector = '#tour-attempt-limit';
          break;
        case 9:
          selector = '#tour-start-form';
          break;
        case 10:
          selector = '#tour-tab-results';
          break;
        case 110:
          selector = '#tour-flexible-timer';
          break;
        case 12:
          selector = '#tour-save-settings';
          break;
        case 11:
          selector = '#tour-copy-link-btn';
          break;
        default:
          selector = '';
      }

      if (!selector) {
        setTargetRect(null);
        return;
      }

      const element = document.querySelector(selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        
        // Only update if dimensions/position changed significantly to avoid jitter
        setTargetRect(rect);

        // Calculate tooltip position relative to viewport (since container is fixed inset-0)
        const tooltipWidth = 320;
        const tooltipHeight = 180;
        const gap = 24; // Increased gap to prevent overlap and make it look cleaner
        
        let top = rect.bottom + gap;
        let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        let placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

        // Check screen boundaries
        if (left < 10) left = 10;
        if (left + tooltipWidth > window.innerWidth - 10) {
          left = window.innerWidth - tooltipWidth - 10;
        }

        // If elements are near bottom of viewport, show tooltip above
        if (rect.bottom + tooltipHeight + gap > window.innerHeight) {
          top = rect.top - tooltipHeight - gap;
          placement = 'top';
        }

        setTooltipPos({ top, left, placement });
      } else {
        setTargetRect(null);
      }
    };

    // Run positioning loop
    const loop = () => {
      updatePosition();
      requestRef.current = requestAnimationFrame(loop);
    };
    
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [currentStep, configuringTest, conductExamTest]);

  // Mark save completed when configuringTest gets closed after saving
  const prevConfiguringTest = useRef(configuringTest);
  useEffect(() => {
    if (prevConfiguringTest.current && !configuringTest) {
      // It was saved and closed
      localStorage.setItem('tour_save_completed', 'true');
    }
    prevConfiguringTest.current = configuringTest;
  }, [configuringTest]);

  // Listener to finalize tour when copy link is clicked
  useEffect(() => {
    if (currentStep === 11) {
      const handleCopyClick = () => {
        localStorage.setItem('tour_link_copied', 'true');
        localStorage.setItem('creator_dashboard_tour_completed', 'true');
        toast.success("Congratulations! You completed the creator guide! 🚀");
        setTimeout(() => {
          setCurrentStep(0);
        }, 1500);
      };

      const copyBtn = document.querySelector('#tour-copy-link-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', handleCopyClick);
        return () => copyBtn.removeEventListener('click', handleCopyClick);
      }
    }
  }, [currentStep]);

  if (currentStep === 0 || !targetRect) return null;

  // Render Step Content
  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return {
          title: "🚀 Let's start the tour!",
          desc: "Welcome to TestoZa! Here is your example mock test. Click the Conduct button to activate it and launch a live exam environment.",
          inst: "Click the highlighted Conduct button",
          num: 1,
          max: 11
        };
      case 2:
        return {
          title: "⚡ Go Live!",
          desc: "Excellent! Let's start conducting. Click the Start Conducting button to move the test to active status.",
          inst: "Click Start Conducting",
          num: 2,
          max: 11
        };
      case 3:
        return {
          title: "⚙️ Security Settings",
          desc: "Nice! Your test is now live in Active Exams. Let's customize the cheating protection. Click Settings.",
          inst: "Click Settings",
          num: 3,
          max: 11
        };
      case 4:
        return {
          title: "🖥️ Strict Full Screen",
          desc: "Force Full Screen keeps candidates inside the exam tab. If they try to minimize or exit full screen, it will flag a violation.",
          inst: "Toggle Force Full Screen to ON",
          num: 4,
          max: 11
        };
      case 5:
        return {
          title: "🚫 Block Tab Switching",
          desc: "Tab Switch Detection detects if a candidate switches tabs to search answers. Let's toggle it ON.",
          inst: "Toggle Tab Switch Detection to ON",
          num: 5,
          max: 11
        };
      case 6:
        return {
          title: "⚠️ Max Violation Limits",
          desc: "Now define how many warnings a candidate receives before their test is automatically submitted.",
          inst: "Select the warnings then Submit option",
          num: 6,
          max: 11
        };
      case 7:
        return {
          title: "🔐 Access Rules",
          desc: "Let's configure access control. Click on the Access & Control section tab.",
          inst: "Click the Access & Control Tab",
          num: 7,
          max: 11
        };
      case 8:
        return {
          title: "🎯 Attempt Limits",
          desc: "Enable Attempt Limit to restrict candidates to a single attempt, preventing multiple retries.",
          inst: "Toggle Attempt Limit to ON",
          num: 8,
          max: 11
        };
      case 9:
        return {
          title: "📋 Student Entry Form",
          desc: "Enable Start Form to collect candidate details like Name, Roll No., and Email before starting the test.",
          inst: "Toggle Start Form to ON",
          num: 9,
          max: 11
        };
      case 10:
        return {
          title: "⏱️ Timings & Results",
          desc: "Let's configure the exam timers. Click on the Results & Timing section tab.",
          inst: "Click the Results & Timing Tab",
          num: 10,
          max: 11
        };
      case 110:
        return {
          title: "⌛ Strict Duration",
          desc: "Turn OFF Allow Flexible Timer to make sure all candidates take the exam under a strict countdown timer.",
          inst: "Toggle Allow Flexible Timer to OFF",
          num: 10,
          max: 11
        };
      case 12:
        return {
          title: "💾 Save Configuration",
          desc: "Amazing work! Your secure exam environment is fully configured. Let's save the settings.",
          inst: "Click Save Settings",
          num: 10,
          max: 11
        };
      case 11:
        return {
          title: "🔗 Share Exam Link!",
          desc: "Your secure exam is ready! Click Copy Link to copy the unique link, and send it to your candidates to begin.",
          inst: "Click Copy Link to finish the tour",
          num: 11,
          max: 11
        };
      default:
        return { title: "", desc: "", inst: "", num: 0, max: 11 };
    }
  };

  const stepInfo = getStepContent();

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* SVG Mask Overlay with pointer-events-none to let clicks pass through to highlighted elements */}
      <svg className="w-full h-full absolute inset-0 pointer-events-none">
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - 6}
              y={targetRect.top - 6}
              width={targetRect.width + 12}
              height={targetRect.height + 12}
              rx={8}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.65)"
          mask="url(#tour-mask)"
          className="backdrop-blur-[1px]"
        />
      </svg>

      {/* Interactive elements highlights */}
      <div
        className="absolute border-2 border-indigo-400 rounded-lg animate-pulse pointer-events-none z-[10000]"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          boxShadow: '0 0 16px rgba(99, 102, 241, 0.6)'
        }}
      />

      {/* Floating Tooltip Card */}
      <Card
        className="absolute w-[330px] p-5 shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pointer-events-auto z-[10001] animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-xl"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left
        }}
      >
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-spin" />
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{stepInfo.title}</h4>
          </div>
          <button
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            title="Skip Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
          {stepInfo.desc}
        </p>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-3">
          <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
            Step {stepInfo.num} / {stepInfo.max}
          </div>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded flex items-center gap-1 animate-bounce">
            <Navigation className="w-3 h-3 rotate-90" /> {stepInfo.inst}
          </span>
        </div>
      </Card>

      {/* Bouncing Hand Cursor Indicator */}
      <div
        className="absolute pointer-events-none z-[10002] animate-bounce"
        style={{
          top: targetRect.top + (targetRect.height / 2),
          left: targetRect.left + (targetRect.width / 2),
          transform: 'translate(-50%, -50%)'
        }}
      >
        <svg className="w-8 h-8 text-indigo-500 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 21.5c-1.4 0-2.5-.7-3.2-1.9L3.4 14c-.6-1-.4-2.2.5-3 .9-.8 2.2-.7 3 .2l1.6 1.8V4.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5v7.2c1 .2 1.7.9 1.7 1.8v3.5c0 2.8-2.2 5-5 5zm-3.2-5.5l2.2 2.5c.3.4.8.6 1.2.6 1.7 0 3-1.3 3-3v-3.5c0-.4-.3-.7-.7-.7h-.7V4.5c0-.6-.4-1-1-1s-1 .4-1 1v9.5h-1L6.8 12.3c-.3-.3-.8-.3-1.1 0-.3.3-.3.8 0 1.1l2.1 2.6z"/>
        </svg>
      </div>
    </div>
  );
}
