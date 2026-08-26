import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ChevronLeft, ChevronRight, Clock, Flag, CheckCircle,
  Sun, Moon, Calculator, Info, Eye, EyeOff,
  TriangleAlert, LayoutGrid, Check, Bookmark, Sparkles,
  Layers, ArrowRight, RotateCcw, Monitor, RefreshCw, X
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LatexRenderer from '@/components/ui/LatexRenderer';
import ScientificCalculator from '@/components/ScientificCalculator';
import VirtualNumericPad from '@/components/test/VirtualNumericPad';
import { Test } from '@/lib/testsApi';

export interface CorporateTestViewProps {
  test: Test;
  currentQuestion: any;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (idx: number) => void;
  answers: Record<number, string | string[]>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<number, string | string[]>>>;
  markedForReview: Set<number>;
  visited: Set<number>;
  handleAnswerSelect: (questionId: number, optionKey: string) => void;
  handleClearResponse: (questionId: number) => void;
  toggleMarkForReview: (questionId: number) => void;
  handleSaveAndMarkReview: () => void;
  handleSaveAndNext: () => void;
  handlePrevious: () => void;
  handleNumericKeypadPress: (key: string, questionId: number) => void;
  checkAttemptLimit: (questionId: number) => boolean;
  timeRemaining: number;
  isTimerDisabled: boolean;
  isTimeHidden: boolean;
  setIsTimeHidden: (val: boolean) => void;
  formatTime: (seconds: number) => string;
  warnings: number;
  isCalculatorOpen: boolean;
  setIsCalculatorOpen: (val: boolean) => void;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  connectionStatus: 'online' | 'offline' | 'reconnecting';
  setShowExitDialog: (val: boolean) => void;
  attemptSubmit: () => void;
  isSubmitting: boolean;
  renderReportQuestionButton: (qId: number) => React.ReactNode;
  theme?: string;
  setTheme: (theme: string) => void;
  parseMark: (value: any, defaultVal?: number) => number;
}

