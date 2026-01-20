import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTest } from '@/contexts/TestContext';
import { allTests } from '@/data/questions';
import { GraduationCap, User, ArrowRight, BookOpen, Clock } from 'lucide-react';

const StudentEntry = () => {
  const [name, setName] = useState('');
  const [selectedTestIndex, setSelectedTestIndex] = useState<number | null>(null);
  const { setStudentName, setSelectedTest } = useTest();
  const navigate = useNavigate();

  const handleTestSelect = (testIndex: number) => {
    setSelectedTestIndex(testIndex);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && selectedTestIndex !== null) {
      setStudentName(name.trim());
      setSelectedTest(allTests[selectedTestIndex]);
      navigate('/test');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">D.EL.Ed Practice Platform</h1>
            <p className="text-muted-foreground mt-2 text-lg">
  <h2>कैसे शुरू करें?</h2>
  <ol>
    <li><b>अपना नाम भरें:</b> सबसे पहले अपना नाम दर्ज करें।</li>
    <li><b>टेस्ट चुनें:</b> लिस्ट में से टेस्ट का चुनाव करें।</li>
    <li><b>टेस्ट शुरू करें:</b> नीचे दिए गए "Start Test" बटन पर क्लिक करें और टेस्ट दीजिए।</li>
  </ol>

</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Student Name Input */}
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <User className="h-5 w-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Selection */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-foreground">Select Your Test</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {allTests.map((test, index) => (
                <Card 
                  key={index}
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
                    selectedTestIndex === index
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-border bg-card/80 hover:border-primary/50'
                  } backdrop-blur-sm`}
                  onClick={() => handleTestSelect(index)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-center mb-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        selectedTestIndex === index ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}>
                        <BookOpen className="h-6 w-6" />
                      </div>
                    </div>
                    <CardTitle className="text-lg text-center">{test.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      {test.description}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{test.questions.length} Questions • {test.questions.length} minutes</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <Button 
              type="submit" 
              className="h-12 px-8 text-lg flex items-center justify-center gap-2 bg-primary hover:bg-primary/90"
              disabled={!name.trim() || selectedTestIndex === null}
            >
              Start Test
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pb-8">
          <p>Make sure you have a stable internet connection</p>
        </div>
      </div>
    </div>
  );
};

export default StudentEntry;