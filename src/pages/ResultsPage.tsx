import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTest } from '@/contexts/TestContext';
import {
  Trophy,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Home,
  History,
  Timer,
  Target,
  Loader2,
  X,
  Sparkles,
  LayoutDashboard,
  FileText,
  MessageSquare,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { fetchAdvancedAnalysis } from '@/lib/testsApi';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';
import { FeedbackForm } from '@/components/FeedbackForm';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import 'katex/dist/katex.min.css';
import LatexRenderer from '@/components/ui/LatexRenderer';
import TestVoteButtons from '@/components/TestVoteButtons';
import ReactMarkdown from 'react-markdown';
import { AIChatBot } from '@/components/AIChatBot';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface TestResult {
  id: string;
  test_name: string;
  student_name: string;
  marks_scored: number;
  total_marks: number;
  submission_time: string;
}

// Helper to parse marks
const parseMark = (value: string | number | undefined, defaultVal: number = 0): number => {
  if (typeof value === 'number') return value;
  if (!value) return defaultVal;
  try {
    if (value.includes('/')) {
      const parts = value.split('/');
      if (parts.length === 2) {
        return parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultVal : parsed;
  } catch (e) {
    return defaultVal;
  }
};

const getDisplayMark = (value: string | number | undefined, defaultVal: number = 0): string | number => {
  if (value === undefined || value === null || value === '') return defaultVal;
  if (typeof value === 'string' && value.includes('/')) return value;
  const num = parseFloat(value as string);
  return isNaN(num) ? defaultVal : num;
};

const ResultsPage = () => {
  const { studentName: contextStudentName, selectedTest: contextSelectedTest, answers: contextAnswers, resetTest, isTestCompleted } = useTest();
  const navigate = useNavigate();
  const location = useLocation();
  const rawState = location.state;

  const [loading, setLoading] = useState(true);

  const stateData = rawState as {
    test: any;
    answers: Record<number, string>;
    score: number;
    totalQuestions: number;
    marksPerQuestion: number;
    negativeMark: number;
    justSubmitted?: boolean;
  } | undefined;

  const showPersonalResults = !!stateData || (!!contextStudentName && !!contextSelectedTest && isTestCompleted);
  const selectedTest = stateData?.test || contextSelectedTest;

  // Normalize answers
  let answers: Record<number, string> = {};
  if (stateData?.answers) {
    answers = stateData.answers;
  } else if (contextAnswers) {
    answers = contextAnswers as any;
  }

  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [showPopup, setShowPopup] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const showAIChatFromParams = searchParams.get('ai_chat') === 'true';
  const [isAIChatOpen, setIsAIChatOpen] = useState(showAIChatFromParams);

  useEffect(() => {
    if (showAIChatFromParams) {
      setIsAIChatOpen(true);
    }
  }, [showAIChatFromParams]);

  const [popupDismissed, setPopupDismissed] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const justSubmitted = stateData?.justSubmitted;
  const testId = selectedTest?.id;

  const [rankPrediction, setRankPrediction] = useState<string | null>(null);
  const [isPredictingRank, setIsPredictingRank] = useState(false);

  const handlePredictRank = async () => {
    setIsPredictingRank(true);
    setRankPrediction(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/ai/predict-rank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test_title: selectedTest?.title || 'Unknown Test',
          description: selectedTest?.description || '',
          score: analysisData?.finalScore || 0,
          total_marks: analysisData?.totalMaxMarks || 0
        })
      });

      if (!response.ok) {
        throw new Error('Failed to predict rank.');
      }
      const data = await response.json();
      setRankPrediction(data.rank_prediction);
    } catch (err: any) {
      toast.error(err.message || 'Error communicating with AI predictor.');
    } finally {
      setIsPredictingRank(false);
    }
  };

  useEffect(() => {
    const confettiShownKey = testId ? `confetti_shown_${testId}` : null;
    const isAlreadyShown = confettiShownKey ? localStorage.getItem(confettiShownKey) : null;

    if (showPersonalResults && selectedTest && justSubmitted && !isAlreadyShown) {
      if (testId) {
        localStorage.setItem(confettiShownKey!, 'true');
      }
      // Trigger confetti animation on mount
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#FFB6C1', '#FFC0CB', '#FF69B4', '#FFD700', '#FFA500']
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#FFB6C1', '#FFC0CB', '#FF69B4', '#FFD700', '#FFA500']
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [showPersonalResults, selectedTest, justSubmitted, testId]);

  useEffect(() => {
    // Check if popup was already shown for this test in this "session" or permanently
    const popupShownKey = testId ? `feedback_popup_shown_${testId}` : null;
    const isAlreadyShown = popupShownKey ? localStorage.getItem(popupShownKey) : null;

    if (justSubmitted && !popupDismissed && !isAlreadyShown) {
      const timer = setTimeout(() => {
        setShowPopup(true);
      }, 5000); // 5 seconds delay
      return () => clearTimeout(timer);
    }
  }, [justSubmitted, popupDismissed, testId]);

  const handleDismissPopup = () => {
    setIsDismissing(true);
    if (testId) {
      localStorage.setItem(`feedback_popup_shown_${testId}`, 'true');
    }
    // After animation finishes, actually remove it from DOM
    setTimeout(() => {
      setShowPopup(false);
      setPopupDismissed(true);
    }, 600);
  };

  useEffect(() => {
    if (showPersonalResults && selectedTest) {
      const loadAnalysis = async () => {
        setLoading(true);
        try {
          const { data, error } = await fetchAdvancedAnalysis(selectedTest, answers);
          if (error) {
            setError(error);
          } else {
            setAnalysisData(data);
          }
        } catch (err: any) {
          setError(err.message || "Failed to analyze results");
        } finally {
          setLoading(false);
        }
      };
      loadAnalysis();
    }
  }, [showPersonalResults, selectedTest, answers]);

  const handleRetakeTest = () => {
    resetTest();
    navigate('/');
  };

  if (!showPersonalResults) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">No Result Found</h1>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <span className="text-slate-600 font-medium">Calculating Results...</span>
      </div>
    );
  }

  if (error || !analysisData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-xl font-bold text-red-600 mb-4">Failed to process results</h1>
        <p className="text-slate-500 mb-6">{error}</p>
        <Button onClick={() => navigate('/')}>Return Home</Button>
      </div>
    );
  }

  const {
    finalScore = 0,
    totalMaxMarks = 0,
    correctCount = 0,
    partialCount = 0,
    wrongCount = 0,
    skippedCount = 0,
    percentage = 0,
    sectionData = {},
    questionStatus = {},
    mergedSectionData = [],
    topicData = []
  } = analysisData || {};

  const sectionAnalysis = sectionData as Record<string, {
    name: string;
    totalQ: number;
    attempted: number;
    correct: number;
    partial: number;
    wrong: number;
    score: number;
    maxScore: number;
    marksPerQuestion: string | number;
    negativeMarks: string | number;
  }>;

  const allQuestions = selectedTest?.enable_section_mode && selectedTest?.sections
    ? (selectedTest.sections as any[]).flatMap((s: any) => s.questions || [])
    : selectedTest?.questions || [];

  // Determine testId for feedback

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full">
      <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/30 min-h-screen">
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Header Area */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2">
                  <div>
                    <div className="flex items-center gap-3 mt-2 text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5"><Timer className="w-4 h-4" /> Final Submission</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-indigo-600 dark:text-indigo-400">{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {/* Score Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-xl relative overflow-hidden">
                    <CardContent className="p-6 flex flex-col justify-between h-full">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="pr-12 md:pr-0">
                          <h2 className="text-lg md:text-2xl font-semibold opacity-90 leading-tight">{selectedTest?.title}</h2>
                          <p className="text-indigo-100 text-sm md:text-base mt-1">Test Completed Successfully</p>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-4 mt-6">
                        <div className="flex items-end gap-3 md:gap-4">
                          <div>
                            <span className="text-5xl md:text-6xl font-bold">{parseFloat((finalScore || 0).toFixed(2))}</span>
                            <span className="text-xl md:text-2xl opacity-75">/{totalMaxMarks || 0}</span>
                          </div>
                          <div className="mb-1 md:mb-2">
                            <Badge variant="secondary" className="text-sm md:text-lg px-2 md:px-3 py-1">
                              {parseFloat(Number(percentage || 0).toFixed(3))}% Score
                            </Badge>
                          </div>
                        </div>
                        {testId && (
                          <div className="absolute bottom-0 right-0 md:static bg-white/20 backdrop-blur-md rounded-tl-lg md:rounded-full p-0.5 shadow-sm border-t border-l md:border border-white/30 self-end scale-90 md:scale-100 origin-bottom-right z-10 transition-all">
                            <TestVoteButtons testId={testId} className="!bg-transparent rounded-none md:rounded-full" />
                          </div>
                        )}
                      </div>

                      {/* Merged Subject Marks */}
                      {(mergedSectionData as any[]).length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/20">
                          {(mergedSectionData as any[]).map((m: any) => (
                            <div key={m.label}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                 bg-white/10 backdrop-blur-sm border border-white/20">
                              <span className="text-sm font-medium text-white/90">{m.label}</span>
                              <span className="text-sm font-bold text-white">
                                {parseFloat((m.score || 0).toFixed(2))}/{m.maxScore}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="flex flex-col justify-center gap-4 p-6 shadow-md">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-2xl font-bold text-green-700">{correctCount}</span>
                        <span className="text-xs font-medium text-green-600 uppercase">Correct</span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-2xl font-bold text-red-700">{wrongCount}</span>
                        <span className="text-xs font-medium text-red-600 uppercase">Wrong</span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-2xl font-bold text-blue-700">{partialCount}</span>
                        <span className="text-xs font-medium text-blue-600 uppercase">Partial</span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-slate-50 rounded-lg">
                        <span className="text-2xl font-bold text-slate-700">{skippedCount}</span>
                        <span className="text-xs font-medium text-slate-600 uppercase">Skipped</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* AI Rank Predictor */}
                <div className="mt-6 mb-8 relative">
                   <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-800/50 shadow-sm overflow-hidden group">
                     {isPredictingRank && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 animate-pulse">Searching historical data and predicting rank...</p>
                        </div>
                     )}
                     <CardContent className="p-6">
                       <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                         <div className="flex-1">
                           <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-900 dark:text-indigo-300 mb-2">
                             <Sparkles className="w-5 h-5 text-purple-500" />
                             Predict Your Rank with AI ✨
                           </h3>
                           <p className="text-sm text-slate-600 dark:text-slate-400">
                             Estimate your All India Rank based on your score of <strong>{parseFloat((finalScore || 0).toFixed(2))}/{totalMaxMarks}</strong>.
                           </p>
                         </div>
                         <Button 
                           onClick={handlePredictRank} 
                           disabled={isPredictingRank}
                           className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all shrink-0 w-full md:w-auto"
                         >
                           <Trophy className="w-4 h-4 mr-2" /> 
                           Predict My Rank
                         </Button>
                       </div>
                       
                       {rankPrediction && (
                         <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-800 shadow-inner">
                           <div className="prose prose-sm dark:prose-invert prose-indigo max-w-none">
                             <ReactMarkdown>{rankPrediction}</ReactMarkdown>
                           </div>
                         </div>
                       )}
                     </CardContent>
                   </Card>
                </div>

                {/* Section Wise Analysis */}
                {selectedTest?.enable_section_mode && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-black flex items-center gap-2 text-slate-800 dark:text-white">
                      <Target className="w-5 h-5 text-indigo-500" /> Subject-Wise Split
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.values(sectionAnalysis || {}).map((sec: any) => (
                        <Card key={sec.name} className="bg-white dark:bg-slate-900 border-none shadow-lg hover:shadow-xl transition-shadow overflow-hidden group">
                          <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex justify-between items-center text-slate-800 dark:text-slate-100">
                              {sec.name}
                              <span className="text-[10px] font-black px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">{sec.totalQ} Qs</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-500 uppercase">Score</span>
                                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                                  {parseFloat((sec.score || 0).toFixed(2))}
                                  <span className="text-xs text-slate-400 font-medium ml-1">/ {sec.maxScore || 0}</span>
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col items-center bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-lg">
                                  <span className="text-base font-black text-emerald-600 leading-none">{sec.correct}</span>
                                  <span className="text-[8px] font-black text-emerald-600/60 uppercase mt-1">Correct</span>
                                </div>
                                <div className="flex flex-col items-center bg-red-50 dark:bg-red-950/20 p-2 rounded-lg">
                                  <span className="text-base font-black text-red-600 leading-none">{sec.wrong}</span>
                                  <span className="text-[8px] font-black text-red-600/60 uppercase mt-1">Wrong</span>
                                </div>
                                <div className="flex flex-col items-center bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                                  <span className="text-base font-black text-slate-600 dark:text-slate-400 leading-none">{sec.skipped}</span>
                                  <span className="text-[8px] font-black text-slate-500 uppercase mt-1">Split</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'topics' && (
              <motion.div
                key="topics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Topic Wise Analysis (Existing UI moved here) */}
                {topicData && topicData.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black flex items-center gap-2 text-slate-800 dark:text-white">
                          <Sparkles className="w-6 h-6 text-indigo-500" /> Topic Performance
                        </h3>
                        <p className="text-sm text-slate-500 font-medium">Deep dive into your conceptual strengths and weaknesses.</p>
                      </div>
                      <div className="flex gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="px-3 py-1 flex items-center gap-1.5 border-r border-slate-100 dark:border-slate-800">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-black text-slate-600">STRONG: {topicData.filter((t: any) => t.performance === 'Strong').length}</span>
                        </div>
                        <div className="px-3 py-1 flex items-center gap-1.5 border-r border-slate-100 dark:border-slate-800">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-[10px] font-black text-slate-600">MODERATE: {topicData.filter((t: any) => t.performance === 'Moderate').length}</span>
                        </div>
                        <div className="px-3 py-1 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-[10px] font-black text-slate-600">WEAK: {topicData.filter((t: any) => t.performance === 'Weak').length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Topic Performance Chart */}
                    <Card className="p-8 shadow-xl border-none bg-white dark:bg-slate-900 rounded-2xl">
                      <CardHeader className="px-0 pt-0 pb-8">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Relative Topic Performance (%)</CardTitle>
                      </CardHeader>
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topicData} layout="vertical" margin={{ left: 40, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis
                              dataKey="name"
                              type="category"
                              width={120}
                              tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              cursor={{ fill: '#f8fafc', radius: 8 }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 shadow-2xl border border-indigo-100 dark:border-indigo-900 rounded-2xl min-w-[200px]">
                                      <p className="font-black text-slate-800 dark:text-white mb-3 text-sm">{data.name}</p>
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] font-bold text-slate-500 uppercase">Score:</span>
                                          <span className="text-sm font-black text-indigo-600">{data.score} / {data.maxScore}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] font-bold text-slate-500 uppercase">Correct Qs:</span>
                                          <span className="text-sm font-black text-emerald-600">{data.correct}</span>
                                        </div>
                                        <div className="h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                                          <div className="h-full bg-indigo-500" style={{ width: `${data.percentage}%` }} />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="percentage" radius={[0, 8, 8, 0]} barSize={24}>
                              {topicData.map((entry: any, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.performance === 'Strong' ? '#10b981' : entry.performance === 'Moderate' ? '#f59e0b' : '#ef4444'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {topicData.sort((a: any, b: any) => b.percentage - a.percentage).map((topic: any) => {
                        const topicScore = parseFloat((topic.score || 0).toFixed(2));
                        const topicMax = topic.maxScore || 0;
                        const topicPercentage = topic.percentage || 0;
                        const perfColor = topic.performance === 'Strong' ? 'emerald' : topic.performance === 'Moderate' ? 'amber' : 'red';

                        return (
                          <Card key={topic.name} className="group bg-white dark:bg-slate-900 border-none shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden">
                            <div className={`h-2 w-full bg-${perfColor}-500/80`} />
                            <CardContent className="p-6">
                              <div className="flex flex-col gap-5">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-black text-slate-800 dark:text-white leading-tight text-lg">{topic.name}</h4>
                                    <Badge className={`text-[9px] h-4 font-black bg-${perfColor}-50 text-${perfColor}-700 dark:bg-${perfColor}-900/20`}>
                                      {topic.performance}
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{topic.count} Total Qs</p>
                                </div>

                                <div className="flex items-end justify-between">
                                  <div className="space-y-1">
                                    <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                                      {topicScore}
                                      <span className="text-sm font-medium text-slate-400 align-top ml-1">/{topicMax}</span>
                                    </div>
                                    <p className={`text-[10px] font-black text-${perfColor}-600`}>{parseFloat(Number(topicPercentage).toFixed(3))}% Mastered</p>
                                  </div>

                                  <div className="flex gap-2">
                                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                                      <span className="text-sm font-black text-emerald-600 leading-none">{topic.correct}</span>
                                      <span className="text-[7px] font-black text-emerald-500 uppercase mt-1">Hit</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
                                      <span className="text-sm font-black text-red-600 leading-none">{topic.wrong}</span>
                                      <span className="text-[7px] font-black text-red-500 uppercase mt-1">Miss</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${topicPercentage}%` }}
                                    className={`h-full bg-${perfColor}-500 shadow-[0_0_8px_rgba(var(--${perfColor}-500),0.5)]`}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                    <Sparkles className="w-12 h-12 opacity-20" />
                    <p className="font-bold">No topic analysis available for this test yet.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'solution-key' && (
              <motion.div
                key="solution-key"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-1 mb-8">
                  <h3 className="text-2xl font-black flex items-center gap-2 text-slate-800 dark:text-white">
                    <FileText className="w-6 h-6 text-indigo-500" /> Solution Key
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">Step-by-step solutions and detailed explanation for all questions.</p>
                </div>

                <Card className="shadow-2xl border-none bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-wider text-slate-600">
                      <Target className="w-5 h-5" /> Question Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                      {allQuestions.map((q: any, index: number) => {
                        const ans = answers[q.id];

                        // Determine marks for this question (Section Aware)
                        let marks = selectedTest.marks_per_question ? parseMark(selectedTest.marks_per_question, 4) : 4;
                        let neg = selectedTest.negative_marks !== undefined ? parseMark(selectedTest.negative_marks, 1) : 1;

                        // For Display
                        let marksDisplay: string | number = selectedTest.marks_per_question ? getDisplayMark(selectedTest.marks_per_question, 4) : 4;
                        let negDisplay: string | number = selectedTest.negative_marks !== undefined ? getDisplayMark(selectedTest.negative_marks, 1) : 1;

                        if (selectedTest.enable_section_mode && selectedTest.sections) {
                          let rCount = 0;
                          for (const section of selectedTest.sections) {
                            if (index >= rCount && index < rCount + section.questions.length) {
                              marks = parseMark(section.marks_per_question, 4);
                              neg = parseMark(section.negative_marks, 1);
                              marksDisplay = getDisplayMark(section.marks_per_question, 4);
                              negDisplay = getDisplayMark(section.negative_marks, 1);
                              break;
                            }
                            rCount += section.questions.length;
                          }
                        }

                        if (q.marks !== undefined) {
                          marks = parseMark(q.marks, marks);
                          marksDisplay = getDisplayMark(q.marks, marks);
                        }
                        if (q.negativeMarks !== undefined) {
                          neg = parseMark(q.negativeMarks, neg);
                          negDisplay = getDisplayMark(q.negativeMarks, neg);
                        }

                        const qStats = (questionStatus && questionStatus[q.id]) || { status: 'skipped', score: 0 };
                        const isCorrect = qStats.status === 'correct';
                        const isWrong = qStats.status === 'wrong';
                        const isPartial = qStats.status === 'partial';
                        const isSkipped = qStats.status === 'skipped';

                        return (
                          <AccordionItem key={q.id} value={`item-${q.id}`} className="border rounded-lg px-2 data-[state=open]:bg-slate-50">
                            <AccordionTrigger className="hover:no-underline py-3 px-2">
                              <div className="flex items-center gap-4 text-left w-full">
                                <div className={`
                                            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border
                                            ${isCorrect ? 'bg-green-100 text-green-700 border-green-200' : ''}
                                            ${isWrong ? 'bg-red-100 text-red-700 border-red-200' : ''}
                                            ${isSkipped ? 'bg-slate-100 text-slate-500 border-slate-200' : ''}
                                            ${isPartial ? 'bg-blue-100 text-blue-700 border-blue-200' : ''}
                                        `}>
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0 h-6 relative overflow-hidden flex items-center">
                                  <div className="absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap [&_*]:!inline [&_.math]:!inline-block [&_p]:!m-0 [&_span]:!whitespace-nowrap text-slate-700 dark:text-slate-300 pointer-events-none text-sm font-medium">
                                    <LatexRenderer>{q.question || ""}</LatexRenderer>
                                  </div>
                                  {/* Horizontal Fade to prevent sharp cutoff */}
                                  <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none z-10" />
                                </div>
                                <div className="mr-2 flex items-center gap-3">
                                  {/* Marks Display: Obtained / Total */}
                                  {(() => {
                                    const obtainedMark = qStats.score || 0;
                                    // Format for display
                                    const displayObtained = parseFloat(obtainedMark.toFixed(2));
                                    const displayTotal = marksDisplay || 0;

                                    return (
                                      <span className={`text-sm font-bold ${obtainedMark > 0 ? 'text-green-600' : obtainedMark < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                        {displayObtained} / {displayTotal}
                                      </span>
                                    );
                                  })()}
                                  {isCorrect && <Badge className="bg-green-600">Correct</Badge>}
                                  {isWrong && <Badge variant="destructive">Wrong</Badge>}
                                  {isPartial && <Badge className="bg-blue-600">Partial</Badge>}
                                  {isSkipped && <Badge variant="secondary">Skipped</Badge>}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="space-y-4 pt-2">
                                <div className="text-base font-medium text-slate-900 border-l-4 border-primary pl-3">
                                  <LatexRenderer>{q.question || ""}</LatexRenderer>
                                </div>

                                {/* Question Image */}
                                {q.image && (
                                  <div className="my-2">
                                    <img
                                      src={(q.image || "").trim()}
                                      alt={`Question ${index + 1}`}
                                      referrerPolicy="no-referrer"
                                      className="max-w-full max-h-[300px] rounded-lg border object-contain"
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          const errorLink = document.createElement('a');
                                          errorLink.href = (q.image || "").trim();
                                          errorLink.target = "_blank";
                                          errorLink.rel = "noopener noreferrer";
                                          errorLink.className = "text-xs text-blue-600 underline block mt-1";
                                          errorLink.textContent = "View Image (Load Failed)";
                                          parent.appendChild(errorLink);
                                        }
                                      }}
                                    />
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className={`p-3 rounded-md border ${isCorrect ? 'bg-green-50 border-green-200' : isWrong ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Your Answer</span>
                                    <div className={`font-semibold ${isCorrect ? 'text-green-700' : isWrong ? 'text-red-700' : 'text-slate-600'}`}>
                                      {ans ? (
                                        <div className="flex flex-col gap-1">
                                          <span>
                                            {q.type === 'numerical'
                                              ? ans
                                              : Array.isArray(ans)
                                                ? (ans as string[]).join(', ') // Multi
                                                : `${ans}) ` // Single
                                            }
                                            {q.type !== 'numerical' && !Array.isArray(ans) && <LatexRenderer>{q.options[ans]}</LatexRenderer>}
                                          </span>
                                          {q.type !== 'numerical' && !Array.isArray(ans) && q.optionImages?.[ans] && (
                                            <img
                                              src={q.optionImages[ans].trim()}
                                              alt="Your Answer"
                                              referrerPolicy="no-referrer"
                                              className="max-h-[100px] w-auto rounded border bg-white object-contain"
                                              onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                          )}
                                        </div>
                                      ) : 'Not Answered'}
                                    </div>
                                  </div>

                                  <div className="p-3 rounded-md border bg-blue-50 border-blue-100">
                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-500 block mb-1">Correct Answer</span>
                                    <div className="font-semibold text-blue-900 flex flex-col gap-1">
                                      <span>
                                        {q.type === 'numerical' ? (
                                          `Between ${(q.correctAnswer as any).min} and ${(q.correctAnswer as any).max}`
                                        ) : Array.isArray(q.correctAnswer) ? (
                                          (q.correctAnswer as string[]).join(', ')
                                        ) : (
                                          `${q.correctAnswer}) `
                                        )}
                                        {q.type !== 'numerical' && !Array.isArray(q.correctAnswer) && <LatexRenderer>{q.options[q.correctAnswer as string]}</LatexRenderer>}
                                      </span>
                                      {q.type !== 'numerical' && !Array.isArray(q.correctAnswer) && q.optionImages?.[q.correctAnswer as string] && (
                                        <img
                                          src={q.optionImages[q.correctAnswer as string].trim()}
                                          alt="Correct Answer"
                                          referrerPolicy="no-referrer"
                                          className="max-h-[100px] w-auto rounded border bg-white object-contain"
                                          onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'solutions' && (
              <motion.div
                key="solutions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4"
              >
                <CheckCircle className="w-12 h-12 opacity-20" />
                <p className="font-bold">Solutions page content coming soon.</p>
              </motion.div>
            )}

            {activeTab === 'advance-analysis' && (
              <motion.div
                key="advance-analysis"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4"
              >
                <Target className="w-12 h-12 opacity-20" />
                <p className="font-bold">Advance Analysis content coming soon.</p>
              </motion.div>
            )}

            {activeTab === 'feedback' && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-2xl mx-auto"
              >
                {testId && (
                  <div id="feedback-section" className="scroll-mt-24">
                    <div className="space-y-1 mb-8 text-center">
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white">Share Your Feedback</h3>
                      <p className="text-sm text-slate-500 font-medium">Your thoughts help us improve the test quality for everyone.</p>
                    </div>
                    <FeedbackForm
                      testId={testId}
                      studentName={contextStudentName}
                      creatorId={selectedTest?.created_by}
                      testTitle={selectedTest?.title}
                      testCustomId={selectedTest?.custom_id}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="hidden md:block">
          <Footer />
        </div>
      </div>



      {/* Ad-like Sliding Popup */}
      <AnimatePresence>
        {showPopup && testId && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={isDismissing
              ? { x: "-50vw", y: "-20vh", scale: 0, opacity: 0 }
              : { y: 0, opacity: 1, x: 0, scale: 1 }
            }
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="fixed bottom-20 md:bottom-6 right-6 lg:right-12 z-50 w-[350px] shadow-2xl rounded-2xl overflow-hidden border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900"
          >
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 relative">
              <button
                onClick={handleDismissPopup}
                className="absolute top-2 right-2 p-1 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </div>
                <h3 className="text-white font-bold text-lg leading-tight">We value your opinion!</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Help us improve your experience by sharing a quick feedback. It takes less than a minute!
              </p>
              <Button
                onClick={() => {
                  setShowPopup(false);
                  if (testId) {
                    localStorage.setItem(`feedback_popup_shown_${testId}`, 'true');
                  }
                  navigate(`/results/feedback/${testId}`, { state: stateData });
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md h-11"
              >
                Give Feedback
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* TestoZa AI Chatbot */}
      {showPersonalResults && analysisData && selectedTest && (
        <AIChatBot 
          isOpen={isAIChatOpen}
          onOpenChange={(open) => {
             setIsAIChatOpen(open);
             if (!open && showAIChatFromParams) {
                 // Remove ai_chat from params if closed
                 searchParams.delete('ai_chat');
                 setSearchParams(searchParams, { replace: true });
             }
          }}
          testContext={{
            testName: selectedTest.title,
            score: analysisData.finalScore || 0,
            totalMarks: analysisData.totalMaxMarks || 0,
            correct: analysisData.correctCount || 0,
            wrong: analysisData.wrongCount || 0,
            skipped: analysisData.skippedCount || 0,
            accuracy: parseFloat(Number(analysisData.percentage || 0).toFixed(3)),
            topics: analysisData.topicData || []
          }}
        />
      )}
    </div>
  );
};

export default ResultsPage;