export default function CorporateTestView({
  test,
  currentQuestion,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  answers,
  setAnswers,
  markedForReview,
  visited,
  handleAnswerSelect,
  handleClearResponse,
  toggleMarkForReview,
  handleSaveAndMarkReview,
  handleSaveAndNext,
  handlePrevious,
  handleNumericKeypadPress,
  checkAttemptLimit,
  timeRemaining,
  isTimerDisabled,
  isTimeHidden,
  setIsTimeHidden,
  formatTime,
  warnings,
  isCalculatorOpen,
  setIsCalculatorOpen,
  fontSize,
  setFontSize,
  connectionStatus,
  setShowExitDialog,
  attemptSubmit,
  isSubmitting,
  renderReportQuestionButton,
  theme,
  setTheme,
  parseMark
}: CorporateTestViewProps) {
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);

  const totalQuestions = test.questions?.length || 0;
  const isCriticalTime = !isTimerDisabled && timeRemaining < 300;
  const shouldShowTime = !isTimeHidden || isCriticalTime;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // Calculate overall answered count
  const answeredCount = Object.keys(answers).filter(qId => {
    const ans = answers[Number(qId)];
    if (ans === undefined || ans === null || ans === '') return false;
    if (Array.isArray(ans) && ans.length === 0) return false;
    return true;
  }).length;

  const reviewCount = markedForReview.size;
  const progressPercent = totalQuestions > 0 ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100) : 0;

  // Determine question marks and negative marks
  const getQuestionMarks = () => {
    let marks = test.marks_per_question !== undefined ? test.marks_per_question : 4;
    let neg = test.negative_marks !== undefined ? test.negative_marks : 1;

    if (test.enable_section_mode && test.sections) {
      let runningCount = 0;
      for (const section of test.sections) {
        if (currentQuestionIndex >= runningCount && currentQuestionIndex < runningCount + section.questions.length) {
          marks = parseMark(section.marks_per_question, 4);
          neg = parseMark(section.negative_marks, 1);
          const localIdx = currentQuestionIndex - runningCount;
          if (section.questions[localIdx]) {
            const qMarks = section.questions[localIdx].marks;
            const qNeg = section.questions[localIdx].negativeMarks;
            if (qMarks !== undefined && qMarks !== '') marks = qMarks;
            if (qNeg !== undefined && qNeg !== '') neg = qNeg;
          }
          break;
        }
        runningCount += section.questions.length;
      }
    } else if (currentQuestion) {
      if (currentQuestion.marks !== undefined && currentQuestion.marks !== '') marks = currentQuestion.marks;
      if (currentQuestion.negativeMarks !== undefined && currentQuestion.negativeMarks !== '') neg = currentQuestion.negativeMarks;
    }
    return { marks, neg };
  };

  const { marks, neg } = getQuestionMarks();

  const isCurrentAnswered = (() => {
    const ans = answers[currentQuestion?.id];
    if (ans === undefined || ans === null || ans === '') return false;
    if (Array.isArray(ans) && ans.length === 0) return false;
    return true;
  })();

  const isCurrentMarked = markedForReview.has(currentQuestion?.id);

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-slate-100/70 dark:bg-slate-950 font-sans select-none">
      
      {/* ── TOP HEADER (Corporate Clean Header) ── */}
      <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shadow-2xs z-30 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Test Info & Progress Pill */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs shrink-0">
            T
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[160px] sm:max-w-[260px] md:max-w-[340px]">
              {test.title}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Q {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="hidden md:inline">{answeredCount} answered</span>
            </div>
          </div>
        </div>

        {/* Center: Timer Pill */}
        <div className="flex items-center gap-2">
          {isTimerDisabled ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-2xs">
              <Clock className="w-3.5 h-3.5" />
              <span>No Time Limit</span>
            </div>
          ) : (
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold border shadow-2xs transition-colors ${
              isCriticalTime 
                ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 animate-pulse' 
                : 'bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-800/90 dark:text-slate-100 dark:border-slate-700'
            }`}>
              <Clock className={`w-4 h-4 ${isCriticalTime ? 'text-rose-500 animate-spin' : 'text-indigo-500'}`} />
              <span className="font-mono tracking-tight text-xs sm:text-sm font-bold">
                {shouldShowTime ? formatTime(timeRemaining) : '**:**'}
              </span>
              <button
                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                onClick={() => setIsTimeHidden(!isTimeHidden)}
                disabled={isCriticalTime}
                title={isCriticalTime ? "Time cannot be hidden (less than 5m left)" : (isTimeHidden ? "Show Time" : "Hide Time")}
              >
                {shouldShowTime ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Right: Tools & Submit */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Question Overview Sheet / Navigator Button */}
          <Sheet open={isNavigatorOpen} onOpenChange={setIsNavigatorOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl px-2.5 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Question Overview & Jump"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Overview</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85%] sm:w-[420px] p-0 flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
              <SheetHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <SheetTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-indigo-600" />
                  <span>Assessment Questions Overview</span>
                </SheetTitle>
              </SheetHeader>

              {/* Status Summary Pill Bar */}
              <div className="p-4 grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-center">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Answered</div>
                  <div className="text-base font-bold text-emerald-600">{answeredCount}</div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Flagged</div>
                  <div className="text-base font-bold text-purple-600">{reviewCount}</div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Remaining</div>
                  <div className="text-base font-bold text-rose-500">{totalQuestions - answeredCount}</div>
                </div>
              </div>

              {/* Question Grid */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {test.enable_section_mode && test.sections ? (
                  test.sections.map((section: any, sIdx: number) => {
                    return (
                      <div key={section.id || sIdx} className="space-y-2">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          {section.name || `Section ${sIdx + 1}`}
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {section.questions.map((q: any) => {
                            const globalIdx = test.questions.findIndex((tq: any) => tq.id === q.id);
                            if (globalIdx === -1) return null;
                            const isAns = answers[q.id] !== undefined && answers[q.id] !== '' && (!Array.isArray(answers[q.id]) || (answers[q.id] as any).length > 0);
                            const isMarked = markedForReview.has(q.id);
                            const isCurrent = globalIdx === currentQuestionIndex;

                            return (
                              <button
                                key={q.id}
                                onClick={() => {
                                  setCurrentQuestionIndex(globalIdx);
                                  setIsNavigatorOpen(false);
                                }}
                                className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all border relative ${
                                  isCurrent
                                    ? 'ring-2 ring-indigo-500 ring-offset-2 border-indigo-600 bg-indigo-600 text-white'
                                    : isAns && isMarked
                                    ? 'bg-purple-600 text-white border-purple-700'
                                    : isAns
                                    ? 'bg-emerald-500 text-white border-emerald-600'
                                    : isMarked
                                    ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                                    : visited.has(globalIdx)
                                    ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                    : 'bg-white text-slate-400 border-slate-200 dark:bg-slate-900 dark:text-slate-500'
                                }`}
                              >
                                {globalIdx + 1}
                                {isMarked && !isAns && (
                                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-500" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="grid grid-cols-5 gap-2.5">
                    {test.questions.map((q: any, idx: number) => {
                      const isAns = answers[q.id] !== undefined && answers[q.id] !== '' && (!Array.isArray(answers[q.id]) || (answers[q.id] as any).length > 0);
                      const isMarked = markedForReview.has(q.id);
                      const isCurrent = idx === currentQuestionIndex;

                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            setCurrentQuestionIndex(idx);
                            setIsNavigatorOpen(false);
                          }}
                          className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center transition-all border relative ${
                            isCurrent
                              ? 'ring-2 ring-indigo-500 ring-offset-2 border-indigo-600 bg-indigo-600 text-white shadow-xs'
                              : isAns && isMarked
                              ? 'bg-purple-600 text-white border-purple-700'
                              : isAns
                              ? 'bg-emerald-500 text-white border-emerald-600'
                              : isMarked
                              ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                              : visited.has(idx)
                              ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-white text-slate-400 border-slate-200 dark:bg-slate-900 dark:text-slate-500'
                          }`}
                        >
                          {idx + 1}
                          {isMarked && (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Calculator (if enabled) */}
          {test.has_scientific_calculator && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                title="Calculator"
                onClick={() => setIsCalculatorOpen(true)}
              >
                <Calculator className="w-4 h-4" />
              </Button>
              <ScientificCalculator
                onClose={() => setIsCalculatorOpen(false)}
                className={isCalculatorOpen ? '' : 'hidden'}
              />
            </>
          )}

          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Exit Button */}
          {!test.settings?.disable_exit_button && (
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full transition-colors shrink-0 ${
                  connectionStatus === 'online' ? 'bg-emerald-400' :
                  connectionStatus === 'offline' ? 'bg-red-400 animate-pulse' :
                  'bg-amber-400 animate-pulse'
                }`}
                title={connectionStatus === 'online' ? 'Connected' : 'Offline / Reconnecting'}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl px-2.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                onClick={() => setShowExitDialog(true)}
              >
                Exit
              </Button>
            </div>
          )}

          {/* Submit Test Button */}
          <Button
            onClick={attemptSubmit}
            disabled={isSubmitting}
            className="h-8 rounded-xl px-3 sm:px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            Submit
          </Button>
        </div>
      </header>

      {/* ── TOP THIN PROGRESS LINE ── */}
      <div className="w-full h-1 bg-slate-200 dark:bg-slate-800">
        <div 
          className="h-full bg-gradient-to-r from-indigo-600 to-indigo-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ── SECTION SWITCHER PILLS (If section mode enabled) ── */}
      {test.enable_section_mode && test.sections && (
        <div className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 py-2 overflow-x-auto scrollbar-hide flex items-center gap-2">
          {(() => {
            let runningIndex = 0;
            return test.sections.map((section: any, idx: number) => {
              const startIndex = runningIndex;
              const count = section.questions.length;
              const endIndex = startIndex + count - 1;
              runningIndex += count;

              const isActive = currentQuestionIndex >= startIndex && currentQuestionIndex <= endIndex;

              return (
                <button
                  key={section.id || idx}
                  onClick={() => setCurrentQuestionIndex(startIndex)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                    isActive
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  <span>{section.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-indigo-200/70 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                    {count} Qs
                  </span>
                </button>
              );
            });
          })()}
        </div>
      )}

      {/* ── MAIN CONTENT AREA (Centered Distraction-Free Card) ── */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 md:p-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-4 pb-8 sm:pb-12">
          
          {/* Question Card Box */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
            
            {/* Question Card Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-bold text-xs tracking-wide">
                  Question {currentQuestionIndex + 1}
                </span>
                <Badge variant="outline" className="text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  {currentQuestion?.type === 'multiple' ? 'Multiple Correct' :
                   currentQuestion?.type === 'numerical' ? 'Numerical' :
                   currentQuestion?.type === 'comprehension' ? 'Passage' : 'Single Choice'}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-emerald-600 font-bold">+{marks}</span>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span className="text-rose-500 font-bold">-{neg}</span>
                </div>
                {renderReportQuestionButton(currentQuestion?.id)}
              </div>
            </div>

            <CardContent className="p-4 sm:p-8 space-y-6">
              
              {/* Optional Passage (Comprehension Type) */}
              {currentQuestion?.passageContent && (
                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                  <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Passage Reference</span>
                  </div>
                  <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    <LatexRenderer>{currentQuestion.passageContent}</LatexRenderer>
                  </div>
                </div>
              )}

              {/* Question Text */}
              <div 
                className="text-slate-800 dark:text-slate-100 font-medium leading-relaxed break-words selection:bg-indigo-100 selection:text-indigo-900 tracking-wide"
                style={{ fontSize: `${fontSize}px` }}
              >
                <LatexRenderer>{currentQuestion?.question}</LatexRenderer>
              </div>

              {/* Question Image (if any) */}
              {currentQuestion?.image && (
                <div className="flex justify-center my-4">
                  <img
                    src={currentQuestion.image.trim()}
                    alt={`Question ${currentQuestionIndex + 1}`}
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-[380px] rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs object-contain bg-white dark:bg-slate-800"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Options / Input Block */}
              <div className="pt-2">
                {currentQuestion?.type === 'numerical' ? (
                  <div className="space-y-4 max-w-sm mx-auto">
                    <Label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Enter Numerical Value
                    </Label>
                    <Input
                      type="text"
                      inputMode="none"
                      placeholder="Type answer..."
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/^-?\d*\.?\d*$/.test(val)) return;
                        const currentAns = answers[currentQuestion.id];
                        const isCurrentlyAnswered = currentAns !== undefined && currentAns !== '';
                        if (val !== '' && !isCurrentlyAnswered) {
                          if (!checkAttemptLimit(currentQuestion.id)) return;
                        }
                        setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
                      }}
                      className="text-xl font-bold text-center h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500 shadow-2xs"
                    />
                    <VirtualNumericPad
                      onKeyPress={(key) => handleNumericKeypadPress(key, currentQuestion.id)}
                      className="mx-auto"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Select Answer:
                    </div>
                    {Object.entries(currentQuestion?.options || {}).map(([key, text]) => {
                      const isSelected = currentQuestion?.type === 'multiple'
                        ? (Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as any).includes(key))
                        : answers[currentQuestion.id] === key;

                      const optionImage = currentQuestion?.optionImages?.[key];

                      return (
                        <div
                          key={key}
                          onClick={() => {
                            if (currentQuestion.type === 'multiple') {
                              const current = (answers[currentQuestion.id] as any) || [];
                              const newAnswers = Array.isArray(current) ? [...current] : [];
                              const isCurrentlyAnswered = newAnswers.length > 0;

                              if (newAnswers.includes(key)) {
                                newAnswers.splice(newAnswers.indexOf(key), 1);
                              } else {
                                newAnswers.push(key);
                              }

                              const willBeAnswered = newAnswers.length > 0;
                              if (!isCurrentlyAnswered && willBeAnswered) {
                                if (!checkAttemptLimit(currentQuestion.id)) return;
                              }

                              newAnswers.sort();
                              setAnswers(prev => ({ ...prev, [currentQuestion.id]: newAnswers }));
                            } else {
                              handleAnswerSelect(currentQuestion.id, key);
                            }
                          }}
                          className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          {/* Option Key Badge */}
                          <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {currentQuestion?.type === 'multiple' && isSelected ? (
                              <Check className="w-4 h-4 text-white" />
                            ) : (
                              key
                            )}
                          </div>

                          {/* Option Text / Image */}
                          <div className="flex-1 flex flex-col gap-2 pt-0.5">
                            {text && (
                              <div
                                className="text-slate-700 dark:text-slate-200 leading-relaxed font-normal"
                                style={{ fontSize: `${Math.max(14, fontSize - 2)}px` }}
                              >
                                <LatexRenderer>{text as string}</LatexRenderer>
                              </div>
                            )}
                            {optionImage && (
                              <img
                                src={(optionImage as string).trim()}
                                alt={`Option ${key}`}
                                referrerPolicy="no-referrer"
                                className="max-w-[220px] max-h-[180px] rounded-xl border border-slate-200 dark:border-slate-700 object-contain bg-white dark:bg-slate-800 mt-1"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

        </div>
      </main>

      {/* ── DOCKED BOTTOM ACTION BAR (Corporate Modern Dock) ── */}
      <footer className="flex-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-3 sm:px-8 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          
          {/* Left Controls: Flag / Review & Clear */}
          <div className="flex items-center gap-2">
            <Button
              variant={isCurrentMarked ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (answers[currentQuestion.id]) {
                  handleSaveAndMarkReview();
                } else {
                  toggleMarkForReview(currentQuestion.id);
                }
              }}
              className={`rounded-xl gap-1.5 text-xs font-semibold transition-all h-9 ${
                isCurrentMarked
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-purple-600'
              }`}
              title="Flag question for later review"
            >
              <Flag className={`w-3.5 h-3.5 ${isCurrentMarked ? 'fill-white' : 'text-purple-500'}`} />
              <span className="hidden sm:inline">{isCurrentMarked ? 'Flagged' : 'Flag Question'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleClearResponse(currentQuestion.id)}
              disabled={!isCurrentAnswered}
              className="rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700 h-9 disabled:opacity-40"
              title="Clear current selection"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Clear</span>
            </Button>
          </div>

          {/* Right Controls: Previous, Next / Save & Next */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="rounded-xl px-3 text-xs font-semibold border-slate-200 dark:border-slate-700 h-9"
              title="Previous Question"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span>Previous</span>
            </Button>

            <Button
              size="sm"
              onClick={handleSaveAndNext}
              className="rounded-xl px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs h-9 gap-1"
            >
              <span>{isLastQuestion ? 'Save' : 'Save & Next'}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

        </div>
      </footer>

    </div>
  );
}
