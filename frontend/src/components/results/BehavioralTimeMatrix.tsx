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
  HelpCircle,
  X,
  ExternalLink,
  Eye,
  LayoutGrid,
  List,
  Image as ImageIcon,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import LatexRenderer from '@/components/ui/LatexRenderer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [selectedQuestionItem, setSelectedQuestionItem] = useState<MatrixItem | null>(null);

  // Format seconds to clean mm:ss or seconds format
  const formatTime = (seconds: number) => {
    const s = Math.round(seconds || 0);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  };

  const formatAnswer = (ans: any) => {
    if (ans === undefined || ans === null || ans === '') return 'None';
    if (Array.isArray(ans)) return ans.join(', ');
    if (typeof ans === 'object') {
      if (ans.min !== undefined && ans.max !== undefined) return `${ans.min} - ${ans.max}`;
      return JSON.stringify(ans);
    }
    return String(ans);
  };

  const getUserAnswer = (item: MatrixItem) => {
    const qId = item.question?.id;
    if (qId !== undefined && answers[qId] !== undefined) return answers[qId];
    if (answers[item.index] !== undefined) return answers[item.index];
    if (answers[String(item.index)] !== undefined) return answers[String(item.index)];
    return undefined;
  };

  const getItemScore = (item: MatrixItem) => {
    const qId = item.question?.id;
    const stat = (qId !== undefined ? questionStatus[qId] : undefined) || questionStatus[item.index] || questionStatus[String(item.index)];
    if (stat?.score !== undefined) return parseFloat(Number(stat.score).toFixed(2));
    if (item.status === 'correct') return item.question?.marks || 4;
    if (item.status === 'wrong') return -(item.question?.negativeMarks !== undefined ? item.question.negativeMarks : 1);
    return 0;
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

      const item: MatrixItem = { index: idx, question: q, timeSpent, deltaPercent, status };

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
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

            {/* iOS Segmented Control: Questions view vs Compact view */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Questions</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'compact'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Compact</span>
              </button>
            </div>
          </div>

          {currentQuadrantConfig.items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <Sparkles className="w-7 h-7 opacity-30 text-indigo-500" />
              <span>No questions fell into this quadrant for this test session.</span>
            </div>
          ) : viewMode === 'cards' ? (
            /* iOS Rich Question Cards Layout */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {currentQuadrantConfig.items.map((item) => {
                const isFaster = item.timeSpent < benchmarkPaceSeconds;
                const userAns = getUserAnswer(item);
                const correctAns = item.question?.correctAnswer;
                const score = getItemScore(item);

                return (
                  <motion.div
                    key={item.index}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedQuestionItem(item)}
                    className="p-4 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between gap-3 cursor-pointer group backdrop-blur-xl relative overflow-hidden"
                  >
                    {/* Top row: Q# badge, Status, Topic, Time & Pace capsule */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                          item.status === 'correct' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : item.status === 'wrong'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}>
                          Q{item.index + 1}
                        </div>

                        {item.status === 'correct' ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Correct</span>
                          </span>
                        ) : item.status === 'wrong' ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 shrink-0">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Incorrect</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Skipped</span>
                          </span>
                        )}

                        {item.question?.topic && (
                          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                            {item.question.topic}
                          </span>
                        )}
                      </div>

                      {/* Time and Pace Badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          {formatTime(item.timeSpent)}
                        </span>
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                          isFaster
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/40'
                            : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40'
                        }`}>
                          {item.deltaPercent > 0 ? `+${item.deltaPercent}%` : `${item.deltaPercent}%`}
                        </span>
                      </div>
                    </div>

                    {/* Question Statement rendered with LaTeX like in Solution Key */}
                    <div className="relative overflow-hidden text-xs sm:text-[13px] font-medium text-slate-800 dark:text-slate-200 line-clamp-2 max-h-12 leading-relaxed">
                      <div className="[&_*]:!inline [&_.math]:!inline-block [&_p]:!m-0 text-slate-800 dark:text-slate-200">
                        <LatexRenderer>{item.question?.question || "No question content"}</LatexRenderer>
                      </div>
                    </div>

                    {/* Image indicator if image exists */}
                    {item.question?.image && (
                      <div className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Includes diagram/figure</span>
                      </div>
                    )}

                    {/* Bottom row: Student Answer vs Correct Answer + Score + Action */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
                          item.status === 'correct'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : item.status === 'wrong'
                              ? 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}>
                          You: {formatAnswer(userAns)}
                        </span>

                        {item.status !== 'correct' && (
                          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            Ans: {formatAnswer(correctAns)}
                          </span>
                        )}

                        <span className={`text-[11px] font-mono font-bold ml-0.5 ${
                          score > 0 ? 'text-emerald-600 dark:text-emerald-400' : score < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                        }`}>
                          {score > 0 ? `+${score}M` : `${score}M`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0 group-hover:translate-x-0.5 transition-transform">
                        <span>Solution</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* iOS Compact Grid Layout */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {currentQuadrantConfig.items.map((item) => {
                const isFaster = item.timeSpent < benchmarkPaceSeconds;
                return (
                  <motion.div
                    key={item.index}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedQuestionItem(item)}
                    className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between gap-1.5 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors shadow-2xs group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                        Q{item.index + 1}
                      </span>
                      {item.status === 'correct' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : item.status === 'wrong' ? (
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
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

      {/* iOS Quick Look Modal / Sheet for Selected Question */}
      <Dialog open={!!selectedQuestionItem} onOpenChange={(open) => !open && setSelectedQuestionItem(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-0 border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl">
          {selectedQuestionItem && (
            <div className="flex flex-col">
              {/* Modal Header */}
              <DialogHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm border ${
                      selectedQuestionItem.status === 'correct'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        : selectedQuestionItem.status === 'wrong'
                          ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}>
                      Q{selectedQuestionItem.index + 1}
                    </div>
                    <div>
                      <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>Question {selectedQuestionItem.index + 1}</span>
                        {selectedQuestionItem.status === 'correct' ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">Correct</Badge>
                        ) : selectedQuestionItem.status === 'wrong' ? (
                          <Badge variant="destructive" className="text-[10px]">Incorrect</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Skipped</Badge>
                        )}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedQuestionItem.question?.topic ? `${selectedQuestionItem.question.topic} · ` : ''}
                        Time spent: {formatTime(selectedQuestionItem.timeSpent)} ({selectedQuestionItem.deltaPercent > 0 ? `+${selectedQuestionItem.deltaPercent}% slower` : `${Math.abs(selectedQuestionItem.deltaPercent)}% faster`} than benchmark)
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Question Statement */}
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Question Statement
                  </div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed overflow-x-auto">
                    <LatexRenderer>{selectedQuestionItem.question?.question || ""}</LatexRenderer>
                  </div>

                  {/* Question Image if any */}
                  {selectedQuestionItem.question?.image && (
                    <div className="pt-2">
                      <img
                        src={(selectedQuestionItem.question.image || "").trim()}
                        alt={`Question ${selectedQuestionItem.index + 1}`}
                        className="max-w-full max-h-[260px] rounded-xl border border-slate-200 dark:border-slate-800 object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>

                {/* Multiple Choice Options Comparison */}
                {selectedQuestionItem.question?.options && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Options & Response
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(selectedQuestionItem.question.options).map(([key, val]) => {
                        const userAns = getUserAnswer(selectedQuestionItem);
                        const correctAns = selectedQuestionItem.question?.correctAnswer;
                        const isChosen = String(userAns) === String(key) || (Array.isArray(userAns) && userAns.includes(key));
                        const isCorrectOption = String(correctAns) === String(key) || (Array.isArray(correctAns) && correctAns.includes(key));

                        return (
                          <div
                            key={key}
                            className={`p-3 rounded-2xl border transition-colors flex items-start gap-3 ${
                              isCorrectOption
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                                : isChosen
                                  ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCorrectOption
                                ? 'bg-emerald-600 text-white'
                                : isChosen
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {key}
                            </span>
                            <div className="flex-1 text-xs font-medium pt-0.5 overflow-x-auto">
                              <LatexRenderer>{String(val)}</LatexRenderer>
                            </div>
                            {isChosen && (
                              <Badge variant={isCorrectOption ? "default" : "destructive"} className="text-[10px] shrink-0">
                                Your Pick
                              </Badge>
                            )}
                            {isCorrectOption && !isChosen && (
                              <Badge className="bg-emerald-600 text-white text-[10px] shrink-0">
                                Correct Answer
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Numerical Type Answer Display */}
                {selectedQuestionItem.question?.type === 'numerical' && (
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-1">Your Answer</span>
                      <span className={`font-mono text-base font-bold ${
                        selectedQuestionItem.status === 'correct' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {formatAnswer(getUserAnswer(selectedQuestionItem))}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-1">Correct Answer</span>
                      <span className="font-mono text-base font-bold text-emerald-600">
                        {formatAnswer(selectedQuestionItem.question?.correctAnswer)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Explanation / Solution Logic */}
                {(selectedQuestionItem.question?.explanation || selectedQuestionItem.question?.solution) && (
                  <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Solution & Step-by-Step Explanation</span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed overflow-x-auto">
                      <LatexRenderer>
                        {selectedQuestionItem.question.explanation || selectedQuestionItem.question.solution}
                      </LatexRenderer>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuestionItem(null)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>

                {onSelectQuestion && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const idx = selectedQuestionItem.index;
                      setSelectedQuestionItem(null);
                      onSelectQuestion(idx);
                    }}
                    className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Open in Full Solution Key</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
