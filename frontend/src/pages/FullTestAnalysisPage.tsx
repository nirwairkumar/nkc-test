import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    BarChart2, TrendingUp, Users, Award, CheckCircle2, Clock, ArrowLeft,
    Download, Share2, Printer, FileSpreadsheet, FileText, Send, RefreshCw,
    Search, Filter, SlidersHorizontal, ChevronDown, ChevronUp, Sparkles,
    AlertTriangle, HelpCircle, Check, X, Eye, BookOpen, Layers, Target,
    Zap, ArrowUpRight, UserCheck, Flame, Info, ChevronRight, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import LatexRenderer from '@/components/ui/LatexRenderer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
    XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTestById, fetchAllTests, fetchTestsByUserId } from '@/lib/testsApi';
import { fetchAttemptsForTest } from '@/lib/attemptsApi';
import { fetchUsersByIds } from '@/lib/usersApi';
import { isSampleUser } from '@/lib/teacherDashboardApi';
import { supabase } from '@/integrations/supabase/client';

// --- MOCK / FALLBACK DATASETS ---
const MOCK_TEST_DETAILS = {
    id: "test-physics-101",
    title: "Physics & Mechanics Advanced Mock Paper 12",
    category: "JEE Main & Advanced",
    created_at: "2026-07-28T10:00:00Z",
    duration: 180, // minutes
    total_questions: 75,
    total_max_marks: 300,
    creator_name: "Dr. Alok Verma",
    creator_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    visibility: "Public",
    institution_name: "Apex Physics Academy"
};

const INITIAL_STUDENTS = [
    {
        id: "stu-1",
        name: "Aarav Sharma",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120",
        rollNo: "PHY-2026-001",
        email: "aarav.sharma@apex.edu",
        batch: "Batch A (Target 2026)",
        institution: "Apex Main Campus",
        status: "Completed",
        score: 284,
        totalMarks: 300,
        percentage: 94.6,
        rank: 1,
        timeTaken: "2h 15m",
        timeTakenSeconds: 8100,
        positiveMarks: 288,
        negativeMarks: 4,
        netScore: 284,
        attemptedCount: 74,
        correctCount: 72,
        wrongCount: 2,
        skippedCount: 1,
        partialCount: 0,
        reviewCount: 3,
        accuracyPct: 97.3,
        startedAt: "10:00 AM",
        completedAt: "12:15 PM",
        submissionTime: "2026-07-28 12:15 PM",
        result: "Pass",
        strongTopics: ["Kinematics", "Rotational Dynamics", "Electrostatics"],
        weakTopics: ["Wave Optics"],
        teacherNotes: "Exceptional speed and accuracy in numerical questions."
    },
    {
        id: "stu-2",
        name: "Ananya Deshmukh",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120",
        rollNo: "PHY-2026-008",
        email: "ananya.d@apex.edu",
        batch: "Batch A (Target 2026)",
        institution: "Apex Main Campus",
        status: "Completed",
        score: 268,
        totalMarks: 300,
        percentage: 89.3,
        rank: 2,
        timeTaken: "2h 32m",
        timeTakenSeconds: 9120,
        positiveMarks: 276,
        negativeMarks: 8,
        netScore: 268,
        attemptedCount: 73,
        correctCount: 69,
        wrongCount: 4,
        skippedCount: 2,
        partialCount: 0,
        reviewCount: 5,
        accuracyPct: 94.5,
        startedAt: "10:00 AM",
        completedAt: "12:32 PM",
        submissionTime: "2026-07-28 12:32 PM",
        result: "Pass",
        strongTopics: ["Electrostatics", "Thermodynamics", "Modern Physics"],
        weakTopics: ["Rigid Body Dynamics"],
        teacherNotes: "Strong theoretical grasp, minor calculation error in Sec B."
    },
    {
        id: "stu-3",
        name: "Rohan Varma",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
        rollNo: "PHY-2026-015",
        email: "rohan.v@apex.edu",
        batch: "Batch B (Morning)",
        institution: "Apex West Wing",
        status: "Completed",
        score: 242,
        totalMarks: 300,
        percentage: 80.6,
        rank: 3,
        timeTaken: "2h 45m",
        timeTakenSeconds: 9900,
        positiveMarks: 256,
        negativeMarks: 14,
        netScore: 242,
        attemptedCount: 71,
        correctCount: 64,
        wrongCount: 7,
        skippedCount: 4,
        partialCount: 0,
        reviewCount: 2,
        accuracyPct: 90.1,
        startedAt: "10:02 AM",
        completedAt: "12:47 PM",
        submissionTime: "2026-07-28 12:47 PM",
        result: "Pass",
        strongTopics: ["Newton's Laws", "Current Electricity"],
        weakTopics: ["Capacitance", "Magnetic Effects"],
        teacherNotes: "Needs practice on timed multi-correct questions."
    },
    {
        id: "stu-4",
        name: "Diya Patel",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
        rollNo: "PHY-2026-022",
        email: "diya.patel@apex.edu",
        batch: "Batch A (Target 2026)",
        institution: "Apex Main Campus",
        status: "Completed",
        score: 226,
        totalMarks: 300,
        percentage: 75.3,
        rank: 4,
        timeTaken: "2h 50m",
        timeTakenSeconds: 10200,
        positiveMarks: 240,
        negativeMarks: 14,
        netScore: 226,
        attemptedCount: 68,
        correctCount: 60,
        wrongCount: 8,
        skippedCount: 7,
        partialCount: 0,
        reviewCount: 6,
        accuracyPct: 88.2,
        startedAt: "10:00 AM",
        completedAt: "12:50 PM",
        submissionTime: "2026-07-28 12:50 PM",
        result: "Pass",
        strongTopics: ["Optics", "Fluid Mechanics"],
        weakTopics: ["AC Circuits"],
        teacherNotes: "Consistent performance across physics topics."
    },
    {
        id: "stu-5",
        name: "Kabir Mehta",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
        rollNo: "PHY-2026-031",
        email: "kabir.mehta@apex.edu",
        batch: "Batch B (Morning)",
        institution: "Apex West Wing",
        status: "Completed",
        score: 198,
        totalMarks: 300,
        percentage: 66.0,
        rank: 5,
        timeTaken: "2h 40m",
        timeTakenSeconds: 9600,
        positiveMarks: 220,
        negativeMarks: 22,
        netScore: 198,
        attemptedCount: 67,
        correctCount: 55,
        wrongCount: 12,
        skippedCount: 8,
        partialCount: 0,
        reviewCount: 4,
        accuracyPct: 82.0,
        startedAt: "10:05 AM",
        completedAt: "12:45 PM",
        submissionTime: "2026-07-28 12:45 PM",
        result: "Pass",
        strongTopics: ["Work Power Energy"],
        weakTopics: ["Electromagnetic Induction", "Gravitation"],
        teacherNotes: "Negative marks are hurting overall rank. Avoid wild guesses."
    },
    {
        id: "stu-6",
        name: "Siddharth Rao",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120",
        rollNo: "PHY-2026-045",
        email: "siddharth.r@apex.edu",
        batch: "Batch C (Evening)",
        institution: "Apex South Center",
        status: "Completed",
        score: 168,
        totalMarks: 300,
        percentage: 56.0,
        rank: 6,
        timeTaken: "2h 55m",
        timeTakenSeconds: 10500,
        positiveMarks: 192,
        negativeMarks: 24,
        netScore: 168,
        attemptedCount: 62,
        correctCount: 48,
        wrongCount: 14,
        skippedCount: 13,
        partialCount: 0,
        reviewCount: 1,
        accuracyPct: 77.4,
        startedAt: "10:00 AM",
        completedAt: "12:55 PM",
        submissionTime: "2026-07-28 12:55 PM",
        result: "Pass",
        strongTopics: ["Kinematics"],
        weakTopics: ["Thermodynamics", "Capacitance"],
        teacherNotes: "Needs revision in 12th class syllabus physics portion."
    },
    {
        id: "stu-7",
        name: "Isha Nair",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120",
        rollNo: "PHY-2026-059",
        email: "isha.nair@apex.edu",
        batch: "Batch C (Evening)",
        institution: "Apex South Center",
        status: "Completed",
        score: 134,
        totalMarks: 300,
        percentage: 44.6,
        rank: 7,
        timeTaken: "2h 10m",
        timeTakenSeconds: 7800,
        positiveMarks: 160,
        negativeMarks: 26,
        netScore: 134,
        attemptedCount: 54,
        correctCount: 40,
        wrongCount: 14,
        skippedCount: 21,
        partialCount: 0,
        reviewCount: 0,
        accuracyPct: 74.0,
        startedAt: "10:10 AM",
        completedAt: "12:20 PM",
        submissionTime: "2026-07-28 12:20 PM",
        result: "Fail",
        strongTopics: ["Units & Dimensions"],
        weakTopics: ["Rotational Dynamics", "Magnetism", "Optics"],
        teacherNotes: "Requires dedicated remedial sessions in Mechanics."
    },
    {
        id: "stu-8",
        name: "Vikramaditya Roy",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120",
        rollNo: "PHY-2026-072",
        email: "vikram.roy@apex.edu",
        batch: "Batch B (Morning)",
        institution: "Apex West Wing",
        status: "Completed",
        score: 92,
        totalMarks: 300,
        percentage: 30.6,
        rank: 8,
        timeTaken: "1h 45m",
        timeTakenSeconds: 6300,
        positiveMarks: 124,
        negativeMarks: 32,
        netScore: 92,
        attemptedCount: 48,
        correctCount: 31,
        wrongCount: 17,
        skippedCount: 27,
        partialCount: 0,
        reviewCount: 2,
        accuracyPct: 64.5,
        startedAt: "10:00 AM",
        completedAt: "11:45 AM",
        submissionTime: "2026-07-28 11:45 AM",
        result: "Fail",
        strongTopics: ["Simple Harmonic Motion"],
        weakTopics: ["Almost all core topics"],
        teacherNotes: "Left test early. Needs 1-on-1 counseling on exam strategy."
    },
    {
        id: "stu-9",
        name: "Neha Kulkarni",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
        rollNo: "PHY-2026-081",
        email: "neha.k@apex.edu",
        batch: "Batch A (Target 2026)",
        institution: "Apex Main Campus",
        status: "Live",
        score: 182,
        totalMarks: 300,
        percentage: 60.6,
        rank: 9,
        timeTaken: "2h 05m (Live)",
        timeTakenSeconds: 7500,
        positiveMarks: 196,
        negativeMarks: 14,
        netScore: 182,
        attemptedCount: 52,
        correctCount: 49,
        wrongCount: 3,
        skippedCount: 23,
        partialCount: 0,
        reviewCount: 8,
        accuracyPct: 94.2,
        startedAt: "10:30 AM",
        completedAt: "In Progress",
        submissionTime: "Live Active",
        result: "Pass",
        strongTopics: ["Electrostatics"],
        weakTopics: ["Pending completion"],
        teacherNotes: "Currently answering Section B numerical questions."
    },
    {
        id: "stu-10",
        name: "Manish Agarwal",
        avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=120",
        rollNo: "PHY-2026-095",
        email: "manish.a@apex.edu",
        batch: "Batch C (Evening)",
        institution: "Apex South Center",
        status: "Absent",
        score: 0,
        totalMarks: 300,
        percentage: 0.0,
        rank: 10,
        timeTaken: "0m",
        timeTakenSeconds: 0,
        positiveMarks: 0,
        negativeMarks: 0,
        netScore: 0,
        attemptedCount: 0,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 75,
        partialCount: 0,
        reviewCount: 0,
        accuracyPct: 0.0,
        startedAt: "N/A",
        completedAt: "N/A",
        submissionTime: "Absent",
        result: "Fail",
        strongTopics: [],
        weakTopics: ["Did not attend"],
        teacherNotes: "Absent without prior notification. Contact parent."
    }
];

