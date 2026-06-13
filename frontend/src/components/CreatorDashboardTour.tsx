import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, X, Sparkles, Navigation, ArrowRight, CornerRightDown, Pointer } from 'lucide-react';
import { toast } from 'sonner';

// Adjust this vertical offset to shift all tour boxes, highlights, and pointers up or down.
// Negative values shift upwards, positive values shift downwards.
const Y_OFFSET = -8;

interface TourProps {
  tests: any[];
  configuringTest: any;
  conductExamTest: any;
  onSkip: () => void;
  userId?: string;
}

export default function CreatorDashboardTour({
  tests,
  configuringTest,
  conductExamTest,
  onSkip,
  userId
}: TourProps) {
  const getUserKey = (key: string) => userId ? `${key}_${userId}` : key;
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [pointerRect, setPointerRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' }>({ top: 0, left: 0, placement: 'bottom' });
  const requestRef = useRef<number>(0);
  const [clickCount, setClickCount] = useState(0);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (userId) {
      setSettingsSaved(localStorage.getItem(`tour_save_completed_${userId}`) === 'true');
    }
  }, [userId]);

  // Listen to global clicks to trigger step evaluation on tab switches
  useEffect(() => {
    const handleGlobalClick = () => {
      setClickCount(prev => prev + 1);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

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
        const tourCompleted = localStorage.getItem(getUserKey('creator_dashboard_tour_completed')) === 'true';
        const linkCopied = localStorage.getItem(getUserKey('tour_link_copied')) === 'true';
        
        if (linkCopied || tourCompleted) {
          setCurrentStep(0); // Finished
        } else if (settingsSaved) {
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
  }, [exampleTest, configuringTest, conductExamTest, clickCount, settingsSaved]);

  // Track target element position and calculate tooltip placement
  useEffect(() => {
    const updatePosition = () => {
      let highlightSelector = '';
      let pointerSelector = '';
      switch (currentStep) {
        case 1:
          highlightSelector = '#tour-conduct-btn';
          pointerSelector = '#tour-conduct-btn';
          break;
        case 2:
          highlightSelector = '#tour-start-conducting-btn';
          pointerSelector = '#tour-start-conducting-btn';
          break;
        case 3:
          highlightSelector = '#tour-settings-btn-active';
          pointerSelector = '#tour-settings-btn-active';
          break;
        case 4:
          highlightSelector = '#tour-force-fullscreen-container';
          pointerSelector = '#tour-force-fullscreen';
          break;
        case 5:
          highlightSelector = '#tour-tab-switch-container';
          pointerSelector = '#tour-tab-switch';
          break;
        case 6:
          highlightSelector = '#tour-vl-count-radio-container';
          pointerSelector = '#tour-vl-count-radio';
          break;
        case 7:
          highlightSelector = '#tour-tab-access';
          pointerSelector = '#tour-tab-access';
          break;
        case 8:
          highlightSelector = '#tour-attempt-limit-container';
          pointerSelector = '#tour-attempt-limit';
          break;
        case 9:
          highlightSelector = '#tour-start-form-container';
          pointerSelector = '#tour-start-form';
          break;
        case 10:
          highlightSelector = '#tour-tab-results';
          pointerSelector = '#tour-tab-results';
          break;
        case 110:
          highlightSelector = '#tour-flexible-timer-container';
          pointerSelector = '#tour-flexible-timer';
          break;
        case 12:
          highlightSelector = '#tour-save-settings';
          pointerSelector = '#tour-save-settings';
          break;
        case 11:
          highlightSelector = '#tour-copy-link-btn';
          pointerSelector = '#tour-copy-link-btn';
          break;
        default:
          highlightSelector = '';
          pointerSelector = '';
      }

      if (!highlightSelector) {
        setTargetRect(null);
        setPointerRect(null);
        return;
      }

      const hElement = document.querySelector(highlightSelector);
      const pElement = document.querySelector(pointerSelector);
      
      if (hElement) {
        const hRect = hElement.getBoundingClientRect();
        setTargetRect(hRect);

        if (pElement) {
          const pRect = pElement.getBoundingClientRect();
          setPointerRect(pRect);
        } else {
          setPointerRect(hRect);
        }

        // Calculate tooltip position relative to viewport (since container is fixed inset-0)
        const tooltipWidth = 320;
        const tooltipHeight = 180;
        const gap = 38; // Increased gap to prevent overlap and make it look cleaner
        
        let top = hRect.bottom + gap + Y_OFFSET;
        let left = hRect.left + (hRect.width / 2) - (tooltipWidth / 2);
        let placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

        // Check screen boundaries
        if (left < 10) left = 10;
        if (left + tooltipWidth > window.innerWidth - 10) {
          left = window.innerWidth - tooltipWidth - 10;
        }

        // If elements are near bottom of viewport, show tooltip above
        if (hRect.bottom + tooltipHeight + gap > window.innerHeight) {
          top = hRect.top - tooltipHeight - gap + Y_OFFSET;
          placement = 'top';
        }

        setTooltipPos({ top, left, placement });
      } else {
        setTargetRect(null);
        setPointerRect(null);
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
      localStorage.setItem(getUserKey('tour_save_completed'), 'true');
      setSettingsSaved(true);
    }
    prevConfiguringTest.current = configuringTest;
  }, [configuringTest]);

  // Listener to finalize tour when copy link is clicked
  useEffect(() => {
    if (currentStep === 11) {
      const handleCopyClick = () => {
        localStorage.setItem(getUserKey('tour_link_copied'), 'true');
        localStorage.setItem(getUserKey('creator_dashboard_tour_completed'), 'true');
        toast.success("Congratulations! You completed the creator guide! 🚀");
        setTimeout(() => {
          onSkip(); // Cleanly unmount the tour in the parent dashboard!
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
              x={targetRect.left - 12}
              y={targetRect.top - 12 + Y_OFFSET}
              width={targetRect.width + 24}
              height={targetRect.height + 24}
              rx={12}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.42)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Interactive elements highlights */}
      <div
        className="absolute border-2 border-indigo-400 rounded-xl animate-pulse pointer-events-none z-[10000]"
        style={{
          top: targetRect.top - 14 + Y_OFFSET,
          left: targetRect.left - 14,
          width: targetRect.width + 28,
          height: targetRect.height + 28,
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.7)'
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
      {pointerRect && (
        <div
          className="absolute pointer-events-none z-[10002] animate-bounce"
          style={{
            top: pointerRect.top + (pointerRect.height / 2) + Y_OFFSET,
            left: pointerRect.left + (pointerRect.width / 2),
            transform: 'translate(-50%, -50%)'
          }}
        >
          <Pointer className="w-8 h-8 text-indigo-600 drop-shadow-[0_2px_8px_rgba(99,102,241,0.5)] fill-white" />
        </div>
      )}
    </div>
  );
}
