import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTest } from '@/contexts/TestContext';
import { User, ArrowRight, BookOpen, Clock, ArrowLeft } from 'lucide-react';

const NameEntry = () => {
  const [name, setName] = useState('');
  const { selectedTest, setStudentName, setTimeRemaining } = useTest();
  const navigate = useNavigate();

  useEffect(() => {
    // If no test is selected, redirect to homepage
    if (!selectedTest) {
      navigate('/');
      return;
    }

    // Initialize timer when test is selected
    const totalTime = selectedTest.questions.length * 60; // 1 minute per question
    setTimeRemaining(totalTime);
  }, [selectedTest, navigate, setTimeRemaining]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && selectedTest) {
      setStudentName(name.trim());
      navigate('/test');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (!selectedTest) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 p-4 flex items-center justify-center">
      <div className="max-w-md mx-auto space-y-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tests
        </Button>

        {/* Selected Test Info */}
        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">{selectedTest.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{selectedTest.description}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
              <Clock className="h-4 w-4" />
              <span>{selectedTest.questions.length} Questions • {selectedTest.questions.length} minutes</span>
            </div>
          </CardHeader>
        </Card>

        {/* Name Entry Form */}
        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <User className="h-5 w-5" />
              Enter Your Name
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 text-lg"
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg flex items-center justify-center gap-2"
                disabled={!name.trim()}
              >
                Proceed to Test
                <ArrowRight className="h-5 w-5" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3 text-center">Test Instructions</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Timer will start automatically when you begin the test</li>
              <li>• You have {selectedTest.questions.length} minutes to complete {selectedTest.questions.length} questions</li>
              <li>• You can navigate between questions freely</li>
              <li>• Test will auto-submit when time expires</li>
              <li>• Make sure you have a stable internet connection</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NameEntry;