const MOCK_QUESTIONS = [
    {
        qNum: 1,
        topic: "Kinematics",
        text: "A projectile is fired with speed u at angle theta. What is the radius of curvature at the highest point of its trajectory?",
        difficulty: "Easy",
        accuracyPct: 88.5,
        avgTimeSeconds: 42,
        correctPct: 88.5,
        wrongPct: 8.2,
        skippedPct: 3.3,
        partialPct: 0,
        discriminationIndex: 0.76,
        bloomLevel: "Application"
    },
    {
        qNum: 12,
        topic: "Rotational Dynamics",
        text: "A solid sphere rolls without slipping down an inclined plane of inclination theta. Calculate the acceleration of the center of mass.",
        difficulty: "Medium",
        accuracyPct: 62.4,
        avgTimeSeconds: 110,
        correctPct: 62.4,
        wrongPct: 24.1,
        skippedPct: 13.5,
        partialPct: 0,
        discriminationIndex: 0.68,
        bloomLevel: "Analysis"
    },
    {
        qNum: 18,
        topic: "Wave Optics & Interference",
        text: "In YDSE with light of wavelength 600nm, a thin glass plate of index 1.5 is placed in front of one slit. Find the fringe shift.",
        difficulty: "Tricky",
        accuracyPct: 14.2,
        avgTimeSeconds: 185,
        correctPct: 14.2,
        wrongPct: 68.4,
        skippedPct: 17.4,
        partialPct: 0,
        discriminationIndex: 0.22,
        bloomLevel: "Evaluation / Problem Solving"
    },
    {
        qNum: 24,
        topic: "Electrostatics & Gauss Law",
        text: "Determine the electric potential at a distance r from a non-uniformly charged non-conducting sphere of density rho = rho0 * r.",
        difficulty: "Hard",
        accuracyPct: 34.8,
        avgTimeSeconds: 150,
        correctPct: 34.8,
        wrongPct: 41.2,
        skippedPct: 24.0,
        partialPct: 0,
        discriminationIndex: 0.81,
        bloomLevel: "Synthesis"
    },
    {
        qNum: 35,
        topic: "Thermodynamics & Heat",
        text: "An ideal monoatomic gas undergoes a cyclic process A-B-C-A where A-B is isothermal. Calculate total work done per cycle.",
        difficulty: "Medium",
        accuracyPct: 71.0,
        avgTimeSeconds: 95,
        correctPct: 71.0,
        wrongPct: 19.5,
        skippedPct: 9.5,
        partialPct: 0,
        discriminationIndex: 0.72,
        bloomLevel: "Application"
    }
];

const SCORE_DISTRIBUTION_DATA = [
    { range: '0 - 20%', count: 14, label: 'Poor (<20%)' },
    { range: '21 - 40%', count: 28, label: 'Below Avg' },
    { range: '41 - 60%', count: 85, label: 'Average' },
    { range: '61 - 80%', count: 142, label: 'Good' },
    { range: '81 - 100%', count: 73, label: 'Top Tier' }
];

const TIMELINE_DATA = [
    { time: '10:00 AM', submissions: 12 },
    { time: '10:30 AM', submissions: 45 },
    { time: '11:00 AM', submissions: 88 },
    { time: '11:30 AM', submissions: 120 },
    { time: '12:00 PM', submissions: 210 },
    { time: '12:30 PM', submissions: 318 },
];

const TIME_DISTRIBUTION_DATA = [
    { range: '< 1 hour', students: 18 },
    { range: '1 - 1.5 hrs', students: 42 },
    { range: '1.5 - 2 hrs', students: 115 },
    { range: '2 - 2.5 hrs', students: 124 },
    { range: '2.5 - 3 hrs', students: 43 },
];
const DIFFICULTY_DONUT_DATA = [
    { name: 'Easy (Acc > 75%)', value: 25, color: '#10b981' },
    { name: 'Medium (50-75%)', value: 30, color: '#3b82f6' },
    { name: 'Hard (25-50%)', value: 15, color: '#f59e0b' },
    { name: 'Tricky (<25%)', value: 5, color: '#ef4444' }
];

const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "-";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
};

// Helper to extract user answer for a question across various key formats
const extractUserAnswer = (answers: any, q: any, idx: number) => {
    if (!answers || typeof answers !== 'object') return undefined;
    const keysToTry = [
        q.id,
        String(q.id),
        Number(q.id),
        idx + 1,
        String(idx + 1),
        idx,
        String(idx)
    ];
    for (const key of keysToTry) {
        if (key !== undefined && key !== null && answers[key] !== undefined) {
            return answers[key];
        }
    }
    return undefined;
};

// Helper to evaluate a question answer with high precision
const evalQuestionResult = (q: any, userAns: any) => {
    if (userAns === undefined || userAns === null || userAns === '' || (Array.isArray(userAns) && userAns.length === 0)) {
        return { isCorrect: false, isWrong: false, isSkipped: true, isPartial: false, score: 0 };
    }

    const qMarks = q.marks !== undefined ? parseFloat(q.marks) : 4;
    const qNeg = q.negativeMarks !== undefined ? parseFloat(q.negativeMarks) : 0;
    const qType = q.type || 'single';

    if (qType === 'numerical') {
        const numAns = parseFloat(userAns);
        const ca = q.correctAnswer !== undefined ? q.correctAnswer : q.correct_answer;
        if (isNaN(numAns) || !ca) {
            return { isCorrect: false, isWrong: true, isSkipped: false, isPartial: false, score: -qNeg };
        }
        if (typeof ca === 'object') {
            if (ca.exactMatch && ca.exactAnswers) {
                const exacts = String(ca.exactAnswers).split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
                if (exacts.includes(numAns)) {
                    return { isCorrect: true, isWrong: false, isSkipped: false, isPartial: false, score: qMarks };
                }
            } else if (ca.min !== undefined && ca.max !== undefined) {
                if (numAns >= parseFloat(ca.min) && numAns <= parseFloat(ca.max)) {
                    return { isCorrect: true, isWrong: false, isSkipped: false, isPartial: false, score: qMarks };
                }
            }
        } else if (parseFloat(ca) === numAns) {
            return { isCorrect: true, isWrong: false, isSkipped: false, isPartial: false, score: qMarks };
        }
        return { isCorrect: false, isWrong: true, isSkipped: false, isPartial: false, score: -qNeg };
    }

    if (qType === 'multiple') {
        const caVal = q.correctAnswer !== undefined ? q.correctAnswer : q.correct_answer;
        const caArr = Array.isArray(caVal) ? caVal.map(String).sort() : [String(caVal)];
        const uArr = Array.isArray(userAns) ? userAns.map(String).sort() : [String(userAns)];
        
        const hasWrong = uArr.some(a => !caArr.includes(a));
        if (hasWrong) {
            return { isCorrect: false, isWrong: true, isSkipped: false, isPartial: false, score: -qNeg };
        }
        if (uArr.length === caArr.length && caArr.length > 0) {
            return { isCorrect: true, isWrong: false, isSkipped: false, isPartial: false, score: qMarks };
        }
        if (uArr.length > 0) {
            const frac = uArr.length / caArr.length;
            return { isCorrect: false, isWrong: false, isSkipped: false, isPartial: true, score: frac * qMarks };
        }
        return { isCorrect: false, isWrong: false, isSkipped: true, isPartial: false, score: 0 };
    }

    // Single choice / Default
    const caVal = q.correctAnswer !== undefined ? q.correctAnswer : (q.correct_answer !== undefined ? q.correct_answer : q.answer);
    const ca = String(caVal !== undefined ? caVal : '').trim();
    const u = String(userAns).trim();
    if (u === ca && ca !== '') {
        return { isCorrect: true, isWrong: false, isSkipped: false, isPartial: false, score: qMarks };
    }
    return { isCorrect: false, isWrong: true, isSkipped: false, isPartial: false, score: -qNeg };
};

