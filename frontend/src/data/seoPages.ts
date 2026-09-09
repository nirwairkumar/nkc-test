// SEO Landing Page Data Configuration
// Each entry creates a unique indexable page targeting a specific search query.
// All content is unique per page to avoid duplicate content penalties.

export interface UseCasePageData {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  keywords: string[];
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  features: {
    icon: string; // lucide icon name
    title: string;
    description: string;
    color: string; // tailwind color prefix e.g. 'indigo', 'purple', 'cyan'
  }[];
  benefitHeadline: string;
  benefitDescription: string;
  benefits: string[];
  ctaHeadline: string;
  ctaDescription: string;
  faqItems: {
    question: string;
    answer: string;
  }[];
}

export interface SubjectPageData {
  slug: string;
  name: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  icon: string;
  color: string;
  heroDescription: string;
  sampleTopics: string[];
  questionTypes: string[];
}

export interface ComparisonPageData {
  slug: string;
  competitorName: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  heroDescription: string;
  comparisonRows: {
    feature: string;
    testoza: string;
    competitor: string;
    testozaWins: boolean;
  }[];
  whySwitch: string[];
}

// ─── USE-CASE LANDING PAGES ──────────────────────────────────────────────────

export const useCasePages: UseCasePageData[] = [
  {
    slug: 'online-test-maker',
    seoTitle: 'Online Test Maker – Create Tests Online in Minutes',
    seoDescription: 'Create online tests instantly with TestoZa. The easiest online test maker for teachers, educators, and coaching institutes. Auto-grading, analytics, and secure test delivery — all free.',
    canonicalPath: '/online-test-maker',
    keywords: ['online test maker', 'create test online', 'online test creator', 'test maker for teachers', 'make test online free'],
    heroBadge: 'Online Test Maker',
    heroTitle: 'Create Professional Online Tests',
    heroHighlight: 'in Minutes, Not Hours',
    heroDescription: 'TestoZa is the fastest way to create, share, and grade online tests. Built for teachers, educators, and coaching institutes who need reliable, scalable assessment tools.',
    features: [
      {
        icon: 'Sparkles',
        title: 'AI-Powered Question Generation',
        description: 'Upload a PDF, paste text, or share a YouTube link — AI creates MCQ, fill-in-the-blank, true/false, and multiple-select questions automatically.',
        color: 'indigo'
      },
      {
        icon: 'Share2',
        title: 'One-Click Test Sharing',
        description: 'Share tests via link, QR code, email, or WhatsApp. Students can take tests on any device — no app download or account required.',
        color: 'purple'
      },
      {
        icon: 'BarChart3',
        title: 'Instant Auto-Grading & Reports',
        description: 'Every test is auto-graded instantly. Get detailed score reports, performance analytics, leaderboards, and exportable results for every student.',
        color: 'cyan'
      }
    ],
    benefitHeadline: 'Why Teachers Choose TestoZa as Their Online Test Maker',
    benefitDescription: 'Creating tests manually takes hours of planning, typing, and grading. TestoZa compresses this entire cycle into minutes, so you can focus on teaching.',
    benefits: [
      'Create unlimited tests and quizzes for free',
      'Support for MCQ, multiple-select, fill-in-the-blank, and true/false',
      'Question shuffle and option randomisation for each student',
      'Timer controls, section-wise time limits, and scheduled access',
      'White-label branding with your institute logo and colours',
      'Detailed student performance analytics and score distribution'
    ],
    ctaHeadline: 'Start Creating Tests for Free',
    ctaDescription: 'No credit card needed. Create your first test in under 5 minutes with AI or manual entry.',
    faqItems: [
      {
        question: 'Is TestoZa free to use as an online test maker?',
        answer: 'Yes, TestoZa offers a generous free plan with unlimited test creation and unlimited students. Premium plans add features like white-label branding, custom certificates, and advanced analytics.'
      },
      {
        question: 'Can I create tests from my existing study material?',
        answer: 'Absolutely. Upload PDFs, paste text, or share YouTube video links — our AI analyses the content and generates relevant questions automatically. You can review and edit every question before publishing.'
      },
      {
        question: 'Do students need to create an account to take a test?',
        answer: 'No, students can take tests directly via a shareable link without creating an account. They simply enter their name and start the test.'
      }
    ]
  },
  {
    slug: 'online-exam-software',
    seoTitle: 'Online Exam Software – Conduct Secure Online Exams',
    seoDescription: 'Secure online exam software for educators and coaching institutes. Conduct proctored exams with auto-grading, focus tracking, and detailed analytics. Start free.',
    canonicalPath: '/online-exam-software',
    keywords: ['online exam software', 'online examination software', 'exam software for schools', 'secure online exam', 'conduct online exam'],
    heroBadge: 'Online Exam Software',
    heroTitle: 'Conduct Secure Online Exams',
    heroHighlight: 'with Confidence',
    heroDescription: 'TestoZa is a complete online examination platform that helps educators conduct fair, secure, and scalable exams. From classroom quizzes to institution-wide assessments — we have you covered.',
    features: [
      {
        icon: 'ShieldCheck',
        title: 'Exam Integrity Controls',
        description: 'Focus tracking, tab-switch detection, full-screen enforcement, and question shuffle ensure a fair testing environment for every student.',
        color: 'indigo'
      },
      {
        icon: 'Clock',
        title: 'Flexible Scheduling & Timers',
        description: 'Set test availability windows, per-question timers, section-wise time limits, and auto-submission to conduct structured exams at scale.',
        color: 'purple'
      },
      {
        icon: 'BarChart3',
        title: 'Comprehensive Score Analytics',
        description: 'Instant auto-grading with percentile rankings, question-level analysis, difficulty indexing, and exportable result sheets.',
        color: 'cyan'
      }
    ],
    benefitHeadline: 'Everything You Need to Conduct Online Exams',
    benefitDescription: 'Running online exams requires more than just a form builder. TestoZa provides the security, scalability, and analytics that serious educators demand.',
    benefits: [
      'Conduct exams for 10 or 10,000 students simultaneously',
      'Focus tracking detects tab switches and reports distractions',
      'Randomise question order and options for each student',
      'Scheduled test windows with automatic open and close times',
      'Negative marking support for competitive exam formats',
      'White-label portal with your institution branding'
    ],
    ctaHeadline: 'Conduct Your First Online Exam Today',
    ctaDescription: 'Sign up free. Create an exam, share the link, and get auto-graded results within minutes.',
    faqItems: [
      {
        question: 'How does TestoZa prevent cheating in online exams?',
        answer: 'TestoZa implements multi-layered integrity measures: focus tracking monitors tab activity, questions and options are shuffled per student, full-screen mode prevents switching, and detailed session logs record all activity for review.'
      },
      {
        question: 'Can I conduct exams for large batches of students?',
        answer: 'Yes, TestoZa is built to handle thousands of concurrent test takers. Our infrastructure scales automatically, so your exam remains smooth regardless of batch size.'
      },
      {
        question: 'Does TestoZa support negative marking?',
        answer: 'Yes. You can configure positive marks, negative marks, and partial scoring for each question type. This is ideal for competitive exam formats.'
      }
    ]
  },
  {
    slug: 'online-quiz-maker',
    seoTitle: 'Online Quiz Maker for Teachers – Create Quizzes Free',
    seoDescription: 'Free online quiz maker for teachers. Create engaging quizzes from PDFs, text, or YouTube videos using AI. Auto-grading, instant results, and student analytics.',
    canonicalPath: '/online-quiz-maker',
    keywords: ['online quiz maker', 'quiz maker for teachers', 'free quiz maker', 'create quiz online', 'quiz creator for teachers'],
    heroBadge: 'Quiz Maker for Teachers',
    heroTitle: 'Create Engaging Quizzes',
    heroHighlight: 'Your Students Will Love',
    heroDescription: 'TestoZa makes it effortless for teachers to create quizzes that test understanding, not just memory. Use AI to generate questions from your teaching materials in seconds.',
    features: [
      {
        icon: 'Sparkles',
        title: 'AI Quiz Generation',
        description: 'Paste your lesson notes, upload a chapter PDF, or share a YouTube lecture — AI generates a complete quiz with answer keys and explanations.',
        color: 'indigo'
      },
      {
        icon: 'Palette',
        title: 'Multiple Question Formats',
        description: 'MCQ, multiple-select, fill-in-the-blank, and true/false. Mix question types in a single quiz for thorough assessment.',
        color: 'purple'
      },
      {
        icon: 'Trophy',
        title: 'Leaderboards & Gamification',
        description: 'Students see their rank, percentile, and score instantly. Leaderboards motivate friendly competition and drive engagement.',
        color: 'cyan'
      }
    ],
    benefitHeadline: 'The Quiz Maker Built for Educators',
    benefitDescription: 'Unlike generic form builders, TestoZa is purpose-built for education. Every feature — from question shuffling to score analytics — is designed for teaching and assessment.',
    benefits: [
      'Create quizzes from PDFs, images, text, or YouTube videos',
      'Students take quizzes on any device — no app required',
      'Instant auto-grading with detailed explanations per question',
      'Share via link, QR code, email, or WhatsApp',
      'Track individual student performance over time',
      'Export results as reports for record keeping'
    ],
    ctaHeadline: 'Create Your First Quiz in 2 Minutes',
    ctaDescription: 'It\'s free, it\'s fast, and your students will thank you.',
    faqItems: [
      {
        question: 'How is TestoZa different from Google Forms for quizzes?',
        answer: 'Unlike Google Forms, TestoZa is purpose-built for assessments. It supports focus tracking, question shuffling, negative marking, timed sections, detailed analytics, leaderboards, and AI-powered question generation — none of which are available in Google Forms.'
      },
      {
        question: 'Can I reuse questions across multiple quizzes?',
        answer: 'Yes. You can duplicate tests, and your question library grows as you create more content. AI-generated questions can be edited and saved for future use.'
      },
      {
        question: 'Is there a limit on how many quizzes I can create?',
        answer: 'No. The free plan includes unlimited quiz creation and unlimited students. There are no artificial limits on test volume.'
      }
    ]
  },
  {
    slug: 'mcq-test-maker',
    seoTitle: 'MCQ Test Maker Online – Create Multiple Choice Tests Free',
    seoDescription: 'Create MCQ tests online in minutes. Free MCQ test maker for teachers with AI question generation, auto-grading, and detailed analytics. Perfect for assessments.',
    canonicalPath: '/mcq-test-maker',
    keywords: ['mcq test maker', 'multiple choice test maker', 'mcq generator', 'create mcq test online', 'mcq quiz maker'],
    heroBadge: 'MCQ Test Maker',
    heroTitle: 'Create MCQ Tests',
    heroHighlight: 'with AI in Minutes',
    heroDescription: 'The fastest way to create multiple-choice question tests. Upload your content, let AI generate MCQs with answer keys and explanations, then share with your students.',
    features: [
      {
        icon: 'Sparkles',
        title: 'AI MCQ Generator',
        description: 'Paste any text, upload a PDF, or share a YouTube link — AI generates high-quality MCQs with correct answers and plausible distractors automatically.',
        color: 'indigo'
      },
      {
        icon: 'Shuffle',
        title: 'Option Randomisation',
        description: 'Shuffle question order and option positions for each student. Prevents copying and ensures every student gets a unique test experience.',
        color: 'purple'
      },
      {
        icon: 'BarChart3',
        title: 'Question-Level Analytics',
        description: 'See which MCQs students found easy or hard, which distractors were most selected, and identify knowledge gaps at the topic level.',
        color: 'cyan'
      }
    ],
    benefitHeadline: 'The Smartest Way to Create MCQ Tests',
    benefitDescription: 'Writing MCQs manually is tedious — crafting good distractors, ensuring answer keys are correct, and formatting everything takes hours. TestoZa automates the entire process.',
    benefits: [
      'Generate MCQs from PDFs, text, images, or YouTube videos',
      'Support for 4, 5, or 6 options per question',
      'Negative marking for competitive exam-style tests',
      'Add images, LaTeX equations, and code snippets to questions',
      'Detailed solution explanations for every question',
      'Export question papers as PDF or share online'
    ],
    ctaHeadline: 'Generate Your First MCQ Test Now',
    ctaDescription: 'Upload your content and get a complete MCQ test in under 3 minutes. Free forever.',
    faqItems: [
      {
        question: 'Can AI generate MCQs from my textbook PDFs?',
        answer: 'Yes. Upload any PDF — textbook chapters, lecture slides, study notes — and our AI extracts key concepts to generate relevant MCQs with correct answers and realistic distractors.'
      },
      {
        question: 'Does TestoZa support negative marking for MCQs?',
        answer: 'Yes. You can configure positive marks, negative marks per question, and even partial scoring for multiple-select questions.'
      },
      {
        question: 'Can I add images and equations to MCQ questions?',
        answer: 'Absolutely. TestoZa supports rich media including images, diagrams, LaTeX equations, and code snippets in both questions and options.'
      }
    ]
  },
  {
    slug: 'ai-question-generator',
    seoTitle: 'AI Question Generator – Generate Quiz Questions from Any Content',
    seoDescription: 'Generate quiz questions automatically using AI. Upload PDFs, paste text, or share YouTube videos — get MCQ, fill-in-the-blank, and true/false questions instantly. Free for teachers.',
    canonicalPath: '/ai-question-generator',
    keywords: ['ai question generator', 'ai quiz generator', 'generate questions from text', 'ai test generator', 'automatic question generator'],
    heroBadge: 'AI Question Generator',
    heroTitle: 'Generate Questions from',
    heroHighlight: 'Any Content with AI',
    heroDescription: 'Stop spending hours writing questions manually. Upload your teaching materials and let AI generate comprehensive, accurate questions with answer keys and explanations in seconds.',
    features: [
      {
        icon: 'FileText',
        title: 'Multi-Source Input',
        description: 'Generate questions from PDFs, images, pasted text, YouTube videos, or any combination. AI understands context across all formats.',
        color: 'indigo'
      },
      {
        icon: 'Layers',
        title: 'Multiple Question Types',
        description: 'AI generates MCQ, multiple-select, fill-in-the-blank, and true/false questions. Choose your preferred mix or let AI decide the best format.',
        color: 'purple'
      },
      {
        icon: 'Pencil',
        title: 'Full Editorial Control',
        description: 'Every AI-generated question is fully editable. Modify the wording, change options, adjust difficulty, or add your own explanations before publishing.',
        color: 'cyan'
      }
    ],
    benefitHeadline: 'AI That Understands Your Subject Matter',
    benefitDescription: 'TestoZa\'s AI doesn\'t just randomly generate questions. It analyses your content, identifies key concepts, and creates assessment-ready questions that test real understanding.',
    benefits: [
      'Generate 20-50 questions from a single PDF in under a minute',
      'Supports STEM subjects with LaTeX equation recognition',
      'AI creates plausible distractors, not random options',
      'Difficulty levels tagged automatically (Easy, Medium, Hard)',
      'Solution explanations generated for every question',
      'Works in English and Hindi'
    ],
    ctaHeadline: 'Try AI Question Generation Free',
    ctaDescription: 'Upload any document or paste text. Get a full question set in under 60 seconds.',
    faqItems: [
      {
        question: 'What types of content can AI generate questions from?',
        answer: 'TestoZa AI can generate questions from PDF documents (textbooks, slides, notes), pasted text, YouTube video transcripts, and images. It supports OCR for scanned documents and handwritten notes.'
      },
      {
        question: 'How accurate are AI-generated questions?',
        answer: 'AI-generated questions are highly accurate for well-structured educational content. Every question is fully editable, so you maintain complete control over the final assessment.'
      },
      {
        question: 'Can I generate questions for technical subjects with equations?',
        answer: 'Yes. TestoZa supports LaTeX/MathJax rendering, so AI can generate and display mathematical equations, chemical formulas, and scientific notation accurately.'
      }
    ]
  },
  {
    slug: 'pdf-to-quiz',
    seoTitle: 'PDF to Quiz Converter – Turn PDFs into Online Quizzes with AI',
    seoDescription: 'Convert any PDF into an online quiz instantly using AI. Upload textbook chapters, lecture slides, or study notes — get a ready-to-take quiz with auto-grading. Free for teachers.',
    canonicalPath: '/pdf-to-quiz',
    keywords: ['pdf to quiz', 'convert pdf to quiz', 'pdf quiz maker', 'pdf to test converter', 'create quiz from pdf'],
    heroBadge: 'PDF to Quiz Converter',
    heroTitle: 'Turn Any PDF into',
    heroHighlight: 'a Ready-to-Take Quiz',
    heroDescription: 'Upload textbook chapters, lecture slides, study notes, or any PDF — TestoZa AI reads the content and generates a complete quiz with questions, answers, and explanations.',
    features: [
      {
        icon: 'Upload',
        title: 'Upload Any PDF',
        description: 'Textbook chapters, lecture slides, research papers, handwritten notes (scanned) — our AI handles all PDF formats with intelligent text extraction and OCR.',
        color: 'indigo'
      },
      {
        icon: 'Sparkles',
        title: 'Instant Quiz Generation',
        description: 'AI analyses the PDF content, identifies key concepts, and generates diverse question types in under a minute. No manual question writing needed.',
        color: 'purple'
      },
      {
        icon: 'CheckCircle2',
        title: 'Review & Publish',
        description: 'Edit any question, adjust difficulty, add or remove options, then publish. Share via link, QR code, or embed on your website.',
        color: 'cyan'
      }
    ],
    benefitHeadline: 'From PDF to Published Quiz in Under 3 Minutes',
    benefitDescription: 'Teachers spend hours converting study material into test papers. TestoZa automates this entire workflow — just upload, review, and publish.',
    benefits: [
      'Supports text-based and scanned PDFs with OCR',
      'Generates MCQ, fill-in-the-blank, and true/false questions',
      'AI creates answer keys and solution explanations automatically',
      'Works with textbooks, slides, notes, and research papers',
      'Handles mathematical content with LaTeX rendering',
      'Free to use — no file size or page limits on the free plan'
    ],
    ctaHeadline: 'Upload Your First PDF Now',
    ctaDescription: 'Drop a PDF and watch AI create a complete quiz in seconds. Free, no signup required to try.',
    faqItems: [
      {
        question: 'What types of PDFs can be converted to quizzes?',
        answer: 'Any PDF with readable text content — textbook chapters, lecture slides, study notes, research papers, and even scanned handwritten notes (via OCR). The AI works best with educational content.'
      },
      {
        question: 'Is there a file size limit for PDF uploads?',
        answer: 'The free plan supports standard PDF uploads. For very large documents (100+ pages), we recommend splitting them into chapter-wise PDFs for better question quality.'
      },
      {
        question: 'Can I edit the questions after AI generates them?',
        answer: 'Yes, absolutely. Every question, option, answer, and explanation is fully editable. You maintain complete control over the final quiz content.'
      }
    ]
  },
  {
    slug: 'youtube-to-quiz',
    seoTitle: 'YouTube to Quiz Generator – Create Quizzes from YouTube Videos',
    seoDescription: 'Create quizzes from YouTube videos using AI. Share a YouTube link and get a complete quiz with MCQs, answers, and explanations. Perfect for flipped classrooms. Free for teachers.',
    canonicalPath: '/youtube-to-quiz',
    keywords: ['youtube to quiz', 'youtube quiz generator', 'create quiz from youtube', 'video to quiz', 'youtube test maker'],
    heroBadge: 'YouTube to Quiz',
    heroTitle: 'Create Quizzes from',
    heroHighlight: 'YouTube Videos Instantly',
    heroDescription: 'Share a YouTube video link and TestoZa AI extracts the transcript, identifies key concepts, and generates a complete quiz — perfect for flipped classrooms and video-based learning.',
    features: [
      {
        icon: 'Play',
        title: 'Paste Any YouTube Link',
        description: 'Share a YouTube URL from any educational video — lectures, tutorials, documentaries, explainers. AI extracts and analyses the transcript automatically.',
        color: 'indigo'
      },
      {
        icon: 'Sparkles',
        title: 'AI-Powered Comprehension Questions',
        description: 'AI doesn\'t just pull facts — it creates questions that test comprehension, application, and analysis of the video content.',
        color: 'purple'
      },
      {
        icon: 'BookOpen',
        title: 'Flipped Classroom Ready',
        description: 'Assign a video as homework, then use the AI-generated quiz as a class warm-up. Check if students actually watched and understood the material.',
        color: 'cyan'
      }
    ],
    benefitHeadline: 'Make Every YouTube Video Assessable',
    benefitDescription: 'Teachers increasingly use YouTube videos in their teaching. But how do you know students actually watched and understood the content? TestoZa turns any video into an accountable learning experience.',
    benefits: [
      'Works with any YouTube video that has a transcript',
      'Generates questions covering the entire video, not just the beginning',
      'Supports educational lectures, tutorials, and explainers',
      'Questions test comprehension, not just surface-level recall',
      'Perfect for flipped classrooms and blended learning',
      'Share the quiz link alongside the video assignment'
    ],
    ctaHeadline: 'Try YouTube to Quiz — It\'s Free',
    ctaDescription: 'Paste a YouTube link and get a complete quiz in under a minute.',
    faqItems: [
      {
        question: 'Does this work with any YouTube video?',
        answer: 'It works with any YouTube video that has subtitles/captions (auto-generated or manual). Most educational videos have these enabled by default.'
      },
      {
        question: 'How many questions can AI generate from one video?',
        answer: 'The number depends on the video length and content density. A typical 15-minute lecture generates 10-20 high-quality questions.'
      },
      {
        question: 'Can I combine YouTube quiz with other content?',
        answer: 'Yes. You can generate questions from a YouTube video and a PDF in the same test, creating a comprehensive assessment from multiple sources.'
      }
    ]
  },
  {
    slug: 'online-test-for-coaching',
    seoTitle: 'Online Test Platform for Coaching Institutes – Conduct Tests at Scale',
    seoDescription: 'Online test platform built for coaching institutes. Conduct mock tests, track student performance, and manage batches with white-label branding. Start free.',
    canonicalPath: '/online-test-for-coaching',
    keywords: ['online test platform for coaching', 'coaching institute test software', 'mock test platform for coaching', 'online exam for coaching centre', 'coaching test management'],
    heroBadge: 'For Coaching Institutes',
    heroTitle: 'The Test Platform Built for',
    heroHighlight: 'Coaching Institutes',
    heroDescription: 'TestoZa helps coaching institutes create, conduct, and analyse tests at scale. White-label branding, batch management, student analytics, and AI-powered test creation — all in one platform.',
    features: [
      {
        icon: 'Building',
        title: 'White-Label Branding',
        description: 'Replace TestoZa branding with your institute logo, colours, and domain. Students see your brand, not ours. Custom certificates with your seal.',
        color: 'indigo'
      },
      {
        icon: 'Users',
        title: 'Batch & Student Management',
        description: 'Organise students into batches, assign tests to specific groups, and track performance across batches with detailed comparison analytics.',
        color: 'purple'
      },
      {
        icon: 'TrendingUp',
        title: 'Performance Tracking Over Time',
        description: 'Track each student\'s progress across multiple tests. Identify weak areas, compare batch performance, and generate parent-ready reports.',
        color: 'cyan'
      }
    ],
    benefitHeadline: 'Scale Your Coaching Institute\'s Testing Infrastructure',
    benefitDescription: 'Running a coaching institute means conducting hundreds of tests each month. TestoZa automates test creation, grading, and analytics — so your faculty can focus on teaching.',
    benefits: [
      'Conduct tests for unlimited students simultaneously',
      'AI generates tests from your study material in minutes',
      'White-label portal with your institute\'s branding',
      'Custom certificates with your institute logo and signature',
      'Detailed analytics with student ranking and percentile',
      'Affordable plans designed for institutions, not individuals'
    ],
    ctaHeadline: 'Set Up Your Institute\'s Test Portal',
    ctaDescription: 'Start free. Upgrade when you need white-label branding and advanced analytics.',
    faqItems: [
      {
        question: 'Can I use my own branding instead of TestoZa?',
        answer: 'Yes. Premium and Enterprise plans include complete white-label branding — your logo, colours, favicon, email templates, certificates, and even custom domain support.'
      },
      {
        question: 'How many students can take a test simultaneously?',
        answer: 'TestoZa is built for scale. There is no hard limit on concurrent test takers. Coaching institutes routinely conduct tests with hundreds to thousands of students simultaneously.'
      },
      {
        question: 'Is there a plan specifically for coaching institutes?',
        answer: 'Yes. Our pricing is designed with institutions in mind. The free plan works for small setups, while Premium and Enterprise plans are perfect for coaching centres needing branding, analytics, and batch management.'
      }
    ]
  },
  {
    slug: 'exam-software-for-schools',
    seoTitle: 'Online Exam Software for Schools – Conduct School Exams Online',
    seoDescription: 'Online exam software designed for schools. Conduct class tests, mid-terms, and final exams online with auto-grading, secure delivery, and detailed student reports. Free to start.',
    canonicalPath: '/exam-software-for-schools',
    keywords: ['exam software for schools', 'online exam for schools', 'school test platform', 'school examination software', 'conduct school exams online'],
    heroBadge: 'For Schools',
    heroTitle: 'Conduct School Exams',
    heroHighlight: 'Online with Confidence',
    heroDescription: 'TestoZa helps schools conduct class tests, unit tests, mid-terms, and final exams online. Auto-grading, secure delivery, and detailed student reports — built for the modern classroom.',
    features: [
      {
        icon: 'GraduationCap',
        title: 'Designed for Classroom Use',
        description: 'From quick 10-minute quizzes to full-length exams. Configure timer, marks, sections, and access controls to match your school\'s exam format.',
        color: 'indigo'
      },
      {
        icon: 'ShieldCheck',
        title: 'Safe & Secure Testing',
        description: 'Focus tracking, full-screen mode, and question shuffle ensure exam integrity. Teachers get detailed activity logs for every student.',
        color: 'purple'
      },
      {
        icon: 'FileBarChart',
        title: 'Student Progress Reports',
        description: 'Generate class-wise and student-wise performance reports. Track academic progress across multiple assessments throughout the term.',
        color: 'cyan'
      }
    ],
    benefitHeadline: 'Modernise Your School\'s Examination Process',
    benefitDescription: 'Paper-based exams are expensive, time-consuming, and hard to analyse. TestoZa digitises your entire exam workflow — from creation to grading to reporting.',
    benefits: [
      'Free plan supports unlimited tests and unlimited students',
      'Teachers create tests; students take tests on any device',
      'Auto-grading eliminates hours of manual correction',
      'Generate term-wise progress reports for parents',
      'Multi-teacher support — each teacher manages their own tests',
      'Works on school computers, tablets, and student phones'
    ],
    ctaHeadline: 'Bring Your School\'s Exams Online',
    ctaDescription: 'Start with a free pilot. No contracts, no setup fees, no IT department needed.',
    faqItems: [
      {
        question: 'Can multiple teachers use TestoZa in the same school?',
        answer: 'Yes. Each teacher creates and manages their own tests independently. Enterprise plans add centralised administration and school-wide analytics.'
      },
      {
        question: 'Do students need special devices or software?',
        answer: 'No. Students can take tests on any device with a web browser — school computers, tablets, or personal smartphones. No app download is required.'
      },
      {
        question: 'Can I generate report cards or progress reports?',
        answer: 'TestoZa provides detailed analytics per test, per student, and per class. You can export results for use in your school\'s report card system.'
      }
    ]
  },
  {
    slug: 'white-label-test-platform',
    seoTitle: 'White Label Test Platform – Your Brand, Our Technology',
    seoDescription: 'White-label online test platform for coaching institutes and schools. Custom logo, colours, domain, and certificates. Your brand, powered by TestoZa technology.',
    canonicalPath: '/white-label-test-platform',
    keywords: ['white label test platform', 'white label exam software', 'branded test platform', 'custom exam portal', 'white label assessment platform'],
    heroBadge: 'White-Label Platform',
    heroTitle: 'Your Brand.',
    heroHighlight: 'Our Technology.',
    heroDescription: 'Launch your own branded online test platform without building from scratch. TestoZa\'s white-label solution lets you put your logo, colours, and domain on a world-class testing infrastructure.',
    features: [
      {
        icon: 'Palette',
        title: 'Complete Brand Customisation',
        description: 'Your logo, your colours, your favicon, your welcome messages. Students and parents see only your brand — no TestoZa branding anywhere.',
        color: 'indigo'
      },
      {
        icon: 'Globe',
        title: 'Custom Domain Support',
        description: 'Use your own domain (tests.yourinstitute.com) for a fully branded experience. Enterprise plans include complete domain mapping.',
        color: 'purple'
      },
      {
        icon: 'Award',
        title: 'Branded Certificates',
        description: 'Issue custom certificates with your institute logo, seal, and signatures. Students can download and share their achievements with your branding.',
        color: 'cyan'
      }
    ],
    benefitHeadline: 'Launch Your Branded Test Portal in Minutes',
    benefitDescription: 'Building an exam platform from scratch costs lakhs and takes months. TestoZa gives you enterprise-grade testing infrastructure under your own brand — ready in minutes.',
    benefits: [
      'Custom logo, colours, and favicon across all pages',
      'Branded email notifications and invitations',
      'Custom certificates with your seal and signatures',
      'Custom domain mapping (Enterprise plan)',
      'All the features of TestoZa under your brand',
      'No development costs — just configure and launch'
    ],
    ctaHeadline: 'Launch Your Branded Test Platform',
    ctaDescription: 'Start with the free plan. Upgrade to Premium for full white-label branding.',
    faqItems: [
      {
        question: 'Will students see TestoZa branding?',
        answer: 'No. With the Premium plan, TestoZa branding is completely replaced by your institute\'s logo, colours, and messaging. Students only see your brand.'
      },
      {
        question: 'Can I use my own domain name?',
        answer: 'Yes. Enterprise plans support custom domain mapping so your test portal lives at your own URL (e.g., tests.yourinstitute.com).'
      },
      {
        question: 'How quickly can I set up the white-label portal?',
        answer: 'The basic branding setup (logo, colours, welcome message) takes under 5 minutes. Custom domain mapping typically takes 24-48 hours for DNS propagation.'
      }
    ]
  },
  {
    slug: 'auto-grading-software',
    seoTitle: 'Auto Grading Software – Instant Test Grading for Teachers',
    seoDescription: 'Auto-grade tests and quizzes instantly. TestoZa auto-grading software eliminates manual correction. Instant scores, analytics, and detailed student reports. Free for teachers.',
    canonicalPath: '/auto-grading-software',
    keywords: ['auto grading software', 'automatic test grading', 'auto grade tests', 'instant grading software', 'test grading tool for teachers'],
    heroBadge: 'Auto-Grading',
    heroTitle: 'Grade Tests Instantly.',
    heroHighlight: 'Zero Manual Work.',
    heroDescription: 'Stop spending hours correcting answer sheets. TestoZa auto-grades every test the moment a student submits, giving you instant scores, analytics, and detailed performance reports.',
    features: [
      {
        icon: 'Zap',
        title: 'Instant Results',
        description: 'The moment a student submits, their test is graded. Scores, percentile, correct/incorrect breakdown — everything available immediately.',
        color: 'indigo'
      },
      {
        icon: 'BarChart3',
        title: 'Deep Analytics',
        description: 'Go beyond scores. See question-level analysis, difficulty indexing, time-per-question metrics, and class-wide performance distribution.',
        color: 'purple'
      },
      {
        icon: 'FileDown',
        title: 'Exportable Reports',
        description: 'Download student results as CSV or view detailed reports online. Perfect for record keeping, parent meetings, and institutional reporting.',
        color: 'cyan'
      }
    ],
    benefitHeadline: 'Reclaim Hours of Your Teaching Day',
    benefitDescription: 'The average teacher spends 5-10 hours per week on grading. TestoZa reduces this to zero for objective assessments, freeing you to focus on what matters — teaching.',
    benefits: [
      'Instant auto-grading for all objective question types',
      'Negative marking and partial scoring calculated automatically',
      'Question-level analytics show which topics need more attention',
      'Student rankings and percentile scores generated automatically',
      'Detailed solution explanations shown to students after submission',
      'Export results as CSV or view comprehensive reports online'
    ],
    ctaHeadline: 'Never Grade Another Test by Hand',
    ctaDescription: 'Create a test, share it, and let TestoZa handle the grading. Free forever.',
    faqItems: [
      {
        question: 'What question types support auto-grading?',
        answer: 'All objective question types — MCQ, multiple-select, fill-in-the-blank, and true/false — are auto-graded instantly. Subjective questions are not currently supported.'
      },
      {
        question: 'Can I override or adjust auto-graded scores?',
        answer: 'Auto-graded scores are based on the answer key you set. You can update the answer key if needed, and scores will be recalculated automatically.'
      },
      {
        question: 'Do students see detailed solutions after submission?',
        answer: 'Yes, if you enable it. You can configure whether students see correct answers, explanations, and their detailed score breakdown after submitting the test.'
      }
    ]
  },
  {
    slug: 'online-proctoring-software',
    seoTitle: 'Online Proctoring Software – Secure Online Exam Monitoring',
    seoDescription: 'Conduct secure proctored online exams. TestoZa provides focus tracking, tab-switch detection, full-screen enforcement, and detailed activity logs. Free for educators.',
    canonicalPath: '/online-proctoring-software',
    keywords: ['online proctoring software', 'online exam proctoring', 'secure online exam', 'proctored test software', 'exam monitoring software'],
    heroBadge: 'Online Proctoring',
    heroTitle: 'Conduct Proctored Exams',
    heroHighlight: 'with Built-In Security',
    heroDescription: 'TestoZa provides multiple layers of exam security — focus tracking, tab-switch detection, question randomisation, and detailed activity logs — so you can conduct fair exams online.',
    features: [
      {
        icon: 'Eye',
        title: 'Focus Tracking',
        description: 'Monitors whether students switch tabs, minimise the browser, or lose focus during the exam. Activity is logged and reported to the test creator.',
        color: 'indigo'
      },
      {
        icon: 'Maximize',
        title: 'Full-Screen Enforcement',
        description: 'Tests can be configured to run in full-screen mode, preventing students from accessing other windows or tabs during the exam.',
        color: 'purple'
      },
      {
        icon: 'Shuffle',
        title: 'Question Randomisation',
        description: 'Each student gets a different question order and option sequence. Makes screen sharing and copying ineffective.',
        color: 'cyan'
      }
    ],
    benefitHeadline: 'Fair Online Exams, Without the Hassle',
    benefitDescription: 'You don\'t need expensive webcam proctoring software for most assessments. TestoZa\'s built-in security features handle 90% of academic integrity needs — free and without invasive monitoring.',
    benefits: [
      'Focus tracking logs every tab switch and window minimise',
      'Full-screen mode prevents access to other applications',
      'Question and option shuffle gives each student a unique paper',
      'Activity logs available for review after the exam',
      'No software installation required — works in any browser',
      'Non-invasive — no webcam or screen recording needed'
    ],
    ctaHeadline: 'Conduct Secure Exams Online',
    ctaDescription: 'Built-in proctoring features are available on the free plan. No extra cost for exam security.',
    faqItems: [
      {
        question: 'Does TestoZa use webcam proctoring?',
        answer: 'TestoZa focuses on non-invasive security measures: focus tracking, tab-switch detection, full-screen mode, and question randomisation. We do not currently offer webcam-based proctoring.'
      },
      {
        question: 'Can I see if a student switched tabs during the exam?',
        answer: 'Yes. Focus tracking logs are available for each student submission, showing the number and timing of tab switches and focus losses during the exam.'
      },
      {
        question: 'Is proctoring available on the free plan?',
        answer: 'Yes. Focus tracking, question shuffle, and full-screen mode are available on all plans, including the free plan.'
      }
    ]
  }
];

