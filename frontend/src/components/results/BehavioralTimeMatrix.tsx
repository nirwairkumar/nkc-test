import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Brain, 
  AlertTriangle, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BehavioralTimeMatrixProps {
  questions: any[];
  answers: Record<number | string, any>;
  questionTimes: Record<string | number, number>;
  testDurationMinutes?: number;
  questionStatus?: Record<string | number, { status: string; score: number; time_spent?: number }>;
  onSelectQuestion?: (questionIndex: number) => void;
}

interface MatrixItem {
  index: number;
  question: any;
  timeSpent: number;
  deltaPercent: number;
  status: string;
}

type QuadrantId = 'fast_correct' | 'slow_correct' | 'fast_wrong' | 'time_traps' | 'normal_correct';

export const BehavioralTimeMatrix: React.FC<BehavioralTimeMatrixProps> = ({
  questions,
  answers,
  questionTimes,
  testDurationMinutes = 60,
  questionStatus = {},
  onSelectQuestion
}) => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantId>('time_traps');

  // Format seconds to clean mm:ss or seconds format
  const formatTime = (seconds: number) => {
    const s = Math.round(seconds || 0);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  };

  const totalQuestions = questions.length || 1;
  const durationSeconds = (testDurationMinutes > 500 ? testDurationMinutes : testDurationMinutes * 60) || 3600;
  
  // Theoretical Baseline Pace per question
  const benchmarkPaceSeconds = useMemo(() => {
    return Math.max(15, Math.round(durationSeconds / totalQuestions));
  }, [durationSeconds, totalQuestions]);

  // Analyze each question and bucket into the 4 iOS-style cognitive quadrants
  const matrixData = useMemo(() => {
    const fastCorrect: MatrixItem[] = [];
    const slowCorrect: MatrixItem[] = [];
    const normalCorrect: MatrixItem[] = [];
    const fastWrong: MatrixItem[] = [];
    const timeTraps: MatrixItem[] = [];

    let totalStudentTime = 0;
    let totalAttempted = 0;
    let trapTimeLost = 0;

    questions.forEach((q, idx) => {
      const qKey = q.id || idx;
      const timeSpent = questionTimes[qKey] || questionTimes[idx] || questionTimes[String(idx)] || 0;
      totalStudentTime += timeSpent;

      const qStat = questionStatus[qKey] || questionStatus[idx] || questionStatus[String(idx)];
      const status = qStat?.status || 'skipped';
      const isAttempted = status === 'correct' || status === 'wrong' || status === 'partial';

      if (isAttempted) totalAttempted++;

      const deltaPercent = benchmarkPaceSeconds > 0 
        ? Math.round(((timeSpent - benchmarkPaceSeconds) / benchmarkPaceSeconds) * 100)
        : 0;

      const item = { index: idx, question: q, timeSpent, deltaPercent, status };

      if (status === 'correct') {
        if (timeSpent < 0.8 * benchmarkPaceSeconds) {
          fastCorrect.push(item);
        } else if (timeSpent > 1.2 * benchmarkPaceSeconds) {
          slowCorrect.push(item);
        } else {
          normalCorrect.push(item);
        }
      } else if (status === 'wrong' || status === 'partial') {
        if (timeSpent < 0.8 * benchmarkPaceSeconds) {
          fastWrong.push(item);
        } else if (timeSpent >= 1.6 * benchmarkPaceSeconds) {
          timeTraps.push(item);
          trapTimeLost += timeSpent;
        }
      } else if (status === 'skipped' && timeSpent >= 1.6 * benchmarkPaceSeconds) {
        // Spent significant time and ended up skipping
        timeTraps.push(item);
        trapTimeLost += timeSpent;
      }
    });

    const avgPace = totalAttempted > 0 ? Math.round(totalStudentTime / totalAttempted) : 0;
    const paceEfficiency = benchmarkPaceSeconds > 0 ? Math.round((benchmarkPaceSeconds / (avgPace || 1)) * 100) : 100;

    return {
      fastCorrect,
      slowCorrect,
      normalCorrect,
      fastWrong,
      timeTraps,
      avgPace,
      totalStudentTime,
      totalAttempted,
      trapTimeLost,
      paceEfficiency: Math.min(200, Math.max(20, paceEfficiency))
    };
  }, [questions, questionTimes, questionStatus, benchmarkPaceSeconds]);

  // Quadrant configurations
  const quadrantsConfig = [
    {
      id: 'fast_correct' as QuadrantId,
      title: 'Fast & Accurate',
      subtitle: 'Instant Recall & Mastered',
      count: matrixData.fastCorrect.length,
      items: matrixData.fastCorrect,
      icon: Zap,
      accentColor: 'emerald',
      bgColor: 'bg-emerald-50/80 dark:bg-emerald-950/20',
      borderColor: 'border-emerald-200/80 dark:border-emerald-800/40',
      activeRing: 'ring-2 ring-emerald-500/80 shadow-emerald-500/10',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
      description: `Solved correctly in < ${formatTime(0.8 * benchmarkPaceSeconds)} (20% faster than benchmark pace).`
    },
    {
      id: 'slow_correct' as QuadrantId,
      title: 'Slow & Accurate',
      subtitle: 'High Cognitive Load',
      count: matrixData.slowCorrect.length,
      items: matrixData.slowCorrect,
      icon: Brain,
      accentColor: 'amber',
      bgColor: 'bg-amber-50/80 dark:bg-amber-950/20',
      borderColor: 'border-amber-200/80 dark:border-amber-800/40',
      activeRing: 'ring-2 ring-amber-500/80 shadow-amber-500/10',
      textColor: 'text-amber-700 dark:text-amber-400',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      description: `Solved correctly but took > ${formatTime(1.2 * benchmarkPaceSeconds)}. Needs speed drills.`
    },
    {
      id: 'fast_wrong' as QuadrantId,
      title: 'Fast & Careless',
      subtitle: 'Rushed / Arithmetic Slip',
      count: matrixData.fastWrong.length,
      items: matrixData.fastWrong,
      icon: AlertTriangle,
      accentColor: 'rose',
      bgColor: 'bg-rose-50/80 dark:bg-rose-950/20',
      borderColor: 'border-rose-200/80 dark:border-rose-800/40',
      activeRing: 'ring-2 ring-rose-500/80 shadow-rose-500/10',
      textColor: 'text-rose-700 dark:text-rose-400',
      badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
      description: `Marked wrong rapidly in < ${formatTime(0.8 * benchmarkPaceSeconds)}. Indicates misreading prompt or silly slips.`
    },
    {
      id: 'time_traps' as QuadrantId,
      title: 'Time Traps / Stuck',
      subtitle: 'High-Cost Time Sinks',
      count: matrixData.timeTraps.length,
      items: matrixData.timeTraps,
      icon: Clock,
      accentColor: 'slate',
      bgColor: 'bg-slate-100/90 dark:bg-slate-900/60',
      borderColor: 'border-slate-300/80 dark:border-slate-700/60',
      activeRing: 'ring-2 ring-purple-600/80 shadow-purple-500/10',
      textColor: 'text-purple-900 dark:text-purple-300',
      badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
      description: `Spent > ${formatTime(1.6 * benchmarkPaceSeconds)} and still missed or skipped. #1 score leakage.`
    }
  ];

  const currentQuadrantConfig = quadrantsConfig.find(q => q.id === selectedQuadrant) || quadrantsConfig[0];

  return (
    <div className="space-y-6 pt-2">
      {/* Section Header: iOS style with soft pill and clean typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Time & Cognitive Matrix
            </h3>
            <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40 rounded-full px-2 py-0.5">
              Behavioral
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 ml-10">
            Psychometric speed-to-accuracy trade-off across your exam timeline.
          </p>
        </div>

        {/* Dynamic Baseline Capsule */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-xs font-medium text-slate-600 dark:text-slate-300">
          <Timer className="w-3.5 h-3.5 text-indigo-500" />
          <span>Benchmark Pace:</span>
          <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{formatTime(benchmarkPaceSeconds)}/Q</span>
        </div>
      </div>

      {/* Primary iOS Health-Inspired KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Metric 1: Avg Speed vs Benchmark */}
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-xs overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Your Average Pace</span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-50 font-mono">
                {formatTime(matrixData.avgPace)}
                <span className="text-xs font-normal text-slate-400 ml-1">/Q</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {matrixData.avgPace <= benchmarkPaceSeconds 
                  ? `⚡ ${formatTime(benchmarkPaceSeconds - matrixData.avgPace)} faster than baseline`
                  : `⏳ ${formatTime(matrixData.avgPace - benchmarkPaceSeconds)} slower than baseline`}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100/80 dark:border-indigo-800/40">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Time Traps Loss */}
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-xs overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Time Sunk in Traps</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {formatTime(matrixData.trapTimeLost)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {matrixData.timeTraps.length} questions took {'>'} 1.6x expected time
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100/80 dark:border-rose-800/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Quick Hit Mastery */}
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-xs overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Mastery Precision</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {matrixData.fastCorrect.length}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {totalQuestions} Qs</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Fast & 100% accurate strikes
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100/80 dark:border-emerald-800/40">
              <Zap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4 iOS-Style Interactive Quadrant Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {quadrantsConfig.map((q) => {
          const Icon = q.icon;
          const isSelected = selectedQuadrant === q.id;

          return (
            <motion.button
              key={q.id}
              onClick={() => setSelectedQuadrant(q.id)}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              className={`text-left p-4 rounded-3xl transition-all duration-200 border relative overflow-hidden backdrop-blur-xl ${q.bgColor} ${q.borderColor} ${isSelected ? `${q.activeRing} shadow-md` : 'shadow-2xs opacity-90 hover:opacity-100'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${q.badgeBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xl font-black font-mono ${q.textColor}`}>
                  {q.count}
                </span>
              </div>

              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {q.title}
                </h4>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
                  {q.subtitle}
                </p>
              </div>

              {isSelected && (
                <div className="absolute bottom-1.5 right-3 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Interactive Drill-Down Drawer for the Selected Quadrant */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-sm overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>{currentQuadrantConfig.title} Breakdown</span>
                <Badge className={`text-[10px] font-bold rounded-full ${currentQuadrantConfig.badgeBg}`}>
                  {currentQuadrantConfig.count} Questions
                </Badge>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentQuadrantConfig.description}
              </p>
            </div>
          </div>

          {currentQuadrantConfig.items.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No questions fell into this quadrant for this test session.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {currentQuadrantConfig.items.map((item) => {
                const isFaster = item.timeSpent < benchmarkPaceSeconds;
                return (
                  <motion.div
                    key={item.index}
                    whileHover={{ y: -2 }}
                    onClick={() => onSelectQuestion?.(item.index)}
                    className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between gap-1.5 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors shadow-2xs group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                        Q{item.index + 1}
                      </span>
                      {item.status === 'correct' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      )}
                    </div>

                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                        {formatTime(item.timeSpent)}
                      </span>
                      <span className={`text-[9px] font-bold font-mono ${isFaster ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {item.deltaPercent > 0 ? `+${item.deltaPercent}%` : `${item.deltaPercent}%`}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