export default function FullTestAnalysisPage() {
    const navigate = useNavigate();
    const { testId } = useParams<{ testId: string }>();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    const userEmail = user?.email;
    const isDemoUser = isSampleUser(userEmail);

    // Data States
    const [testInfo, setTestInfo] = useState<any>(isDemoUser ? MOCK_TEST_DETAILS : null);
    const [students, setStudents] = useState<any[]>(isDemoUser ? INITIAL_STUDENTS : []);
    const [questions, setQuestions] = useState<any[]>(isDemoUser ? MOCK_QUESTIONS : []);
    const [loading, setLoading] = useState<boolean>(true);

    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'questions' | 'toppers' | 'insights'>('overview');

    // Search & Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [scoreRangeFilter, setScoreRangeFilter] = useState('All');
    const [resultFilter, setResultFilter] = useState('All');
    const [passingMarks, setPassingMarks] = useState<number | null>(null);

    // Table Sorting
    const [sortField, setSortField] = useState<string>('rank');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Selected Rows & Column Visibility
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [drawerStudent, setDrawerStudent] = useState<any | null>(null);
    const [selectedQuestionModal, setSelectedQuestionModal] = useState<any | null>(null);

    // Detailed Student Drawer States
    const [drawerTab, setDrawerTab] = useState<'overview' | 'topics' | 'questions'>('overview');
    const [drawerQFilter, setDrawerQFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');
    const [drawerQSearch, setDrawerQSearch] = useState('');
    const [drawerTeacherNotes, setDrawerTeacherNotes] = useState('');

    const openStudentDrawer = (student: any) => {
        setDrawerStudent(student);
        setDrawerTab('overview');
        setDrawerQFilter('all');
        setDrawerQSearch('');
        setDrawerTeacherNotes(student.teacherNotes || '');
    };

    const drawerEvaluatedQuestions = useMemo(() => {
        if (!drawerStudent || !questions || questions.length === 0) return [];
        return questions.map((q: any, idx: number) => {
            const uAns = extractUserAnswer(drawerStudent.answers, q, idx);
            const evalRes = evalQuestionResult(q, uAns);
            return {
                q,
                idx,
                qNum: q.qNum || (idx + 1),
                uAns,
                evalRes
            };
        });
    }, [drawerStudent, questions]);

    const drawerFilteredQuestions = useMemo(() => {
        return drawerEvaluatedQuestions.filter(({ q, qNum, evalRes }) => {
            if (drawerQFilter === 'correct' && !evalRes.isCorrect) return false;
            if (drawerQFilter === 'wrong' && !evalRes.isWrong) return false;
            if (drawerQFilter === 'skipped' && !evalRes.isSkipped) return false;
            if (drawerQSearch.trim()) {
                const qStr = (q.text || q.question_text || q.question || '').toLowerCase();
                const numStr = String(qNum);
                const searchLower = drawerQSearch.toLowerCase();
                return qStr.includes(searchLower) || numStr.includes(searchLower);
            }
            return true;
        });
    }, [drawerEvaluatedQuestions, drawerQFilter, drawerQSearch]);

    const drawerTopicData = useMemo(() => {
        if (!drawerStudent || !questions || questions.length === 0) return [];
        const topicMap: Record<string, { name: string; totalQ: number; maxScore: number; score: number; correct: number; wrong: number; skipped: number }> = {};

        drawerEvaluatedQuestions.forEach(({ q, evalRes }) => {
            const tName = q.topic || q.subject || "General Assessment";
            if (!topicMap[tName]) {
                topicMap[tName] = { name: tName, totalQ: 0, maxScore: 0, score: 0, correct: 0, wrong: 0, skipped: 0 };
            }
            const qMarks = q.marks !== undefined ? parseFloat(q.marks) : 4;
            topicMap[tName].totalQ += 1;
            topicMap[tName].maxScore += qMarks;
            topicMap[tName].score += (evalRes.score || 0);

            if (evalRes.isCorrect) topicMap[tName].correct += 1;
            else if (evalRes.isWrong) topicMap[tName].wrong += 1;
            else topicMap[tName].skipped += 1;
        });

        return Object.values(topicMap).map(t => {
            const pct = t.maxScore > 0 ? Math.max(0, Math.round((t.score / t.maxScore) * 100)) : 0;
            const performance = pct >= 70 ? 'Strong' : pct >= 40 ? 'Moderate' : 'Weak';
            return { ...t, percentage: pct, performance };
        });
    }, [drawerStudent, questions, drawerEvaluatedQuestions]);

    const handleSaveTeacherNotes = () => {
        if (!drawerStudent) return;
        setStudents(prev => prev.map(s => s.id === drawerStudent.id ? { ...s, teacherNotes: drawerTeacherNotes } : s));
        setDrawerStudent(prev => prev ? { ...prev, teacherNotes: drawerTeacherNotes } : null);
        toast.success("Teacher remarks updated.");
    };

    // Load Test Data if ID exists or load teacher's tests
    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const loadData = async () => {
            try {
                let targetTestId = testId || searchParams.get('testId') || searchParams.get('id');
                if (!targetTestId && user?.id) {
                    const { data: userTests } = await fetchTestsByUserId(user.id);
                    if (userTests && userTests.length > 0) {
                        targetTestId = userTests[0].id;
                    }
                }

                if (targetTestId) {
                    const { data: fetchedTest } = await fetchTestById(targetTestId);
                    let rawQuestions: any[] = [];
                    if (fetchedTest && isMounted) {
                        setTestInfo({
                            id: fetchedTest.id,
                            title: fetchedTest.title || "Untitled Test",
                            category: fetchedTest.custom_category || fetchedTest.subject || "General Assessment",
                            created_at: fetchedTest.created_at || new Date().toISOString(),
                            duration: fetchedTest.duration || 180,
                            total_questions: fetchedTest.total_questions || fetchedTest.questions?.length || 0,
                            total_max_marks: fetchedTest.total_max_marks || 300,
                            creator_name: fetchedTest.creator_name || user?.user_metadata?.full_name || "Educator",
                            creator_avatar: fetchedTest.creator_avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=creator",
                            visibility: fetchedTest.is_public ? "Public" : "Private",
                            institution_name: fetchedTest.institution_name || "Partner Institution"
                        });
                        if (fetchedTest.passing_marks || fetchedTest.passing_score) {
                            setPassingMarks(fetchedTest.passing_marks || fetchedTest.passing_score);
                        }
                        if (fetchedTest.enable_section_mode && fetchedTest.sections && Array.isArray(fetchedTest.sections)) {
                            rawQuestions = fetchedTest.sections.flatMap((sec: any) => sec.questions || []);
                        } else if (fetchedTest.questions && Array.isArray(fetchedTest.questions)) {
                            rawQuestions = fetchedTest.questions;
                        }
                    }

                    // Load live attempt data
                    const res = await fetchAttemptsForTest(targetTestId);
                    let attemptList = res?.data;

                    if (!attemptList || !Array.isArray(attemptList) || attemptList.length === 0) {
                        const { data: sbData } = await (supabase as any)
                            .from('user_tests')
                            .select('*, profiles(full_name, avatar_url, email), tests(title, total_max_marks)')
                            .eq('test_id', targetTestId);
                        if (sbData && Array.isArray(sbData)) {
                            attemptList = sbData;
                        }
                    }

                    if (attemptList && Array.isArray(attemptList) && attemptList.length > 0 && isMounted) {
                        // Fetch missing user profile details if user_ids exist
                        const userIds = Array.from(new Set(attemptList.map((d: any) => d.user_id).filter(Boolean))) as string[];
                        let userMap = new Map();
                        if (userIds.length > 0) {
                            try {
                                const { data: usersData } = await fetchUsersByIds(userIds);
                                if (usersData && Array.isArray(usersData)) {
                                    userMap = new Map(usersData.map((u: any) => [u.id, u]));
                                }
                            } catch (uErr) {
                                console.error("Could not fetch user profiles for attempts:", uErr);
                            }
                        }

                        const mapped = attemptList.map((att: any, idx: number) => {
                            const userProfile = userMap.get(att.user_id) || att.user || att.profiles;

                            // 1. Check form inputs saved in startFormData or registrationData
                            let formName = "";
                            const formDataSources = [
                                att.metadata?.startFormData,
                                att.metadata?.start_form_data,
                                att.metadata?.registrationData,
                                att.metadata?.registration_data,
                                att.metadata?.form_data,
                                att.metadata?.custom_fields,
                                att.registration_form_data
                            ];
                            for (const fd of formDataSources) {
                                if (fd && typeof fd === 'object') {
                                    const keys = Object.keys(fd);
                                    const nameKey = keys.find(k => k.toLowerCase().includes('name'));
                                    if (nameKey && fd[nameKey] && String(fd[nameKey]).trim()) {
                                        formName = String(fd[nameKey]).trim();
                                        break;
                                    }
                                    for (const k of keys) {
                                        if (fd[k] && typeof fd[k] === 'string' && fd[k].trim() && !k.toLowerCase().includes('email') && !k.toLowerCase().includes('phone') && !k.toLowerCase().includes('roll')) {
                                            formName = String(fd[k]).trim();
                                            break;
                                        }
                                    }
                                    if (formName) break;
                                }
                            }

                            // 2. Direct string fields
                            const directName = att.candidate_name || att.full_name || att.name || att.student_name || att.user_name || att.metadata?.name || att.metadata?.full_name || att.metadata?.candidate_name;

                            // 3. User account profile name
                            const profileName = userProfile?.full_name || userProfile?.name || userProfile?.user_metadata?.full_name || (userProfile?.email ? userProfile.email.split('@')[0] : null);

                            // 4. Email fallback
                            const email = att.email || att.metadata?.email || userProfile?.email || "";
                            const emailFallbackName = email ? email.split('@')[0] : null;

                            const name = formName || directName || profileName || emailFallbackName || `Candidate #${idx + 1}`;
                            const avatar = att.profiles?.avatar_url || userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || idx)}`;

                            const totalMarks = att.total_max_marks || att.tests?.total_max_marks || fetchedTest?.total_max_marks || 300;
                            const score = att.score ?? 0;
                            const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 1000) / 10 : 0;
                            
                            let durSec = att.duration_seconds || att.time_taken_seconds || att.metadata?.duration_seconds || att.metadata?.time_taken_seconds || att.metadata?.time_taken || 0;
                            if (!durSec && att.created_at && (att.started_at || att.metadata?.startedAt)) {
                                const startTs = new Date(att.started_at || att.metadata.startedAt).getTime();
                                const endTs = new Date(att.created_at).getTime();
                                if (endTs > startTs) {
                                    durSec = Math.round((endTs - startTs) / 1000);
                                }
                            }
                            const timeTaken = formatDuration(durSec);

                            const answers = att.answers || att.user_answers || att.metadata?.answers;
                            let correctCount = att.correct_count ?? att.metadata?.stats?.correctCount ?? att.metadata?.correct_count;
                            let wrongCount = att.wrong_count ?? att.metadata?.stats?.wrongCount ?? att.metadata?.wrong_count;
                            let skippedCount = att.skipped_count ?? att.metadata?.stats?.unattemptedCount ?? att.metadata?.skipped_count;
                            let positiveMarks = att.positive_marks ?? att.metadata?.stats?.positiveMarks;
                            let negativeMarks = att.negative_marks ?? att.metadata?.stats?.negativeMarks;

                            if ((correctCount === undefined || wrongCount === undefined) && answers && rawQuestions.length > 0) {
                                let c = 0, w = 0, s = 0, pos = 0, neg = 0;
                                rawQuestions.forEach((q: any, qIdx: number) => {
                                    const uAns = extractUserAnswer(answers, q, qIdx);
                                    const res = evalQuestionResult(q, uAns);
                                    if (res.isCorrect) { c++; pos += (res.score || 4); }
                                    else if (res.isWrong) { w++; neg += Math.abs(res.score || 0); }
                                    else if (res.isPartial) { pos += (res.score || 0); }
                                    else { s++; }
                                });
                                correctCount = c;
                                wrongCount = w;
                                skippedCount = s;
                                positiveMarks = pos;
                                negativeMarks = neg;
                            }

                            correctCount = correctCount ?? 0;
                            wrongCount = wrongCount ?? 0;
                            const attemptedCount = correctCount + wrongCount;
                            const totalQs = fetchedTest?.total_questions || rawQuestions.length || 0;
                            skippedCount = skippedCount ?? Math.max(0, totalQs - attemptedCount);
                            const accuracyPct = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

                            positiveMarks = positiveMarks ?? (correctCount * 4);
                            negativeMarks = negativeMarks ?? (wrongCount * 1);

                            return {
                                id: att.id || `att-${idx}`,
                                user_id: att.user_id,
                                name,
                                avatar,
                                email,
                                status: att.status || "Completed",
                                score,
                                totalMarks,
                                percentage,
                                rank: idx + 1,
                                durationSeconds: durSec,
                                timeTaken,
                                positiveMarks,
                                negativeMarks,
                                correctCount,
                                wrongCount,
                                skippedCount,
                                accuracyPct,
                                startedAt: (att.started_at || att.metadata?.startedAt) ? new Date(att.started_at || att.metadata.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-",
                                completedAt: att.created_at ? new Date(att.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-",
                                submissionTime: att.created_at ? new Date(att.created_at).toLocaleString() : "-",
                                strongTopics: att.metadata?.strong_topics || [],
                                weakTopics: att.metadata?.weak_topics || [],
                                teacherNotes: att.teacher_notes || "",
                                answers
                            };
                        });
                        setStudents(mapped);
                    } else if (isMounted) {
                        setStudents(isDemoUser ? INITIAL_STUDENTS : []);
                    }

                    if (rawQuestions.length > 0 && isMounted) {
                        const questionsWithRealStats = rawQuestions.map((q: any, idx: number) => {
                            const qId = q.id || `q-${idx + 1}`;
                            let correctCount = 0;
                            let wrongCount = 0;
                            let skippedCount = 0;
                            let totalTimeSec = 0;
                            let attemptedTimeCount = 0;

                            if (attemptList && attemptList.length > 0) {
                                attemptList.forEach((att: any) => {
                                    const answers = att.answers || att.user_answers || att.metadata?.answers || {};
                                    const timings = att.question_timings || att.metadata?.question_timings || {};
                                    const uAns = extractUserAnswer(answers, q, idx);

                                    const res = evalQuestionResult(q, uAns);
                                    if (res.isSkipped) skippedCount++;
                                    else if (res.isCorrect) correctCount++;
                                    else wrongCount++;

                                    const tKey = q.id !== undefined ? q.id : (idx + 1);
                                    const t = timings[tKey] ?? timings[String(tKey)] ?? timings[idx + 1] ?? timings[idx];
                                    if (t && !isNaN(Number(t))) {
                                        totalTimeSec += Number(t);
                                        attemptedTimeCount++;
                                    }
                                });
                            }

                            const totalAttempts = attemptList ? attemptList.length : 0;
                            const accuracyPct = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
                            const correctPct = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
                            const wrongPct = totalAttempts > 0 ? Math.round((wrongCount / totalAttempts) * 100) : 0;
                            const skippedPct = totalAttempts > 0 ? (100 - correctPct - wrongPct) : 100;
                            const avgTimeSeconds = attemptedTimeCount > 0 ? Math.round(totalTimeSec / attemptedTimeCount) : 0;

                            let discriminationIndex: number | string = "-";
                            if (attemptList && attemptList.length > 0) {
                                const sortedAttempts = [...attemptList].sort((a, b) => (b.score || 0) - (a.score || 0));
                                const groupSize = Math.max(1, Math.floor(sortedAttempts.length * 0.27));
                                const upperGroup = sortedAttempts.slice(0, groupSize);
                                const lowerGroup = sortedAttempts.slice(-groupSize);

                                const isQCorrect = (att: any) => {
                                    const answers = att.answers || att.user_answers || att.metadata?.answers || {};
                                    const uAns = extractUserAnswer(answers, q, idx);
                                    return evalQuestionResult(q, uAns).isCorrect;
                                };

                                const RU = upperGroup.filter(isQCorrect).length;
                                const RL = lowerGroup.filter(isQCorrect).length;
                                const dVal = (RU - RL) / groupSize;
                                discriminationIndex = parseFloat(dVal.toFixed(2));
                            }

                            let difficulty = q.difficulty;
                            if (!difficulty || difficulty === "Medium") {
                                if (totalAttempts > 0) {
                                    difficulty = accuracyPct >= 75 ? "Easy" : accuracyPct >= 40 ? "Medium" : "Hard";
                                } else {
                                    difficulty = q.difficulty || "Medium";
                                }
                            }

                            return {
                                ...q,
                                qNum: q.qNum || q.question_number || (idx + 1),
                                topic: q.topic || q.subject || "General Assessment",
                                text: q.text || q.question_text || q.question || `Question #${idx + 1}`,
                                difficulty,
                                accuracyPct,
                                avgTimeSeconds,
                                correctPct,
                                wrongPct,
                                skippedPct,
                                discriminationIndex
                            };
                        });
                        setQuestions(questionsWithRealStats);
                    }
                } else if (isMounted) {
                    if (isDemoUser) {
                        setTestInfo(MOCK_TEST_DETAILS);
                        setStudents(INITIAL_STUDENTS);
                        setQuestions(MOCK_QUESTIONS);
                    } else {
                        setTestInfo(null);
                        setStudents([]);
                        setQuestions([]);
                    }
                }
            } catch (err) {
                console.error("Error loading test details for analysis:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadData();
        return () => { isMounted = false; };
    }, [testId, searchParams, user?.id, isDemoUser]);

    // Computed Filtered & Sorted Students
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const matchesSearch = searchQuery === '' ||
                student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (student.email && student.email.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesStatus = statusFilter === 'All' || student.status === statusFilter;

            let matchesResult = true;
            if (passingMarks !== null && passingMarks !== undefined && passingMarks > 0) {
                const res = student.score >= passingMarks ? 'Pass' : 'Fail';
                matchesResult = resultFilter === 'All' || res === resultFilter;
            }

            let matchesScore = true;
            if (scoreRangeFilter === '80%+') matchesScore = student.percentage >= 80;
            else if (scoreRangeFilter === '50-79%') matchesScore = student.percentage >= 50 && student.percentage < 80;
            else if (scoreRangeFilter === '<50%') matchesScore = student.percentage < 50;

            return matchesSearch && matchesStatus && matchesResult && matchesScore;
        }).sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];
            if (typeof valA === 'string') {
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortOrder === 'asc' ? (valA - valB) : (valB - valA);
        });
    }, [students, searchQuery, statusFilter, scoreRangeFilter, resultFilter, passingMarks, sortField, sortOrder]);

    // Derived Statistics & Charts (real data computed)
    const totalStudentsCount = students.length;
    const completedCount = students.filter(s => s.status === 'Completed').length;
    const liveCount = students.filter(s => s.status === 'Live').length;
    const avgScore = totalStudentsCount > 0 ? Math.round(students.reduce((acc, s) => acc + s.score, 0) / totalStudentsCount) : 0;
    const highestScore = totalStudentsCount > 0 ? Math.max(...students.map(s => s.score)) : 0;
    const lowestScore = totalStudentsCount > 0 ? Math.min(...students.map(s => s.score)) : 0;
    const scoresSorted = [...students.map(s => s.score)].sort((a, b) => a - b);
    const medianScore = scoresSorted.length > 0 ? (scoresSorted[Math.floor(scoresSorted.length / 2)] || 0) : 0;
    const avgAccuracy = totalStudentsCount > 0 ? (students.reduce((acc, s) => acc + s.accuracyPct, 0) / totalStudentsCount).toFixed(1) : "0.0";
    const completionRate = totalStudentsCount > 0 ? ((completedCount / totalStudentsCount) * 100).toFixed(1) : "0.0";

    const totalSecondsDuration = students.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const avgSecondsDuration = totalStudentsCount > 0 ? Math.round(totalSecondsDuration / totalStudentsCount) : 0;
    const avgTimeDisplay = formatDuration(avgSecondsDuration);

    // Dynamic Score Distribution Bins (Real Data Only)
    const scoreDistributionData = useMemo(() => {
        if (!students || students.length === 0) return [];
        const bins = [
            { range: '0 - 20%', count: 0, label: '0-20%' },
            { range: '21 - 40%', count: 0, label: '21-40%' },
            { range: '41 - 60%', count: 0, label: '41-60%' },
            { range: '61 - 80%', count: 0, label: '61-80%' },
            { range: '81 - 100%', count: 0, label: '81-100%' }
        ];
        students.forEach(s => {
            const pct = s.percentage;
            if (pct <= 20) bins[0].count++;
            else if (pct <= 40) bins[1].count++;
            else if (pct <= 60) bins[2].count++;
            else if (pct <= 80) bins[3].count++;
            else bins[4].count++;
        });
        return bins;
    }, [students]);

    // Dynamic Difficulty Donut Data (Real Data Only)
    const difficultyDonutData = useMemo(() => {
        if (!questions || questions.length === 0) return [];
        const counts: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0, Tricky: 0 };
        questions.forEach(q => {
            const d = q.difficulty || 'Medium';
            if (d in counts) counts[d]++;
            else counts.Medium++;
        });
        const colors: Record<string, string> = {
            Easy: '#10b981',
            Medium: '#3b82f6',
            Hard: '#f59e0b',
            Tricky: '#ef4444'
        };
        return Object.keys(counts)
            .filter(key => counts[key] > 0)
            .map(key => ({
                name: `${key} (${counts[key]} Qs)`,
                value: counts[key],
                color: colors[key] || '#64748b'
            }));
    }, [questions]);

    // Helpers
    const getPercentageBadgeColor = (pct: number) => {
        if (pct >= 80) return "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold";
        if (pct >= 50) return "bg-blue-50 text-blue-700 border border-blue-200 font-bold";
        if (pct >= 35) return "bg-amber-50 text-amber-700 border border-amber-200 font-bold";
        return "bg-rose-50 text-rose-700 border border-rose-200 font-bold";
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStudentIds(filteredStudents.map(s => s.id));
        } else {
            setSelectedStudentIds([]);
        }
    };

    const handleToggleStudentSelect = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Actions
    const handleExportCSV = () => {
        const headers = ["Roll No", "Name", "Batch", "Score", "Percentage", "Rank", "Time Taken", "Accuracy %", "Result"];
        const rows = filteredStudents.map(s => [
            s.rollNo, s.name, s.batch, s.score, `${s.percentage}%`, s.rank, s.timeTaken, `${s.accuracyPct}%`, s.result
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Full_Analysis_${testInfo.title.replace(/\s+/g, "_")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exported full student data to CSV/Excel!");
    };

    const handlePrint = () => {
        window.print();
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Analytics link copied to clipboard!");
    };

    const handlePublishResults = () => {
        toast.success("Results published to student portals successfully!");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-700">Loading Analysis Data...</p>
                </div>
            </div>
        );
    }

    if (!testInfo) {
        return (
            <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-24 font-sans">
                <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 shadow-xs">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate('/dashboard')}
                            className="h-9 px-3 text-slate-800 bg-slate-100 hover:bg-slate-200 cursor-pointer rounded-xl font-bold flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4 text-indigo-600" /> Back to Dashboard
                        </Button>
                    </div>
                </div>
                <div className="max-w-3xl mx-auto px-4 py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-xs">
                        <BarChart2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">No Test Selected for Analysis</h2>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                        Please select a test from your dashboard or create a new test to view student performance analytics.
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/dashboard')}
                            className="border-slate-300 text-slate-700 font-bold px-5 py-2 rounded-xl text-sm"
                        >
                            Go to Dashboard
                        </Button>
                        <Button
                            onClick={() => navigate('/create-test')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-xl text-sm shadow-md"
                        >
                            Create a Test
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-24 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Top Navigation Sticky Bar */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 transition-all shadow-xs">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate('/all-submissions')}
                            className="h-9 px-3 text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer rounded-xl font-bold flex items-center gap-2 border border-slate-200/80 shadow-2xs"
                        >
                            <ArrowLeft className="w-4 h-4 text-indigo-600" /> All Submissions
                        </Button>
                        <div className="h-5 w-px bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                                {testInfo.category}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold hidden md:inline">
                                {testInfo.institution_name}
                            </span>
                        </div>
                    </div>

                    {/* Navigation Pills (Senior Teacher Friendly) */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl text-xs font-semibold border border-slate-200/70 w-full sm:w-auto overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                                activeTab === 'overview' ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                            }`}
                        >
                            <BarChart2 className="w-4 h-4 text-indigo-600" />
                            <span>Overview</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('students')}
                            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                                activeTab === 'students' ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                            }`}
                        >
                            <Users className="w-4 h-4 text-emerald-600" />
                            <span>Student Marks ({filteredStudents.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('questions')}
                            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                                activeTab === 'questions' ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                            }`}
                        >
                            <HelpCircle className="w-4 h-4 text-amber-600" />
                            <span>Question Audit</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('toppers')}
                            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                                activeTab === 'toppers' ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                            }`}
                        >
                            <Award className="w-4 h-4 text-violet-600" />
                            <span>Leaderboard</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('insights')}
                            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                                activeTab === 'insights' ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                            }`}
                        >
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>AI Insights</span>
                        </button>
                    </div>

                    {/* Right Export Actions */}
                    <div className="flex items-center gap-2 hidden md:flex">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportCSV}
                            className="h-9 px-3 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer font-semibold rounded-xl"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" /> Export Excel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handlePublishResults}
                            className="h-9 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer rounded-xl"
                        >
                            <Send className="w-4 h-4 mr-1.5" /> Publish Results
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-8">
                {/* SECTION 1: HEADER */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                <span className="font-semibold text-slate-700">Teacher Report</span>
                                <span>•</span>
                                <span className="text-slate-600">{new Date(testInfo.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                <span>•</span>
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                    ● {testInfo.visibility}
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                                {testInfo.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80 font-semibold text-slate-700">
                                    <Clock className="w-4 h-4 text-slate-500" />
                                    <span>Duration: <strong>{testInfo.duration} Mins</strong></span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80 font-semibold text-slate-700">
                                    <HelpCircle className="w-4 h-4 text-slate-500" />
                                    <span>Total Questions: <strong>{testInfo.total_questions} Qs</strong></span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80 font-semibold text-slate-700">
                                    <Target className="w-4 h-4 text-slate-500" />
                                    <span>Max Marks: <strong>{testInfo.total_max_marks} Marks</strong></span>
                                </div>
                                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                                    <img src={testInfo.creator_avatar} alt="Creator" className="w-6 h-6 rounded-full object-cover border border-slate-200" />
                                    <span className="text-slate-800 font-bold">{testInfo.creator_name}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportCSV}
                                className="h-9 px-3.5 text-xs border-slate-200 text-slate-800 hover:bg-slate-50 cursor-pointer font-semibold rounded-xl"
                            >
                                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" /> Excel Sheet
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrint}
                                className="h-9 px-3.5 text-xs border-slate-200 text-slate-800 hover:bg-slate-50 cursor-pointer font-semibold rounded-xl"
                            >
                                <Printer className="w-4 h-4 mr-1.5 text-slate-600" /> Print Report
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleShare}
                                className="h-9 px-3.5 text-xs border-slate-200 text-slate-800 hover:bg-slate-50 cursor-pointer font-semibold rounded-xl"
                            >
                                <Share2 className="w-4 h-4 mr-1.5 text-indigo-600" /> Copy Link
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/edit-test/${testInfo.id}`)}
                                className="h-9 px-3.5 text-xs border-slate-200 text-slate-800 hover:bg-slate-50 cursor-pointer font-semibold rounded-xl"
                            >
                                Edit Test
                            </Button>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: OVERVIEW STAT CARDS (Teacher High-Visibility Metrics) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-200 transition-all">
                        <div className="flex items-center justify-between text-slate-600 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Students</span>
                            <Users className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-slate-900 tracking-tight">{totalStudentsCount}</p>
                            <p className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {completedCount} Completed
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-all">
                        <div className="flex items-center justify-between text-slate-600 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Average Score</span>
                            <BarChart2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-slate-900 tracking-tight">{avgScore} <span className="text-xs font-bold text-slate-400">/ {testInfo.total_max_marks}</span></p>
                            <p className="text-xs font-medium text-slate-600 mt-1">
                                Median: <strong>{medianScore} marks</strong>
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-amber-200 transition-all">
                        <div className="flex items-center justify-between text-slate-600 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Highest / Lowest</span>
                            <Award className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-emerald-600 tracking-tight">{highestScore}</span>
                                <span className="text-xs font-bold text-slate-500">/ Low {lowestScore}</span>
                            </div>
                            <p className="text-xs font-medium text-slate-600 mt-1">
                                Max achievable: <strong>{testInfo.total_max_marks}</strong>
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-violet-200 transition-all">
                        <div className="flex items-center justify-between text-slate-600 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Average Time</span>
                            <Clock className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-slate-900 tracking-tight">{avgTimeDisplay}</p>
                            <p className="text-xs font-medium text-slate-600 mt-1">
                                Completion Rate: <strong>{completionRate}%</strong>
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1 hover:border-emerald-200 transition-all">
                        <div className="flex items-center justify-between text-slate-600 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Accuracy Rate</span>
                            <Target className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-emerald-600 tracking-tight">{avgAccuracy}%</p>
                            <p className="text-xs font-medium text-slate-600 mt-1">
                                Total Attempts: <strong>{totalStudentsCount}</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: PERFORMANCE DISTRIBUTION CHARTS */}
                {(activeTab === 'overview' || activeTab === 'insights') && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Score Distribution Bar Chart */}
                        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Score Distribution & Percentiles</h3>
                                    <p className="text-xs text-slate-400">Student count broken down by score percentages</p>
                                </div>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                    5 Bins
                                </span>
                            </div>
                            <div className="h-64 w-full pt-4">
                                {scoreDistributionData.length === 0 || totalStudentsCount === 0 ? (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                                        Insufficient submission data to compute distribution.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={scoreDistributionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                                                cursor={{ fill: '#f1f5f9' }}
                                            />
                                            <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={42} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Question Difficulty Donut */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                            <div className="border-b border-slate-100 pb-3">
                                <h3 className="text-base font-bold text-slate-900 tracking-tight">Question Difficulty Split</h3>
                                <p className="text-xs text-slate-400">Distribution by question difficulty tier</p>
                            </div>

                            <div className="h-48 w-full relative flex items-center justify-center">
                                {difficultyDonutData.length === 0 ? (
                                    <div className="text-xs text-slate-400 font-medium">No question data available</div>
                                ) : (
                                    <>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={difficultyDonutData}
                                                    innerRadius={55}
                                                    outerRadius={75}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                >
                                                    {difficultyDonutData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-2xl font-bold text-slate-900">{questions.length}</span>
                                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Questions</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                {difficultyDonutData.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                            <span className="text-slate-600 font-medium">{d.name}</span>
                                        </div>
                                        <span className="font-bold text-slate-900">{d.value} Qs</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 7: NEEDS ATTENTION / AI INSIGHTS CARDS */}
                <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold tracking-tight">AI Test Diagnostics & Action Items</h2>
                                <p className="text-xs text-slate-400">Automated insights based on item response theory & statistical analysis</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {totalStudentsCount === 0 ? (
                            <div className="col-span-3 text-center py-6 text-slate-400 text-xs font-medium">
                                Waiting for candidate submissions to generate real-time AI diagnostic insights.
                            </div>
                        ) : (
                            <>
                                <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-2 hover:border-slate-600 transition-all">
                                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                        <CheckCircle2 className="w-4 h-4" /> Participation Summary
                                    </div>
                                    <p className="text-sm font-semibold text-slate-100 leading-snug">
                                        {totalStudentsCount} candidate{totalStudentsCount > 1 ? 's' : ''} submitted attempts.
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Average score recorded is {avgScore} marks with {avgAccuracy}% overall accuracy.
                                    </p>
                                </div>

                                <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-2 hover:border-slate-600 transition-all">
                                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                                        <Clock className="w-4 h-4" /> Time Efficiency
                                    </div>
                                    <p className="text-sm font-semibold text-slate-100 leading-snug">
                                        Average duration per attempt is {avgTimeDisplay}.
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Test completion rate stands at {completionRate}% across all candidates.
                                    </p>
                                </div>

                                <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-2 hover:border-slate-600 transition-all">
                                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                        <TrendingUp className="w-4 h-4" /> Performance Range
                                    </div>
                                    <p className="text-sm font-semibold text-slate-100 leading-snug">
                                        Highest score: {highestScore} | Lowest: {lowestScore}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Median score across candidates is {medianScore} marks out of {testInfo.total_max_marks}.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* SECTION 4: STUDENT ANALYSIS TABLE (Centerpiece) */}
                <div id="students-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                    {/* Controls & Filter Panel */}
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student Attempt Analysis</h2>
                                <p className="text-xs text-slate-400">Detailed scorecard, response breakdown, ranks and question timings</p>
                            </div>

                            {/* Global Search & Action Bar */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative w-full sm:w-64">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        placeholder="Search candidate name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 h-9 text-xs rounded-xl border-slate-200 focus:ring-indigo-500 bg-slate-50/50"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
                                    <Download className="w-3.5 h-3.5 mr-1 text-slate-500" /> Download Selected
                                </Button>
                            </div>
                        </div>

                        {/* Filter Dropdowns */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                            <span className="text-slate-400 font-medium flex items-center gap-1 mr-1">
                                <Filter className="w-3.5 h-3.5" /> Filters:
                            </span>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Completed">Completed</option>
                                <option value="Live">Live</option>
                                <option value="Absent">Absent</option>
                            </select>

                            {/* Score Range Filter */}
                            <select
                                value={scoreRangeFilter}
                                onChange={(e) => setScoreRangeFilter(e.target.value)}
                                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="All">All Score Ranges</option>
                                <option value="80%+">Top Tier (80%+)</option>
                                <option value="50-79%">Average Tier (50-79%)</option>
                                <option value="<50%">Needs Support (&lt;50%)</option>
                            </select>

                            {/* Optional Passing Marks Threshold Input */}
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-medium">
                                <span className="text-[11px] text-slate-500 font-semibold">Min Pass Marks:</span>
                                <input
                                    type="number"
                                    placeholder="Optional"
                                    value={passingMarks ?? ''}
                                    onChange={(e) => setPassingMarks(e.target.value === '' ? null : Number(e.target.value))}
                                    className="w-16 h-6 px-1.5 text-xs bg-white border border-slate-200 rounded text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Result Filter (Only if passing marks set) */}
                            {passingMarks !== null && passingMarks !== undefined && passingMarks > 0 && (
                                <select
                                    value={resultFilter}
                                    onChange={(e) => setResultFilter(e.target.value)}
                                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="All">All Results</option>
                                    <option value="Pass">Pass Only</option>
                                    <option value="Fail">Fail Only</option>
                                </select>
                            )}

                            {(statusFilter !== 'All' || scoreRangeFilter !== 'All' || resultFilter !== 'All' || searchQuery || passingMarks !== null) && (
                                <button
                                    onClick={() => {
                                        setStatusFilter('All');
                                        setScoreRangeFilter('All');
                                        setResultFilter('All');
                                        setSearchQuery('');
                                        setPassingMarks(null);
                                    }}
                                    className="text-xs text-indigo-600 font-bold hover:underline ml-2 cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Apple Style Table Container */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] sticky top-0 backdrop-blur-md">
                                    <th className="p-3 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                                            onChange={handleSelectAll}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="p-3 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('rank')}>
                                        Rank {sortField === 'rank' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-3 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('name')}>
                                        Candidate {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 cursor-pointer hover:text-slate-900 transition-colors text-right" onClick={() => handleSort('score')}>
                                        Marks / Max {sortField === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-3 cursor-pointer hover:text-slate-900 transition-colors text-center" onClick={() => handleSort('percentage')}>
                                        Percentage {sortField === 'percentage' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-3 text-right">Pos / Neg</th>
                                    <th className="p-3 text-center">Correct / Wrong</th>
                                    <th className="p-3 text-right">Time Taken</th>
                                    {passingMarks !== null && passingMarks !== undefined && passingMarks > 0 && (
                                        <th className="p-3 text-center">Result</th>
                                    )}
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="py-12 text-center text-slate-400">
                                            No candidates match the current filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student) => {
                                        const isSelected = selectedStudentIds.includes(student.id);
                                        const isPassed = passingMarks !== null && passingMarks !== undefined && passingMarks > 0
                                            ? student.score >= passingMarks
                                            : null;

                                        return (
                                            <tr
                                                key={student.id}
                                                className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                                                    isSelected ? 'bg-indigo-50/40' : ''
                                                }`}
                                                onClick={() => openStudentDrawer(student)}
                                            >
                                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleStudentSelect(student.id)}
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="p-3 font-bold text-slate-900">
                                                    #{student.rank}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={student.avatar}
                                                            alt={student.name}
                                                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                                        />
                                                        <div>
                                                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                                {student.name}
                                                            </p>
                                                            {student.email && (
                                                                <p className="text-[10px] text-slate-400">
                                                                    {student.email}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    {student.status === 'Completed' && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                            <CheckCircle2 className="w-3 h-3" /> Completed
                                                        </span>
                                                    )}
                                                    {student.status === 'Live' && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">
                                                            <Clock className="w-3 h-3" /> Live Now
                                                        </span>
                                                    )}
                                                    {student.status === 'Absent' && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                                            Absent
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right font-bold text-slate-900">
                                                    {student.score} <span className="text-[10px] text-slate-400 font-normal">/ {student.totalMarks}</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${getPercentageBadgeColor(student.percentage)}`}>
                                                        {student.percentage}%
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-medium">
                                                    {student.positiveMarks > 0 || student.negativeMarks > 0 ? (
                                                        <>
                                                            <span className="text-emerald-600 font-bold">+{student.positiveMarks}</span>
                                                            <span className="text-slate-300 mx-1">/</span>
                                                            <span className="text-rose-500 font-bold">-{student.negativeMarks}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center font-medium">
                                                    <span className="text-emerald-700 font-bold">{student.correctCount}</span>
                                                    <span className="text-slate-300 mx-1">✓</span>
                                                    <span className="text-rose-600 font-bold">{student.wrongCount}</span>
                                                    <span className="text-slate-300 mx-1">✗</span>
                                                </td>
                                                <td className="p-3 text-right text-slate-600 font-medium">
                                                    {student.timeTaken}
                                                </td>
                                                {passingMarks !== null && passingMarks !== undefined && passingMarks > 0 && (
                                                    <td className="p-3 text-center">
                                                        {isPassed ? (
                                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                                PASS
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                                                FAIL
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openStudentDrawer(student)}
                                                        className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 font-semibold cursor-pointer rounded-lg"
                                                    >
                                                        View <ChevronRight className="w-3 h-3 ml-0.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SECTION 5: QUESTION ANALYSIS */}
                {(activeTab === 'overview' || activeTab === 'questions') && (
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Item Response & Question Difficulty Audit</h2>
                                <p className="text-xs text-slate-400">Statistical breakdown per question to identify key ambiguity or revision points</p>
                            </div>
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                                {questions.length} Audit Items
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {questions.length === 0 ? (
                                <div className="col-span-full py-10 text-center text-slate-400 text-xs">
                                    No question audit data available for this test yet.
                                </div>
                            ) : (
                                questions.map((q, idx) => {
                                    const qNum = q.qNum || q.question_number || (idx + 1);
                                    const topic = q.topic || q.subject || "General";
                                    const text = q.text || q.question_text || q.question || `Question #${qNum}`;
                                    const difficulty = q.difficulty || "Medium";
                                    const accuracyPct = q.accuracyPct ?? 0;
                                    const correctPct = q.correctPct ?? 0;
                                    const wrongPct = q.wrongPct ?? 0;
                                    const skippedPct = q.skippedPct ?? 0;
                                    const avgTimeSeconds = q.avgTimeSeconds ?? 0;
                                    const discriminationIndex = q.discriminationIndex ?? "-";

                                    return (
                                        <div key={q.id || qNum || idx} className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/70 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 group">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                                                        Question #{qNum}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                                                        difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        difficulty === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-rose-50 text-rose-700 border-rose-200'
                                                    }`}>
                                                        {difficulty}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                                                    {text}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                                    Topic: {topic}
                                                </p>
                                            </div>

                                            {/* Question Accuracy Bar */}
                                            <div className="space-y-1.5 pt-3 border-t border-slate-200/60">
                                                <div className="flex justify-between text-xs font-semibold">
                                                    <span className="text-slate-500">Accuracy Rate</span>
                                                    <span className={accuracyPct < 30 && accuracyPct > 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                                                        {accuracyPct}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                                                    <div className="bg-emerald-500 h-full" style={{ width: `${correctPct}%` }} title="Correct" />
                                                    <div className="bg-rose-500 h-full" style={{ width: `${wrongPct}%` }} title="Wrong" />
                                                    <div className="bg-slate-300 h-full" style={{ width: `${skippedPct}%` }} title="Skipped" />
                                                </div>
                                                <div className="flex justify-between text-[10px] text-slate-400 pt-1 font-medium">
                                                    <span>Avg Time: {avgTimeSeconds > 0 ? `${avgTimeSeconds}s` : '-'}</span>
                                                    <span>Discrim. Index: {discriminationIndex !== null && discriminationIndex !== undefined ? discriminationIndex : '-'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setSelectedQuestionModal({ ...q, qNum, topic, text, difficulty, accuracyPct, avgTimeSeconds, discriminationIndex })}
                                                    className="w-full h-8 text-xs border-slate-200 text-slate-700 hover:bg-white cursor-pointer font-medium"
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1 text-indigo-600" /> View Details
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* SECTION 6: TOPPER BOARD */}
                {(activeTab === 'overview' || activeTab === 'toppers') && (
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                    <Award className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Leaderboard & Top Performers</h2>
                                    <p className="text-xs text-slate-400">Top 5 student scorecards in this examination</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                                Gold Standard
                            </span>
                        </div>

                        {students.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs font-medium">
                                No leaderboard entries recorded yet.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {students.slice(0, 3).map((stu, i) => (
                                    <div
                                        key={stu.id}
                                        className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 relative overflow-hidden ${
                                            i === 0 ? 'bg-gradient-to-br from-amber-500/10 via-amber-50/40 to-white border-amber-200/90 shadow-xs' :
                                            i === 1 ? 'bg-gradient-to-br from-slate-200/30 to-white border-slate-300/80' :
                                            'bg-gradient-to-br from-amber-700/5 to-white border-amber-700/20'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm ${
                                                i === 0 ? 'bg-amber-400 text-slate-950 shadow-xs' :
                                                i === 1 ? 'bg-slate-300 text-slate-900' :
                                                'bg-amber-700/20 text-amber-900'
                                            }`}>
                                                #{i + 1}
                                            </span>
                                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                {stu.percentage}% Score
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <img src={stu.avatar} alt={stu.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs" />
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{stu.name}</h4>
                                                {stu.email && <p className="text-xs text-slate-400">{stu.email}</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200/60 text-xs">
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Net Score</span>
                                                <p className="font-extrabold text-slate-900">{stu.score} / {stu.totalMarks}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Time Spent</span>
                                                <p className="font-semibold text-slate-700">{stu.timeTaken}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* EXPANDABLE ROW SLIDE-OVER DRAWER (Detailed Candidate Result Audit) */}
            {drawerStudent && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
                    <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-left">
                        {/* Drawer Header */}
                        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/80 sticky top-0 z-20 backdrop-blur-md space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <img src={drawerStudent.avatar} alt={drawerStudent.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs" />
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-lg font-bold text-slate-900">{drawerStudent.name}</h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getPercentageBadgeColor(drawerStudent.percentage)}`}>
                                                {drawerStudent.percentage}% Score
                                            </span>
                                            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold">
                                                Rank #{drawerStudent.rank}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {drawerStudent.email ? drawerStudent.email : 'Registered Student'}
                                            {drawerStudent.submissionTime && ` • Submitted: ${drawerStudent.submissionTime}`}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setDrawerStudent(null)} className="h-8 w-8 p-0 rounded-full hover:bg-slate-200 shrink-0">
                                    <X className="w-4 h-4 text-slate-600" />
                                </Button>
                            </div>

                            {/* Start Form / Custom Student Details Badges */}
                            {(drawerStudent.rollNo || drawerStudent.batch || drawerStudent.institution) && (
                                <div className="flex flex-wrap gap-2 text-xs pt-1">
                                    {drawerStudent.rollNo && (
                                        <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md font-medium text-slate-600">
                                            Roll: <span className="font-bold text-slate-800">{drawerStudent.rollNo}</span>
                                        </span>
                                    )}
                                    {drawerStudent.batch && (
                                        <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md font-medium text-slate-600">
                                            Batch: <span className="font-bold text-slate-800">{drawerStudent.batch}</span>
                                        </span>
                                    )}
                                    {drawerStudent.institution && (
                                        <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md font-medium text-slate-600">
                                            Institute: <span className="font-bold text-slate-800">{drawerStudent.institution}</span>
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Sub-Navigation Tabs */}
                            <div className="flex border-b border-slate-200 -mb-5 pt-2">
                                <button
                                    onClick={() => setDrawerTab('overview')}
                                    className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
                                        drawerTab === 'overview'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Overview & Scorecard
                                </button>
                                <button
                                    onClick={() => setDrawerTab('topics')}
                                    className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
                                        drawerTab === 'topics'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Topic Performance ({drawerTopicData.length})
                                </button>
                                <button
                                    onClick={() => setDrawerTab('questions')}
                                    className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
                                        drawerTab === 'questions'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Questions Audit ({drawerEvaluatedQuestions.length})
                                </button>
                            </div>
                        </div>

                        {/* Drawer Body Content */}
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                            {/* TAB 1: OVERVIEW */}
                            {drawerTab === 'overview' && (
                                <div className="space-y-6">
                                    {/* Net Marks Card */}
                                    <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-2xl p-5 text-white flex items-center justify-between shadow-lg">
                                        <div>
                                            <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">Total Marks Obtained</span>
                                            <div className="text-3xl font-extrabold text-white mt-1">
                                                {drawerStudent.score} <span className="text-lg font-normal text-indigo-300">/ {drawerStudent.totalMarks}</span>
                                            </div>
                                            <p className="text-xs text-indigo-200 mt-1">
                                                Accuracy Rate: <span className="font-bold text-white">{drawerStudent.accuracyPct || Math.round((drawerStudent.correctCount / Math.max(1, drawerStudent.correctCount + drawerStudent.wrongCount)) * 100)}%</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-xl text-sm font-bold text-white border border-white/20">
                                                {drawerStudent.percentage}% Score
                                            </span>
                                            <p className="text-xs text-indigo-200 mt-2">Time Spent: {drawerStudent.timeTaken}</p>
                                        </div>
                                    </div>

                                    {/* 4 Stat Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                        <div className="bg-emerald-50/80 rounded-2xl p-3.5 border border-emerald-200/60 shadow-2xs">
                                            <div className="flex items-center justify-center gap-1 text-emerald-700 font-bold text-xs">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                                            </div>
                                            <p className="text-xl font-extrabold text-emerald-800 mt-1">{drawerStudent.correctCount}</p>
                                        </div>
                                        <div className="bg-rose-50/80 rounded-2xl p-3.5 border border-rose-200/60 shadow-2xs">
                                            <div className="flex items-center justify-center gap-1 text-rose-700 font-bold text-xs">
                                                <X className="w-3.5 h-3.5" /> Wrong
                                            </div>
                                            <p className="text-xl font-extrabold text-rose-800 mt-1">{drawerStudent.wrongCount}</p>
                                        </div>
                                        <div className="bg-blue-50/80 rounded-2xl p-3.5 border border-blue-200/60 shadow-2xs">
                                            <div className="flex items-center justify-center gap-1 text-blue-700 font-bold text-xs">
                                                <Zap className="w-3.5 h-3.5" /> Partial
                                            </div>
                                            <p className="text-xl font-extrabold text-blue-800 mt-1">{drawerStudent.partialCount || 0}</p>
                                        </div>
                                        <div className="bg-slate-100/80 rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
                                            <div className="flex items-center justify-center gap-1 text-slate-600 font-bold text-xs">
                                                <HelpCircle className="w-3.5 h-3.5" /> Skipped
                                            </div>
                                            <p className="text-xl font-extrabold text-slate-700 mt-1">{drawerStudent.skippedCount}</p>
                                        </div>
                                    </div>

                                    {/* Pos / Neg Marks & Timing Stats */}
                                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Score & Timing Breakdown</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                                                <span className="text-slate-400 block text-[10px] font-semibold">POSITIVE MARKS</span>
                                                <span className="text-base font-bold text-emerald-600">+{drawerStudent.positiveMarks}</span>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                                                <span className="text-slate-400 block text-[10px] font-semibold">NEGATIVE MARKS</span>
                                                <span className="text-base font-bold text-rose-600">-{drawerStudent.negativeMarks}</span>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                                                <span className="text-slate-400 block text-[10px] font-semibold">TOTAL TIME SPENT</span>
                                                <span className="text-base font-bold text-slate-800">{drawerStudent.timeTaken}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Topic Proficiency Analysis */}
                                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Topic Proficiency Analysis</h4>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-slate-500 font-semibold w-16">Strong:</span>
                                                {drawerStudent.strongTopics && drawerStudent.strongTopics.length > 0 ? (
                                                    drawerStudent.strongTopics.map((tp: string, idx: number) => (
                                                        <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
                                                            ✓ {tp}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-400 font-normal">None identified</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-slate-500 font-semibold w-16">Weak:</span>
                                                {drawerStudent.weakTopics && drawerStudent.weakTopics.length > 0 ? (
                                                    drawerStudent.weakTopics.map((tp: string, idx: number) => (
                                                        <span key={idx} className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-medium">
                                                            ! {tp}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-400 font-normal">None identified</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Teacher Notes & Feedback */}
                                    <div className="space-y-2 bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Teacher Remarks & Notes</h4>
                                            <Button size="sm" onClick={handleSaveTeacherNotes} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                                                Save Remarks
                                            </Button>
                                        </div>
                                        <textarea
                                            value={drawerTeacherNotes}
                                            onChange={(e) => setDrawerTeacherNotes(e.target.value)}
                                            placeholder="Write feedback for candidate scorecard report..."
                                            className="w-full h-24 text-xs rounded-xl border border-slate-200 p-3 focus:ring-indigo-500 focus:outline-none bg-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: TOPIC PERFORMANCE */}
                            {drawerTab === 'topics' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detailed Topic Performance</h4>
                                    {drawerTopicData.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400 text-xs">
                                            No topic data available for this assessment.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {drawerTopicData.map((tp, idx) => (
                                                <div key={idx} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-xs text-slate-800">{tp.name}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            tp.performance === 'Strong' ? 'bg-emerald-100 text-emerald-800' :
                                                            tp.performance === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                                        }`}>
                                                            {tp.performance} ({tp.percentage}%)
                                                        </span>
                                                    </div>
                                                    {/* Progress bar */}
                                                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                tp.percentage >= 70 ? 'bg-emerald-500' : tp.percentage >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`}
                                                            style={{ width: `${tp.percentage}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                                                        <span>Questions: {tp.totalQ}</span>
                                                        <span>Score: <strong className="text-slate-800">{tp.score}</strong> / {tp.maxScore}</span>
                                                        <span>Hits: <strong className="text-emerald-600">{tp.correct}✓</strong> | Misses: <strong className="text-rose-500">{tp.wrong}✗</strong></span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: QUESTIONS AUDIT */}
                            {drawerTab === 'questions' && (
                                <div className="space-y-4">
                                    {/* Search & Filter Toolbar */}
                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                        <div className="relative flex-1 w-full">
                                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                placeholder="Search question text or number..."
                                                value={drawerQSearch}
                                                onChange={(e) => setDrawerQSearch(e.target.value)}
                                                className="pl-8 text-xs h-9 bg-slate-50"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50 text-xs w-full sm:w-auto justify-center">
                                            <button
                                                onClick={() => setDrawerQFilter('all')}
                                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                                                    drawerQFilter === 'all' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                All
                                            </button>
                                            <button
                                                onClick={() => setDrawerQFilter('correct')}
                                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                                                    drawerQFilter === 'correct' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                Correct
                                            </button>
                                            <button
                                                onClick={() => setDrawerQFilter('wrong')}
                                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                                                    drawerQFilter === 'wrong' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                Wrong
                                            </button>
                                            <button
                                                onClick={() => setDrawerQFilter('skipped')}
                                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                                                    drawerQFilter === 'skipped' ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                Skipped
                                            </button>
                                        </div>
                                    </div>

                                    {/* Question Accordion List */}
                                    {drawerFilteredQuestions.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400 text-xs">
                                            No questions match the current filter.
                                        </div>
                                    ) : (
                                        <Accordion type="single" collapsible className="space-y-3">
                                            {drawerFilteredQuestions.map(({ q, idx, qNum, uAns, evalRes }) => {
                                                const qText = q.text || q.question_text || q.question || `Question ${qNum}`;
                                                const maxMarks = q.marks !== undefined ? parseFloat(q.marks) : 4;
                                                const scoreObtained = evalRes.score || 0;

                                                return (
                                                    <AccordionItem
                                                        key={q.id || idx}
                                                        value={`item-${idx}`}
                                                        className="border border-slate-200 rounded-2xl px-4 py-1 bg-slate-50/40 hover:bg-slate-50 transition-colors overflow-hidden"
                                                    >
                                                        <AccordionTrigger className="hover:no-underline py-3">
                                                            <div className="flex items-center gap-3 text-left w-full pr-2">
                                                                <span className="font-bold text-slate-800 shrink-0 text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                                                    Q{qNum}
                                                                </span>

                                                                {/* Status Pill */}
                                                                {evalRes.isCorrect && (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] shrink-0 font-bold">
                                                                        ✓ Correct (+{scoreObtained})
                                                                    </Badge>
                                                                )}
                                                                {evalRes.isWrong && (
                                                                    <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] shrink-0 font-bold">
                                                                        ✗ Wrong ({scoreObtained})
                                                                    </Badge>
                                                                )}
                                                                {evalRes.isSkipped && (
                                                                    <Badge variant="outline" className="text-slate-500 border-slate-300 text-[10px] shrink-0 font-bold">
                                                                        Skipped (0)
                                                                    </Badge>
                                                                )}

                                                                {/* LaTeX snippet in trigger */}
                                                                <div className="line-clamp-1 text-xs text-slate-700 font-medium flex-1">
                                                                    <LatexRenderer>{qText}</LatexRenderer>
                                                                </div>

                                                                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                                                    Marks: {maxMarks}
                                                                </span>
                                                            </div>
                                                        </AccordionTrigger>

                                                        <AccordionContent className="pt-2 pb-4 space-y-4 text-xs border-t border-slate-100">
                                                            {/* Question Body */}
                                                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Question Text</span>
                                                                <div className="text-slate-900 leading-relaxed font-medium">
                                                                    <LatexRenderer>{qText}</LatexRenderer>
                                                                </div>
                                                                {(q.image || q.question_image) && (
                                                                    <img
                                                                        src={q.image || q.question_image}
                                                                        alt="Question Diagram"
                                                                        className="max-h-48 rounded-lg border border-slate-200 object-contain mt-2"
                                                                    />
                                                                )}
                                                            </div>

                                                            {/* Options / Answers Breakdown */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {/* Student Answer */}
                                                                <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                                                                    evalRes.isCorrect ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' :
                                                                    evalRes.isWrong ? 'bg-rose-50/70 border-rose-200 text-rose-900' : 'bg-slate-100 border-slate-200 text-slate-700'
                                                                }`}>
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider block">Candidate Answer</span>
                                                                    <div className="font-bold text-xs">
                                                                        {uAns !== undefined && uAns !== null && uAns !== '' ? (
                                                                            <LatexRenderer>
                                                                                {typeof uAns === 'object' ? JSON.stringify(uAns) : String(uAns)}
                                                                            </LatexRenderer>
                                                                        ) : (
                                                                            <span className="text-slate-400 italic">Not Answered</span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Correct Answer */}
                                                                <div className="p-3.5 rounded-xl border bg-indigo-50/70 border-indigo-200 text-indigo-900 space-y-1.5">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider block text-indigo-700">Correct Answer</span>
                                                                    <div className="font-bold text-xs text-indigo-900">
                                                                        <LatexRenderer>
                                                                            {q.correctAnswer !== undefined && q.correctAnswer !== null
                                                                                ? (typeof q.correctAnswer === 'object' ? JSON.stringify(q.correctAnswer) : String(q.correctAnswer))
                                                                                : (q.correct_answer !== undefined ? String(q.correct_answer) : 'N/A')}
                                                                        </LatexRenderer>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                );
                                            })}
                                        </Accordion>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between backdrop-blur-md">
                            <Button variant="outline" size="sm" onClick={() => toast.success(`Scorecard emailed to ${drawerStudent.email || drawerStudent.name}`)} className="text-xs">
                                <Send className="w-3.5 h-3.5 mr-1" /> Email Scorecard
                            </Button>
                            <Button size="sm" onClick={() => toast.success(`Re-evaluating attempt for ${drawerStudent.name}...`)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                                Re-evaluate Attempt
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUESTION MODAL */}
            {selectedQuestionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900">Question #{selectedQuestionModal.qNum} Details</h3>
                            <button onClick={() => setSelectedQuestionModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">{selectedQuestionModal.text}</p>
                        <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Bloom Taxonomy</span>
                                <p className="font-bold text-slate-900">{selectedQuestionModal.bloomLevel}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Discrimination Index</span>
                                <p className="font-bold text-slate-900">{selectedQuestionModal.discriminationIndex}</p>
                            </div>
                        </div>
                        <Button onClick={() => setSelectedQuestionModal(null)} className="w-full bg-slate-900 text-white text-xs">Close Audit</Button>
                    </div>
                </div>
            )}
        </div>
    </div>
);
}