// ─── SUBJECT HUB PAGES ──────────────────────────────────────────────────────

export const subjectPages: SubjectPageData[] = [
  {
    slug: 'physics',
    name: 'Physics',
    seoTitle: 'Create Physics Tests Online – AI-Powered Physics Quiz Maker',
    seoDescription: 'Create physics tests and quizzes online using AI. Upload physics notes, textbooks, or videos — get ready-to-take MCQs with solutions. Free for physics teachers.',
    keywords: ['create physics test', 'physics quiz maker', 'physics mcq generator', 'online physics test', 'physics question generator'],
    icon: 'Atom',
    color: 'blue',
    heroDescription: 'Create physics assessments from your lecture notes, textbook chapters, or YouTube lectures. AI generates conceptual, numerical, and application-based questions with LaTeX equation support.',
    sampleTopics: ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Modern Physics', 'Waves', 'Fluid Dynamics', 'Quantum Physics'],
    questionTypes: ['Conceptual MCQs', 'Numerical problems', 'Assertion-reason', 'Diagram-based questions']
  },
  {
    slug: 'chemistry',
    name: 'Chemistry',
    seoTitle: 'Create Chemistry Tests Online – AI Chemistry Quiz Generator',
    seoDescription: 'Create chemistry tests and quizzes online using AI. Generate organic, inorganic, and physical chemistry MCQs from your materials. Free for chemistry teachers.',
    keywords: ['create chemistry test', 'chemistry quiz maker', 'chemistry mcq generator', 'online chemistry test', 'chemistry question generator'],
    icon: 'FlaskConical',
    color: 'green',
    heroDescription: 'Generate chemistry assessments covering organic, inorganic, and physical chemistry. AI handles chemical equations, reaction mechanisms, and nomenclature questions.',
    sampleTopics: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Chemical Bonding', 'Electrochemistry', 'Coordination Compounds', 'Polymers', 'Surface Chemistry'],
    questionTypes: ['Reaction-based MCQs', 'Nomenclature questions', 'Equation balancing', 'Conceptual questions']
  },
  {
    slug: 'mathematics',
    name: 'Mathematics',
    seoTitle: 'Create Maths Tests Online – AI-Powered Maths Quiz Maker',
    seoDescription: 'Create mathematics tests and quizzes online with AI. Generate maths MCQs, numerical problems, and concept checks from your materials. Full LaTeX support. Free for teachers.',
    keywords: ['create maths test', 'maths quiz maker', 'maths mcq generator', 'online maths test', 'mathematics question generator'],
    icon: 'Calculator',
    color: 'purple',
    heroDescription: 'Generate maths assessments with full LaTeX equation rendering. AI creates computational problems, conceptual questions, and application-based questions from your study materials.',
    sampleTopics: ['Algebra', 'Calculus', 'Trigonometry', 'Geometry', 'Statistics', 'Probability', 'Linear Algebra', 'Number Theory'],
    questionTypes: ['Numerical MCQs', 'Proof-based concepts', 'Word problems', 'Graph interpretation']
  },
  {
    slug: 'biology',
    name: 'Biology',
    seoTitle: 'Create Biology Tests Online – AI Biology Quiz Generator',
    seoDescription: 'Create biology tests and quizzes online using AI. Generate MCQs on botany, zoology, genetics, and ecology from your materials. Free for biology teachers.',
    keywords: ['create biology test', 'biology quiz maker', 'biology mcq generator', 'online biology test', 'biology question generator'],
    icon: 'Leaf',
    color: 'emerald',
    heroDescription: 'Create biology assessments covering botany, zoology, genetics, ecology, and human physiology. AI generates diagram-based and concept-testing questions from your study materials.',
    sampleTopics: ['Cell Biology', 'Genetics', 'Ecology', 'Human Physiology', 'Plant Biology', 'Evolution', 'Microbiology', 'Biotechnology'],
    questionTypes: ['Conceptual MCQs', 'Diagram-based questions', 'Classification questions', 'Application-based questions']
  },
  {
    slug: 'english',
    name: 'English',
    seoTitle: 'Create English Tests Online – AI English Quiz Maker',
    seoDescription: 'Create English language and literature tests online using AI. Grammar quizzes, comprehension tests, and vocabulary assessments. Free for English teachers.',
    keywords: ['create english test', 'english quiz maker', 'english mcq generator', 'online english test', 'english grammar quiz'],
    icon: 'BookOpen',
    color: 'amber',
    heroDescription: 'Generate English assessments covering grammar, vocabulary, comprehension, and literature. AI creates contextual questions that test language skills, not just memorisation.',
    sampleTopics: ['Grammar', 'Vocabulary', 'Reading Comprehension', 'Literature', 'Creative Writing', 'Sentence Correction', 'Idioms & Phrases', 'Essay Structure'],
    questionTypes: ['Grammar MCQs', 'Comprehension questions', 'Fill-in-the-blank', 'Error identification']
  },
  {
    slug: 'computer-science',
    name: 'Computer Science',
    seoTitle: 'Create Computer Science Tests Online – AI CS Quiz Maker',
    seoDescription: 'Create computer science tests and quizzes online using AI. Programming, DSA, DBMS, OS, and networking MCQs with code snippets. Free for CS teachers.',
    keywords: ['create computer science test', 'cs quiz maker', 'programming mcq generator', 'coding quiz maker', 'computer science question generator'],
    icon: 'Code',
    color: 'sky',
    heroDescription: 'Generate CS assessments with code snippet support. AI creates questions on programming, data structures, algorithms, databases, operating systems, and networking.',
    sampleTopics: ['Data Structures', 'Algorithms', 'DBMS', 'Operating Systems', 'Networking', 'Python', 'Java', 'Web Development'],
    questionTypes: ['Code-based MCQs', 'Output prediction', 'Concept questions', 'Algorithm analysis']
  },
  {
    slug: 'history',
    name: 'History',
    seoTitle: 'Create History Tests Online – AI History Quiz Generator',
    seoDescription: 'Create history tests and quizzes online using AI. Generate MCQs on ancient, medieval, modern, and world history from your materials. Free for history teachers.',
    keywords: ['create history test', 'history quiz maker', 'history mcq generator', 'online history test', 'history question generator'],
    icon: 'Landmark',
    color: 'orange',
    heroDescription: 'Generate history assessments covering ancient, medieval, modern, and world history. AI creates chronological, factual, and analytical questions from your study materials.',
    sampleTopics: ['Ancient History', 'Medieval History', 'Modern History', 'World Wars', 'Indian Freedom Movement', 'World Civilisations', 'Political History', 'Cultural History'],
    questionTypes: ['Chronological MCQs', 'Event-based questions', 'Map-based questions', 'Cause-and-effect questions']
  },
  {
    slug: 'geography',
    name: 'Geography',
    seoTitle: 'Create Geography Tests Online – AI Geography Quiz Maker',
    seoDescription: 'Create geography tests and quizzes online using AI. Physical geography, human geography, and map-based MCQs from your materials. Free for teachers.',
    keywords: ['create geography test', 'geography quiz maker', 'geography mcq generator', 'online geography test', 'geography question generator'],
    icon: 'Globe',
    color: 'teal',
    heroDescription: 'Generate geography assessments covering physical geography, human geography, climatology, and cartography. AI creates factual and application-based questions from your materials.',
    sampleTopics: ['Physical Geography', 'Human Geography', 'Climatology', 'Cartography', 'Indian Geography', 'World Geography', 'Economic Geography', 'Environmental Geography'],
    questionTypes: ['Map-based MCQs', 'Factual questions', 'Data interpretation', 'Location-based questions']
  },
  {
    slug: 'economics',
    name: 'Economics',
    seoTitle: 'Create Economics Tests Online – AI Economics Quiz Maker',
    seoDescription: 'Create economics tests and quizzes online using AI. Micro, macro, and Indian economy MCQs from your teaching materials. Free for economics teachers.',
    keywords: ['create economics test', 'economics quiz maker', 'economics mcq generator', 'online economics test', 'economics question generator'],
    icon: 'IndianRupee',
    color: 'yellow',
    heroDescription: 'Generate economics assessments covering microeconomics, macroeconomics, Indian economy, and international trade. AI creates conceptual and data-based questions from your materials.',
    sampleTopics: ['Microeconomics', 'Macroeconomics', 'Indian Economy', 'International Trade', 'Public Finance', 'Money & Banking', 'Development Economics', 'Statistics'],
    questionTypes: ['Concept MCQs', 'Graph interpretation', 'Data-based questions', 'Policy analysis questions']
  },
  {
    slug: 'general-knowledge',
    name: 'General Knowledge',
    seoTitle: 'Create GK Tests Online – AI General Knowledge Quiz Maker',
    seoDescription: 'Create general knowledge tests and quizzes online using AI. Current affairs, static GK, and awareness MCQs. Perfect for competitive exam coaching. Free for teachers.',
    keywords: ['create gk test', 'gk quiz maker', 'general knowledge mcq generator', 'online gk test', 'current affairs quiz maker'],
    icon: 'Lightbulb',
    color: 'rose',
    heroDescription: 'Generate GK assessments covering current affairs, static GK, science & technology, sports, awards, and general awareness. Perfect for coaching institutes preparing students for competitive exams.',
    sampleTopics: ['Current Affairs', 'Static GK', 'Science & Technology', 'Sports', 'Awards & Honours', 'Indian Polity', 'Art & Culture', 'Environment'],
    questionTypes: ['Factual MCQs', 'Match-the-following', 'Chronological ordering', 'True/False questions']
  },
  {
    slug: 'reasoning',
    name: 'Reasoning & Aptitude',
    seoTitle: 'Create Reasoning Tests Online – AI Aptitude Quiz Maker',
    seoDescription: 'Create reasoning and aptitude tests online using AI. Logical reasoning, verbal ability, and quantitative aptitude MCQs. Free for educators and coaching institutes.',
    keywords: ['create reasoning test', 'aptitude quiz maker', 'logical reasoning mcq', 'reasoning test maker', 'aptitude test generator'],
    icon: 'Brain',
    color: 'violet',
    heroDescription: 'Generate reasoning and aptitude assessments covering logical reasoning, verbal ability, and quantitative aptitude. Perfect for coaching institutes and placement preparation.',
    sampleTopics: ['Logical Reasoning', 'Verbal Ability', 'Quantitative Aptitude', 'Data Interpretation', 'Puzzles', 'Coding-Decoding', 'Blood Relations', 'Syllogisms'],
    questionTypes: ['Logic MCQs', 'Pattern recognition', 'Data interpretation', 'Verbal reasoning']
  }
];

