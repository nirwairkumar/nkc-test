import { TestData } from '../questions';

export const allTests: TestData[] = [
    {
        title: "Basic Mathematics",
        description: "A simple test covering addition, subtraction, and multiplication.",
        questions: [
            {
                id: 1,
                question: "What is 5 + 7?",
                options: {
                    A: "10",
                    B: "12",
                    C: "14",
                    D: "15"
                },
                correctAnswer: "B"
            },
            {
                id: 2,
                question: "What is 10 - 4?",
                options: {
                    A: "5",
                    B: "6",
                    C: "7",
                    D: "4"
                },
                correctAnswer: "B"
            },
            {
                id: 3,
                question: "What is 3 x 3?",
                options: {
                    A: "6",
                    B: "9",
                    C: "12",
                    D: "33"
                },
                correctAnswer: "B"
            },
            {
                id: 4,
                question: "What is 15 / 3?",
                options: {
                    A: "3",
                    B: "5",
                    C: "4",
                    D: "6"
                },
                correctAnswer: "B"
            }
        ]
    }
];
