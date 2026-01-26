
return (
    <div className="h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        {/* Institution Branding Bar */}
        {(test.institution_name || test.institution_logo) && (
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 py-2 flex items-center justify-center gap-3">
                {test.institution_logo && (
                    <img src={test.institution_logo} alt="Institution Logo" className="h-10 w-auto object-contain" />
                )}
                {test.institution_name && (
                    <span className="text-lg font-bold text-slate-800">{test.institution_name}</span>
                )}
            </div>
        )}

        <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center justify-between">
            <div className="font-mono text-xl font-bold flex items-center gap-2">
                {(() => {
                    const isCriticalTime = timeRemaining < 300;
                    const shouldShow = !isTimeHidden || isCriticalTime;

                    return (
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">
                            <Clock className={`w-5 h-5 ${isCriticalTime ? 'text-red-500 animate-pulse' : 'text-slate-600 dark:text-slate-400'}`} />
                            <span className={`min-w-[80px] text-center ${isCriticalTime ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>
                                {shouldShow ? formatTime(timeRemaining) : '** : **'}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-1 text-slate-500 hover:text-slate-700"
                                onClick={() => setIsTimeHidden(!isTimeHidden)}
                                disabled={isCriticalTime}
                                title={isCriticalTime ? "Time cannot be hidden (less than 5m left)" : (isTimeHidden ? "Show Time" : "Hide Time")}
                            >
                                {shouldShow ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                        </div>
                    );
                })()}
            </div>
            <div className="flex items-center gap-2">
                {/* Warning Counter */}
                {test?.settings?.tab_switch_mode !== 'off' && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${warnings > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        <TriangleAlert className={`w-4 h-4 ${warnings > 0 ? 'fill-red-100' : ''}`} />
                        <span>Warnings: {warnings}/{MAX_WARNINGS + 1}</span>
                    </div>
                )}

                {test.has_scientific_calculator && (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex h-9 w-9 p-0 rounded-full"
                            title="Scientific Calculator"
                            onClick={() => setIsCalculatorOpen(true)}
                        >
                            <Calculator className="w-5 h-5" />
                        </Button>
                        <ScientificCalculator
                            onClose={() => setIsCalculatorOpen(false)}
                            className={isCalculatorOpen ? '' : 'hidden'}
                        />
                    </>
                )}

                <Button onClick={attemptSubmit} disabled={isSubmitting} variant="destructive" size="sm">
                    Submit Test
                </Button>
            </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-row relative">
            {/* Main Question Area (Left Panel) */}
            <div className={`
          flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 relative transition-all duration-300 ease-in-out
        `}>
                {/* Collapse Toggle Button (Desktop Only) */}
                <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 z-50 translate-x-1/2">
                    <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => setIsPaletteCollapsed(!isPaletteCollapsed)}
                        className="h-8 w-8 rounded-full shadow-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600"
                        title={isPaletteCollapsed ? "Expand Palette" : "Collapse Palette"}
                    >
                        {isPaletteCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                </div>
                {/* Section Tabs */}
                {test.enable_section_mode && test.sections && (
                    <div className="flex-none flex gap-2 p-2 overflow-x-auto bg-white dark:bg-slate-900 scrollbar-hide">
                        {(() => {
                            let runningIndex = 0;
                            return test.sections.map((section: any, idx: number) => {
                                const startIndex = runningIndex;
                                const count = section.questions.length; // Assumes structure is preserved in JSON even if flat list used for render
                                const endIndex = startIndex + count - 1;
                                runningIndex += count;

                                const isActive = currentQuestionIndex >= startIndex && currentQuestionIndex <= endIndex;

                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setCurrentQuestionIndex(startIndex)}
                                        title={section.name}
                                        className={`
                                flex items-center justify-between gap-2 px-4 py-2 text-sm font-bold border transition-colors whitespace-nowrap min-w-[140px]
                                ${isActive
                                                ? 'bg-[#0073E6] text-white border-[#0073E6]'
                                                : 'bg-white text-[#0073E6] border-slate-300 hover:bg-blue-50'}
                            `}
                                    >
                                        <span className="truncate">{section.name}</span>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Info
                                                        className={`w-4 h-4 cursor-pointer hover:scale-110 active:scale-95 transition-transform ${isActive ? 'text-white/80' : 'text-[#0073E6]/70'}`}
                                                    />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-2 text-sm max-w-[200px]" side="top">
                                                    <p className="font-semibold text-center">{section.name}</p>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </button>
                                );
                            });
                        })()}
                    </div>
                )}

                {/* Mobile Palette Trigger (Floating Action Button) */}
                <div className="lg:hidden fixed bottom-[55px] right-0 z-50">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button
                                size="icon"
                                className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-transform hover:scale-105"
                            >
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[80%] sm:w-[380px] flex flex-col h-full">
                            <SheetHeader>
                                <SheetTitle>Questions</SheetTitle>
                            </SheetHeader>
                            <div className="py-4 flex-1 overflow-y-auto pb-6">
                                {/* Legend - Above Palette */}
                                <div className="mb-4">
                                    <div className="grid grid-cols-2 gap-y-2 mb-2 text-[10px] text-muted-foreground">
                                        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-white border border-slate-200 rounded-md text-[9px] flex items-center justify-center font-bold">1</div> Not Visited</div>
                                        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-red-500 border border-red-600 rounded-md text-[9px] flex items-center justify-center font-bold text-white">2</div> Not Answered</div>
                                        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-green-500 border border-green-600 rounded-md text-[9px] flex items-center justify-center font-bold text-white">3</div> Answered</div>
                                        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-purple-600 border border-purple-700 rounded-md text-[9px] flex items-center justify-center font-bold text-white">4</div> Review</div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 bg-purple-600 border border-purple-700 rounded-md text-[9px] flex items-center justify-center font-bold text-white relative">
                                                5
                                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full"><CheckCircle className="w-2.5 h-2.5 text-green-500 fill-white" /></div>
                                            </div>
                                            <span className="ml-2">Ans & Review</span>
                                        </div>
                                    </div>
                                    <hr className="border-slate-200 dark:border-slate-700" />
                                </div>

                                <QuestionPalette onQuestionClick={() => setIsMobileMenuOpen(false)} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {currentQuestion.passageContent ? (
                    /* SPLIT VIEW FOR COMPREHENSION */
                    /* SPLIT VIEW FOR COMPREHENSION */
                    <div className="flex-1 w-full overflow-hidden flex flex-col lg:flex-row gap-2 lg:gap-4 pb-0 p-1 pt-1 lg:pt-1">
                        {/* Passage Pane (Desktop) */}
                        <div className="hidden lg:block w-1/2 h-full overflow-y-auto bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-800 shadow-sm custom-scrollbar">
                            <div className="p-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
                                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px]">Passage</span>
                                </h3>
                            </div>
                            <div className="p-6 text-base leading-relaxed text-slate-800 dark:text-slate-200 [&_a]:pointer-events-none [&_a]:cursor-text [&_a]:no-underline [&_a]:text-current">
                                {/* @ts-ignore */}
                                <Latex strict={false} trust={true}>{currentQuestion.passageContent}</Latex>
                            </div>
                        </div>

                        {/* Question Pane */}
                        <div className="flex-1 h-full overflow-y-auto lg:pr-2 custom-scrollbar">
                            {/* Mobile Passage (Collapsed/Scrollable) */}
                            <div className="lg:hidden bg-white p-4 rounded-lg border mb-4 shadow-sm">
                                <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Passage Reference</div>
                                <div className="text-sm leading-relaxed max-h-48 overflow-y-auto bg-slate-50 p-3 rounded border [&_a]:pointer-events-none [&_a]:cursor-text [&_a]:no-underline [&_a]:text-current">
                                    {/* @ts-ignore */}
                                    <Latex strict={false} trust={true}>{currentQuestion.passageContent}</Latex>
                                </div>
                            </div>

                            <Card className="min-h-[400px] shadow-sm border-0 bg-white dark:bg-slate-900 w-full h-auto block">
                                <CardContent className="p-3 md:p-4 gap-2 flex flex-col h-auto">
                                    {/* Question Header */}
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Question {currentQuestionIndex + 1}</span>
                                            <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                                                {currentQuestion.type === 'multiple' ? 'Multiple Choice' :
                                                    currentQuestion.type === 'numerical' ? 'Numerical' :
                                                        currentQuestion.type === 'comprehension' ? 'Passage' : 'Single Choice'}
                                            </span>
                                        </div>

                                        {(() => {
                                            // 1. Determine Fallback Pattern (Section Default or Test Default)
                                            let fallbackMarks = 4;
                                            let fallbackNeg = 1;
                                            let targetQ = currentQuestion; // Default to flat question
                                            let forceSectionMarks = false;

                                            if (test.enable_section_mode && test.sections) {
                                                const markingModel = test.section_marking_model || 'section-wise';
                                                if (markingModel === 'section-wise') {
                                                    forceSectionMarks = true;
                                                }

                                                let runningCount = 0;
                                                for (const section of test.sections) {
                                                    if (currentQuestionIndex >= runningCount && currentQuestionIndex < runningCount + section.questions.length) {
                                                        fallbackMarks = parseMark(section.marks_per_question, 4);
                                                        fallbackNeg = parseMark(section.negative_marks, 1);
                                                        const localIdx = currentQuestionIndex - runningCount;
                                                        if (section.questions[localIdx]) {
                                                            targetQ = section.questions[localIdx];
                                                        }
                                                        break;
                                                    }
                                                    runningCount += section.questions.length;
                                                }
                                            } else {
                                                fallbackMarks = parseMark(test.marks_per_question, 4);
                                                fallbackNeg = parseMark(test.negative_marks, 1);
                                            }

                                            const marksVal = forceSectionMarks
                                                ? fallbackMarks
                                                : parseMark(targetQ.marks, fallbackMarks);

                                            const negVal = forceSectionMarks
                                                ? fallbackNeg
                                                : parseMark(targetQ.negativeMarks, fallbackNeg);

                                            return (
                                                <div className="text-xs font-medium flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                    <span className="text-emerald-700">+{parseFloat(marksVal.toFixed(2))}</span>
                                                    <span className="text-slate-300">|</span>
                                                    <span className="text-red-600">-{parseFloat(negVal.toFixed(2))}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Divider */}
                                    <hr className="border-slate-200 mb-3" />

                                    {/* Question Text */}
                                    {/* Question Text */}
                                    <div className="text-lg md:text-xl text-slate-800 dark:text-slate-200 font-medium leading-relaxed break-words p-4 rounded-lg selection:bg-blue-100 selection:text-blue-900 tracking-wide [word-spacing:1.5px] [&_.katex]:[word-spacing:normal]">
                                        <div className="overflow-x-auto max-w-full">
                                            {/* @ts-ignore */}
                                            <Latex strict={false} trust={true}>{currentQuestion.question}</Latex>
                                        </div>
                                    </div>

                                    {/* Question Image */}
                                    {currentQuestion.image && (
                                        <div className="mb-8 flex justify-center">
                                            <img
                                                src={currentQuestion.image.trim()}
                                                alt={`Question ${currentQuestionIndex + 1}`}
                                                referrerPolicy="no-referrer"
                                                className="max-w-full max-h-[400px] rounded-lg border border-slate-200 shadow-sm object-contain bg-white"
                                                onError={(e) => {
                                                    const target = e.currentTarget;
                                                    target.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Options Area */}
                                    <div className="space-y-4 mt-6">
                                        <div className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Options</div>
                                        {currentQuestion.type === 'numerical' ? (
                                            <div className="max-w-xs">
                                                <Label className="mb-2 block text-slate-600">Your Answer</Label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    placeholder="Enter value"
                                                    value={answers[currentQuestion.id] || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
                                                    }}
                                                    className="text-lg bg-white dark:bg-slate-950 dark:border-slate-800 h-12"
                                                />
                                            </div>
                                        ) : (
                                            Object.entries(currentQuestion.options || {}).map(([key, text]) => {
                                                const isSelected = currentQuestion.type === 'multiple'
                                                    ? (Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as any).includes(key))
                                                    : answers[currentQuestion.id] === key;

                                                const optionImage = currentQuestion.optionImages?.[key];

                                                return (
                                                    <div
                                                        key={key}
                                                        onClick={() => {
                                                            if (currentQuestion.type === 'multiple') {
                                                                const current = (answers[currentQuestion.id] as any) || [];
                                                                const newAnswers = Array.isArray(current) ? [...current] : [];

                                                                if (newAnswers.includes(key)) {
                                                                    newAnswers.splice(newAnswers.indexOf(key), 1);
                                                                } else {
                                                                    newAnswers.push(key);
                                                                }
                                                                newAnswers.sort();
                                                                setAnswers(prev => ({ ...prev, [currentQuestion.id]: newAnswers }));
                                                            } else {
                                                                handleAnswerSelect(currentQuestion.id, key);
                                                            }
                                                        }}
                                                        className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all group relative
                                                 ${isSelected
                                                                ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                                                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 bg-white'}
                                             `}
                                                    >
                                                        <div className={`h-7 w-7 flex items-center justify-center font-bold text-sm border shrink-0 transition-colors mt-0.5
                                                 ${currentQuestion.type === 'multiple' ? 'rounded-md' : 'rounded-full'}
                                                 ${isSelected
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'bg-slate-50 text-slate-500 border-slate-200 group-hover:border-blue-400 group-hover:text-blue-600'}
                                             `}>
                                                            {currentQuestion.type === 'multiple' && isSelected ? <CheckCircle className="w-4 h-4" /> : key}
                                                        </div>

                                                        <div className="flex-1 flex flex-col gap-2">
                                                            {text && <div className="text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-[95%] break-words pt-0.5"><Latex>{text}</Latex></div>}
                                                            {optionImage && (
                                                                <img
                                                                    src={optionImage.trim()}
                                                                    alt={`Option ${key}`}
                                                                    referrerPolicy="no-referrer"
                                                                    className="max-w-[200px] max-h-[200px] rounded-md border border-slate-200 object-contain bg-white"
                                                                    onError={(e) => {
                                                                        const target = e.currentTarget;
                                                                        target.style.display = 'none';
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    /* STANDARD VIEW */
                    /* STANDARD VIEW */
                    <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col gap-2 lg:gap-6 lg:pr-2 pb-4 p-1 pt-1 lg:pt-1">
                        <Card className="min-h-[500px] shadow-none border-none bg-transparent w-full h-auto block">
                            <CardContent className="p-3 md:p-4 gap-2 flex flex-col h-auto">
                                {/* Question Header */}
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Question {currentQuestionIndex + 1}</span>
                                        <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                                            {currentQuestion.type === 'multiple' ? 'Multiple Choice' :
                                                currentQuestion.type === 'numerical' ? 'Numerical' :
                                                    currentQuestion.type === 'comprehension' ? 'Passage' : 'Single Choice'}
                                        </span>
                                    </div>

                                    {(() => {
                                        const getDisplayVal = (val: any, fallback: string | number) => {
                                            if (val !== undefined && val !== null && val !== '') return val;
                                            return fallback;
                                        };

                                        let marks = getDisplayVal(test.marks_per_question, 4);
                                        let neg = getDisplayVal(test.negative_marks, 1);

                                        if (test.enable_section_mode && test.sections) {
                                            let runningCount = 0;
                                            for (const section of test.sections) {
                                                if (currentQuestionIndex >= runningCount && currentQuestionIndex < runningCount + section.questions.length) {
                                                    marks = getDisplayVal(section.marks_per_question, 4);
                                                    neg = getDisplayVal(section.negative_marks, 1);
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
                                        } else {
                                            const qMarks = currentQuestion.marks;
                                            const qNeg = currentQuestion.negativeMarks;
                                            if (qMarks !== undefined && qMarks !== '') marks = qMarks;
                                            if (qNeg !== undefined && qNeg !== '') neg = qNeg;
                                        }

                                        return (
                                            <div className="text-xs font-medium flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                <span className="text-emerald-700">+{marks}</span>
                                                <span className="text-slate-300">|</span>
                                                <span className="text-red-600">-{neg}</span>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Divider */}
                                <hr className="border-slate-200 mb-3" />

                                {/* Question Text */}
                                {/* Question Text */}
                                <div className="text-lg md:text-xl text-slate-800 dark:text-slate-200 font-medium leading-relaxed break-words p-4 rounded-lg selection:bg-blue-100 selection:text-blue-900 tracking-wide [word-spacing:1.5px] [&_.katex]:[word-spacing:normal]">
                                    <div className="overflow-x-auto max-w-full">
                                        {/* @ts-ignore */}
                                        <Latex strict={false} trust={true}>{currentQuestion.question}</Latex>
                                    </div>
                                </div>

                                {/* Question Image */}
                                {currentQuestion.image && (
                                    <div className="mb-8 flex justify-center">
                                        <img
                                            src={currentQuestion.image.trim()}
                                            alt={`Question ${currentQuestionIndex + 1}`}
                                            referrerPolicy="no-referrer"
                                            className="max-w-full max-h-[400px] rounded-lg border border-slate-200 shadow-sm object-contain bg-white"
                                            onError={(e) => {
                                                const target = e.currentTarget;
                                                target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Options Area */}
                                <div className="space-y-4 mt-6">
                                    <div className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Options</div>
                                    {currentQuestion.type === 'numerical' ? (
                                        <div className="max-w-xs">
                                            <Label className="mb-2 block text-slate-600">Your Answer</Label>
                                            <Input
                                                type="number"
                                                step="any"
                                                placeholder="Enter value"
                                                value={answers[currentQuestion.id] || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
                                                }}
                                                className="text-lg bg-white dark:bg-slate-950 dark:border-slate-800 h-12"
                                            />
                                        </div>
                                    ) : (
                                        Object.entries(currentQuestion.options || {}).map(([key, text]) => {
                                            const isSelected = currentQuestion.type === 'multiple'
                                                ? (Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as any).includes(key))
                                                : answers[currentQuestion.id] === key;

                                            const optionImage = currentQuestion.optionImages?.[key];

                                            return (
                                                <div
                                                    key={key}
                                                    onClick={() => {
                                                        if (currentQuestion.type === 'multiple') {
                                                            const current = (answers[currentQuestion.id] as any) || [];
                                                            const newAnswers = Array.isArray(current) ? [...current] : [];

                                                            if (newAnswers.includes(key)) {
                                                                newAnswers.splice(newAnswers.indexOf(key), 1);
                                                            } else {
                                                                newAnswers.push(key);
                                                            }
                                                            newAnswers.sort();
                                                            setAnswers(prev => ({ ...prev, [currentQuestion.id]: newAnswers }));
                                                        } else {
                                                            handleAnswerSelect(currentQuestion.id, key);
                                                        }
                                                    }}
                                                    className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all group relative
                                                 ${isSelected
                                                            ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                                                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 bg-white'}
                                             `}
                                                >
                                                    {/* Option Key (A, B, C...) */}
                                                    <div className={`h-7 w-7 flex items-center justify-center font-bold text-sm border shrink-0 transition-colors mt-0.5
                                                 ${currentQuestion.type === 'multiple' ? 'rounded-md' : 'rounded-full'}
                                                 ${isSelected
                                                            ? 'bg-blue-600 text-white border-blue-600'
                                                            : 'bg-slate-50 text-slate-500 border-slate-200 group-hover:border-blue-400 group-hover:text-blue-600'}
                                             `}>
                                                        {currentQuestion.type === 'multiple' && isSelected ? <CheckCircle className="w-4 h-4" /> : key}
                                                    </div>

                                                    {/* Option Text/Image */}
                                                    <div className="flex-1 flex flex-col gap-2">
                                                        {text && <div className="text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-[95%] break-words pt-0.5"><Latex>{text}</Latex></div>}
                                                        {optionImage && (
                                                            <img
                                                                src={optionImage.trim()}
                                                                alt={`Option ${key}`}
                                                                referrerPolicy="no-referrer"
                                                                className="max-w-[200px] max-h-[200px] rounded-md border border-slate-200 object-contain bg-white"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Bottom Controls */}
                {/* Fixed Bottom for Mobile, Absolute for Desktop Column */}
                {/* Bottom Controls - Static at bottom of Left Panel */}
                <div className="flex-none z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-2 transition-all">
                    <div className="flex items-center justify-between gap-2 md:gap-4">
                        <div className="flex gap-2 md:gap-3 justify-between w-full">
                            {/* Previous (Back Icon) */}
                            <Button
                                variant="outline"
                                onClick={handlePrevious}
                                disabled={currentQuestionIndex === 0}
                                size="icon"
                                className="h-9 w-9"
                                title="Previous Question"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </Button>

                            <div className="flex gap-2">
                                {/* Clear Response */}
                                <Button
                                    variant="outline"
                                    onClick={() => handleClearResponse(currentQuestion.id)}
                                    disabled={!answers[currentQuestion.id]}
                                    size="sm"
                                    className="text-muted-foreground border-dashed md:border-solid md:text-slate-600 md:hover:text-slate-900 h-9"
                                >
                                    <span className="hidden md:inline">Clear</span>
                                    <span className="md:hidden">Clear</span>
                                </Button>

                                {/* Mark for Review (Purple - Toggle) */}
                                <Button
                                    variant={markedForReview.has(currentQuestion.id) ? "secondary" : "ghost"}
                                    onClick={() => toggleMarkForReview(currentQuestion.id)}
                                    className={`
                            ${markedForReview.has(currentQuestion.id)
                                            ? "border-purple-200 bg-purple-50 text-purple-800"
                                            : "text-slate-600 hover:text-slate-900"}
                        `}
                                    title="Mark for Review"
                                    size="sm"
                                >
                                    <Flag className={`w-4 h-4 ${markedForReview.has(currentQuestion.id) ? "md:mr-2 fill-purple-500 text-purple-500" : ""}`} />
                                    <span className={`hidden ${markedForReview.has(currentQuestion.id) ? "md:inline" : ""}`}>
                                        Review
                                    </span>
                                    <span className={`hidden ${!markedForReview.has(currentQuestion.id) ? "md:inline" : ""}`}>
                                        Review
                                    </span>
                                </Button>

                                {/* Save & Mark for Review (Purple + Green intent) */}
                                <Button
                                    onClick={handleSaveAndMarkReview}
                                    size="sm"
                                    disabled={currentQuestionIndex === test.questions.length - 1 || !answers[currentQuestion.id]}
                                    className={`
                    px-3 md:px-4 md:py-1 h-9 text-white transition-all
                    ${!answers[currentQuestion.id]
                                            ? "bg-purple-300 dark:bg-purple-900/50 cursor-not-allowed opacity-70"
                                            : "bg-purple-600 hover:bg-purple-700"}
                  `}
                                >
                                    <span className="hidden md:inline">Ans & Review</span>
                                    <span className="md:hidden">Ans & Rev</span>
                                </Button>

                                {/* Save & Next (Blue) */}
                                <Button
                                    onClick={handleSaveAndNext}
                                    size="sm"
                                    className="bg-[#0073E6] hover:bg-[#005fb8] text-white px-3 md:px-4 md:py-1 h-9"
                                    disabled={false}  // Enabled for all, handler checks if last
                                >
                                    <span className="hidden md:inline mr-2">Save & Next</span>
                                    <span className="md:hidden">Save & Next</span>
                                    <ChevronRight className="w-4 h-4 ml-0.5 md:ml-0" />
                                </Button>

                            </div>
                        </div>
                    </div>
                </div>

                {/* Spacer removed as bottom bar is static */}
            </div>

            {/* Right Side Palette (Desktop) - Independently Scrollable (Right Panel) */}
            {!isPaletteCollapsed && (
                <div
                    className="hidden lg:block w-1 hover:bg-blue-400 cursor-col-resize z-50 transition-colors bg-transparent active:bg-blue-600"
                    onMouseDown={startResizing}
                />
            )}
            <div
                style={{ width: isPaletteCollapsed ? 0 : paletteWidth }}
                className={`
            flex-none h-full overflow-hidden border-l dark:border-slate-800 transition-all duration-300 ease-in-out
            ${isPaletteCollapsed ? 'opacity-0 pointer-events-none border-l-0' : 'opacity-100 hidden lg:flex flex-col'}
        `}>

                <Card className="h-full flex flex-col shadow-md border-t-4 border-t-slate-500 dark:border-t-slate-600 bg-white dark:bg-slate-900 border-x dark:border-x-slate-800 border-b dark:border-b-slate-800">
                    <CardContent className="p-4 flex-1 overflow-y-auto overflow-x-hidden">
                        <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Question Palette</h3>

                        <div className="mb-4">
                            <div className="grid grid-cols-2 gap-2 mb-2 text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-2"><div className="w-5 h-5 bg-white border border-slate-200 rounded-md text-[9px] flex items-center justify-center font-bold">1</div> Not Visited</div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 bg-red-500 border border-red-600 rounded-md text-[9px] flex items-center justify-center font-bold text-white clip-polygon-answer">2</div> Not Ans</div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 bg-green-500 border border-green-600 rounded-md text-[9px] flex items-center justify-center font-bold text-white">3</div> Answered</div>
                                <div className="flex items-center gap-2"><div className="w-5 h-5 bg-purple-600 border border-purple-700 rounded-md text-[9px] flex items-center justify-center font-bold text-white">4</div> Review</div>
                                <div className="flex items-center gap-2 relative">
                                    <div className="w-5 h-5 bg-purple-600 border border-purple-700 rounded-md text-[9px] flex items-center justify-center font-bold text-white relative">
                                        5
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full"><CheckCircle className="w-2.5 h-2.5 text-green-500 fill-white" /></div>
                                    </div>
                                    <span className="ml-2 leading-tight">Ans & Review</span>
                                </div>
                            </div>
                            <hr className="border-slate-200 dark:border-slate-700" />
                        </div>

                        <QuestionPalette />
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* Submit Confirmation Dialog */}
        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Submit Test?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4 pt-2">
                            <p>Are you sure you want to finish the test? You cannot change your answers after submitting.</p>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-slate-50 p-3 rounded-md border text-center">
                                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Questions</div>
                                    <div className="text-xl font-bold text-slate-800">{test.questions.length}</div>
                                </div>
                                <div className="bg-green-50 p-3 rounded-md border border-green-100 text-center">
                                    <div className="text-xs text-green-600 uppercase font-bold tracking-wider mb-1">Answered</div>
                                    <div className="text-xl font-bold text-green-700">{Object.keys(answers).length}</div>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-md border border-purple-100 text-center">
                                    <div className="text-xs text-purple-600 uppercase font-bold tracking-wider mb-1">Marked for Review</div>
                                    <div className="text-xl font-bold text-purple-700">{markedForReview.size}</div>
                                </div>
                                <div className="bg-red-50 p-3 rounded-md border border-red-100 text-center">
                                    <div className="text-xs text-red-600 uppercase font-bold tracking-wider mb-1">Unanswered</div>
                                    <div className="text-xl font-bold text-red-700">{test.questions.length - Object.keys(answers).length}</div>
                                </div>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmSubmit} className="bg-primary">Yes, Submit</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Time Up Dialog - Non-dismissible essentially */}
        <AlertDialog open={isTimeUp}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                        <Clock className="w-5 h-5" /> Time's Up!
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        The time allocated for this test has expired. Please submit your answers to see your result.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={confirmSubmit}>Submit Test</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Resume Session Dialog */}
        <AlertDialog open={showResumeDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Resume Test?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {isRefresh
                            ? "Resuming your active test session. Click continue."
                            : "We found an interrupted session. Would you like to continue from where you left off?"
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    {!isRefresh && <AlertDialogCancel onClick={cancelResume}>Start Over</AlertDialogCancel>}
                    <AlertDialogAction onClick={handleResumeTest}>Continue Test</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div >
);
}