// ─── COMPARISON PAGES ────────────────────────────────────────────────────────

export const comparisonPages: ComparisonPageData[] = [
  {
    slug: 'testmoz-alternative',
    competitorName: 'Testmoz',
    seoTitle: 'TestoZa vs Testmoz – Best Testmoz Alternative for Teachers',
    seoDescription: 'Looking for a Testmoz alternative? TestoZa offers AI question generation, auto-grading, analytics, and white-label branding — all free. Compare features.',
    keywords: ['testmoz alternative', 'testmoz vs testoza', 'better than testmoz', 'testmoz replacement'],
    heroDescription: 'Testmoz is a simple test creator, but it lacks AI question generation, detailed analytics, and white-label branding. TestoZa gives you everything Testmoz offers and much more.',
    comparisonRows: [
      { feature: 'AI Question Generation', testoza: 'Yes — from PDFs, YouTube, text', competitor: 'No', testozaWins: true },
      { feature: 'Auto-Grading', testoza: 'Yes, instant', competitor: 'Yes, basic', testozaWins: true },
      { feature: 'Question Types', testoza: 'MCQ, Multiple-Select, Fill-in-Blank, True/False', competitor: 'MCQ, True/False, Fill-in-Blank', testozaWins: true },
      { feature: 'Student Analytics', testoza: 'Detailed — percentile, question-level, difficulty index', competitor: 'Basic score only', testozaWins: true },
      { feature: 'White-Label Branding', testoza: 'Yes (Premium)', competitor: 'No', testozaWins: true },
      { feature: 'Focus Tracking / Proctoring', testoza: 'Yes — tab-switch detection, full-screen mode', competitor: 'No', testozaWins: true },
      { feature: 'Free Plan', testoza: 'Unlimited tests, unlimited students', competitor: 'Limited (50 results)', testozaWins: true },
      { feature: 'Custom Certificates', testoza: 'Yes', competitor: 'No', testozaWins: true }
    ],
    whySwitch: [
      'AI generates questions from your existing materials — no manual typing',
      'Detailed student analytics beyond just pass/fail scores',
      'White-label branding to make it your own platform',
      'Focus tracking for secure exam delivery',
      'More generous free plan with no result limits'
    ]
  },
  {
    slug: 'classmarker-alternative',
    competitorName: 'ClassMarker',
    seoTitle: 'TestoZa vs ClassMarker – Best ClassMarker Alternative',
    seoDescription: 'Looking for a ClassMarker alternative? TestoZa offers AI test generation, better analytics, and white-label branding at a fraction of the cost. Compare features.',
    keywords: ['classmarker alternative', 'classmarker vs testoza', 'better than classmarker', 'classmarker replacement'],
    heroDescription: 'ClassMarker is a capable test platform, but its pricing model charges per test taken. TestoZa offers unlimited tests and students on the free plan, plus AI-powered question generation.',
    comparisonRows: [
      { feature: 'AI Question Generation', testoza: 'Yes — from PDFs, YouTube, text', competitor: 'No', testozaWins: true },
      { feature: 'Pricing Model', testoza: 'Flat monthly — unlimited tests', competitor: 'Per-test pricing', testozaWins: true },
      { feature: 'Free Plan', testoza: 'Unlimited tests, unlimited students', competitor: 'Very limited free tier', testozaWins: true },
      { feature: 'Question Import', testoza: 'AI from PDF, YouTube, text + manual', competitor: 'CSV import + manual', testozaWins: true },
      { feature: 'White-Label Branding', testoza: 'Yes (Premium)', competitor: 'Yes (paid)', testozaWins: false },
      { feature: 'Student Analytics', testoza: 'Detailed — percentile, question-level analysis', competitor: 'Good reporting', testozaWins: true },
      { feature: 'Focus Tracking', testoza: 'Yes — built-in', competitor: 'Limited', testozaWins: true },
      { feature: 'Custom Certificates', testoza: 'Yes', competitor: 'Yes', testozaWins: false }
    ],
    whySwitch: [
      'No per-test pricing — unlimited tests on every plan',
      'AI generates questions from your materials instantly',
      'More affordable for coaching institutes and schools',
      'Modern, mobile-friendly test-taking experience',
      'Built-in focus tracking and exam security'
    ]
  },
  {
    slug: 'google-forms-alternative',
    competitorName: 'Google Forms',
    seoTitle: 'TestoZa vs Google Forms – Better Alternative for Online Tests',
    seoDescription: 'Google Forms is great for surveys, not for exams. TestoZa is purpose-built for assessments — AI generation, auto-grading, analytics, proctoring, and white-label branding.',
    keywords: ['google forms alternative for tests', 'google forms vs testoza', 'better than google forms for quizzes', 'google forms exam alternative'],
    heroDescription: 'Google Forms is a general-purpose form builder. It lacks focus tracking, question shuffling, negative marking, timed sections, and student analytics. TestoZa is purpose-built for educational assessments.',
    comparisonRows: [
      { feature: 'AI Question Generation', testoza: 'Yes — from PDFs, YouTube, text', competitor: 'No', testozaWins: true },
      { feature: 'Focus Tracking / Proctoring', testoza: 'Yes — tab detection, full-screen', competitor: 'No', testozaWins: true },
      { feature: 'Question Shuffle', testoza: 'Questions + options independently', competitor: 'Basic shuffle', testozaWins: true },
      { feature: 'Negative Marking', testoza: 'Yes, configurable per question', competitor: 'No', testozaWins: true },
      { feature: 'Timed Sections', testoza: 'Yes — overall + section-wise timers', competitor: 'No native timer', testozaWins: true },
      { feature: 'Student Analytics', testoza: 'Percentile, difficulty index, question-level', competitor: 'Basic summary only', testozaWins: true },
      { feature: 'Leaderboards', testoza: 'Yes', competitor: 'No', testozaWins: true },
      { feature: 'White-Label Branding', testoza: 'Yes (Premium)', competitor: 'No', testozaWins: true },
      { feature: 'Price', testoza: 'Free', competitor: 'Free', testozaWins: false }
    ],
    whySwitch: [
      'Purpose-built for exams — not a repurposed form builder',
      'AI generates questions from your content automatically',
      'Real exam security with focus tracking and tab-switch detection',
      'Negative marking and competitive exam-style features',
      'Detailed student analytics, not just a spreadsheet of responses'
    ]
  },
  {
    slug: 'quizizz-alternative',
    competitorName: 'Quizizz',
    seoTitle: 'TestoZa vs Quizizz – Best Quizizz Alternative for Serious Assessments',
    seoDescription: 'Quizizz is great for gamified quizzes but lacks exam-grade features. TestoZa is built for serious assessments — AI generation, proctoring, and institutional branding.',
    keywords: ['quizizz alternative', 'quizizz vs testoza', 'better than quizizz', 'quizizz alternative for teachers'],
    heroDescription: 'Quizizz is designed for gamified, informal quizzes. TestoZa is built for serious assessments that need exam security, negative marking, timed sections, and institutional branding.',
    comparisonRows: [
      { feature: 'AI Question Generation from PDFs', testoza: 'Yes — PDF, YouTube, text, images', competitor: 'Limited', testozaWins: true },
      { feature: 'Exam-Grade Security', testoza: 'Focus tracking, full-screen, shuffle', competitor: 'Basic (designed for fun quizzes)', testozaWins: true },
      { feature: 'Negative Marking', testoza: 'Yes, fully configurable', competitor: 'No', testozaWins: true },
      { feature: 'Timed Sections', testoza: 'Yes — per-section time limits', competitor: 'Overall time only', testozaWins: true },
      { feature: 'White-Label Branding', testoza: 'Yes (Premium)', competitor: 'No', testozaWins: true },
      { feature: 'CBT Simulator Interface', testoza: 'Yes — clean exam environment', competitor: 'Game-style interface', testozaWins: true },
      { feature: 'Institution Analytics', testoza: 'Percentile, difficulty index, batch comparison', competitor: 'Basic class reports', testozaWins: true },
      { feature: 'Free Plan', testoza: 'Unlimited tests and students', competitor: 'Limited free tier', testozaWins: true }
    ],
    whySwitch: [
      'Serious assessment environment, not a gamified quiz',
      'Exam security features that Quizizz doesn\'t offer',
      'Negative marking and competitive exam format support',
      'White-label branding for your institution',
      'Deeper analytics with percentile and difficulty indexing'
    ]
  },
  {
    slug: 'typeform-alternative',
    competitorName: 'Typeform',
    seoTitle: 'TestoZa vs Typeform – Better Alternative for Online Tests & Quizzes',
    seoDescription: 'Typeform is built for surveys, not assessments. TestoZa is purpose-built for tests — AI generation, auto-grading, exam security, and analytics. Free for educators.',
    keywords: ['typeform alternative for quizzes', 'typeform vs testoza', 'better than typeform for tests', 'typeform quiz alternative'],
    heroDescription: 'Typeform is a beautiful survey tool, but it\'s not designed for educational assessments. It lacks auto-grading, negative marking, exam security, and the analytics teachers need.',
    comparisonRows: [
      { feature: 'AI Question Generation', testoza: 'Yes — from PDFs, YouTube, text', competitor: 'No', testozaWins: true },
      { feature: 'Auto-Grading', testoza: 'Yes, instant with analytics', competitor: 'Basic scoring only', testozaWins: true },
      { feature: 'Exam Security', testoza: 'Focus tracking, shuffle, full-screen', competitor: 'None', testozaWins: true },
      { feature: 'Negative Marking', testoza: 'Yes', competitor: 'No', testozaWins: true },
      { feature: 'Student Analytics', testoza: 'Detailed — percentile, question-level', competitor: 'Response summary only', testozaWins: true },
      { feature: 'Free Plan Limits', testoza: 'Unlimited tests and students', competitor: '10 responses/month on free', testozaWins: true },
      { feature: 'Design Quality', testoza: 'Clean, exam-focused', competitor: 'Beautiful, survey-focused', testozaWins: false },
      { feature: 'Custom Certificates', testoza: 'Yes', competitor: 'No', testozaWins: true }
    ],
    whySwitch: [
      'Purpose-built for educational assessments, not surveys',
      'Unlimited responses on the free plan (Typeform limits to 10/month)',
      'AI generates questions from your teaching materials',
      'Real exam features: timer, negative marking, shuffle, proctoring',
      'Detailed student analytics beyond simple response counts'
    ]
  }
];
