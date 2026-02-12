import { Question, TestSection } from '@/lib/testsApi';

export interface QuestionState extends Omit<Question, 'correctAnswer' | 'options'> {
    options: { [key: string]: string };
    correctAnswer: any;
    typingMode: 'en' | 'hi';
}

export type SectionState = TestSection & { questions: QuestionState[] };

export const DEFAULT_QUESTION: QuestionState = {
    id: 1,
    type: 'single',
    question: '',
    passageContent: '',
    groupId: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswer: '',
    typingMode: 'en',
    marks: '4',
    negativeMarks: '1'
};
