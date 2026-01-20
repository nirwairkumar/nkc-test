import { TestData } from '../questions';

export const allTests: TestData[] = [
    {
        title: "General Science",
        description: "Test your knowledge of basic science facts.",
        questions: [
            {
                id: 1,
                question: "What planet is known as the Red Planet?",
                options: {
                    A: "Venus",
                    B: "Jupiter",
                    C: "Mars",
                    D: "Saturn"
                },
                correctAnswer: "C"
            },
            {
                id: 2,
                question: "What is the chemical symbol for water?",
                options: {
                    A: "HO",
                    B: "H2O",
                    C: "O2",
                    D: "CO2"
                },
                correctAnswer: "B"
            },
            {
                id: 3,
                question: "Which gas do plants absorb from the atmosphere?",
                options: {
                    A: "Oxygen",
                    B: "Carbon Dioxide",
                    C: "Nitrogen",
                    D: "Hydrogen"
                },
                correctAnswer: "B"
            },
            {
                id: 4,
                question: "What is the center of an atom called?",
                options: {
                    A: "Electron",
                    B: "Proton",
                    C: "Nucleus",
                    D: "Neutron"
                },
                correctAnswer: "C"
            }
        ]
    }
];
