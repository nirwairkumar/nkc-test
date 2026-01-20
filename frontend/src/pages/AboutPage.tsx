
import React from 'react';

const AboutPage = () => {
    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">About <span className="text-primary">TestoZa</span></h1>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
                <p>
                    This platform is a modern online assessment and quiz creation platform built for teachers, educational institutes, and students.
                </p>
                <p>
                    It allows teachers and institutes to easily create quizzes, class tests, and chapter-wise revision tests for their students. Tests can be shared privately within a class or made public, enabling other students to benefit and allowing institutes to showcase the quality of their academic content.
                </p>
                <p>
                    Students can use AI-powered tools to convert class notes, assignments, or study material into revision tests, helping them revise faster through active recall instead of passive reading.
                </p>

                <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Advanced Mathematics & Language Support</h2>
                    <p>
                        The platform supports LaTeX / KaTeX-style mathematical formatting, enabling users to write mathematical expressions directly in the same text area. These expressions are automatically rendered into clear, high-visual mathematical notation, making the platform ideal for Mathematics, Physics, Engineering, and other technical subjects.
                    </p>
                    <p className="mt-2">
                        In addition, questions can be created in all major Indian languages, allowing educators and students to work in the language they are most comfortable with and making assessments more inclusive.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Exam-Like Test Environment</h2>
                    <p>
                        An advanced, exam-oriented test environment provides a realistic and focused assessment experience. Features such as structured navigation, timers, section-wise tests, and controlled test behavior help simulate real examination conditions and ensure fair evaluation.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Purpose</h2>
                    <p>The platform is designed to support a shared learning ecosystem where:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Teachers can create and reuse quality assessments</li>
                        <li>Institutes can gain visibility through meaningful academic content</li>
                        <li>Students can learn effectively through practice and revision</li>
                    </ul>
                    <p className="mt-4">The focus is on improving learning through assessment, clarity, and recall, not just scoring.</p>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;
