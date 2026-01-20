// import React from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { useTest } from '@/contexts/TestContext';
// import { allTests } from '@/data/questions';
// import { GraduationCap, BookOpen, Clock, ArrowRight, BarChart3 } from 'lucide-react';

// const Homepage = () => {
//   const { setSelectedTest } = useTest();
//   const navigate = useNavigate();

//   const handleStartTest = (testIndex: number) => {
//     setSelectedTest(allTests[testIndex]);
//     navigate('/name-entry');
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 p-4">
//       <div className="max-w-6xl mx-auto space-y-8">
//         {/* Header */}
//         <div className="relative">
//           <div className="absolute top-4 left-4">
//             <Button
//               variant="outline"
//               onClick={() => navigate('/results')}
//               className="flex items-center gap-2"
//             >
//               <BarChart3 className="h-4 w-4" />
//               View Results
//             </Button>
//           </div>
//           <div className="text-center space-y-4 py-8">
//             <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
//               <GraduationCap className="h-10 w-10 text-primary" />
//             </div>
//             <div>
//               <h1 className="text-4xl font-bold text-foreground">D.EL.Ed Practice Platform</h1>
//               <p className="text-muted-foreground mt-2 text-lg">
//                 Choose a test from the available options below and start practicing
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Available Tests */}
//         <div className="space-y-6">
//           <h2 className="text-2xl font-bold text-center text-foreground">Available Tests</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {allTests.map((test, index) => (
//               <Card
//                 key={index}
//                 className="border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:scale-105 transition-all duration-200"
//               >
//                 <CardHeader className="pb-3">
//                   <div className="flex items-center justify-center mb-3">
//                     <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
//                       <BookOpen className="h-6 w-6 text-primary" />
//                     </div>
//                   </div>
//                   <CardTitle className="text-lg text-center">{test.title}</CardTitle>
//                 </CardHeader>
//                 <CardContent className="pt-0 space-y-4">
//                   <p className="text-sm text-muted-foreground text-center">
//                     {test.description}
//                   </p>
//                   <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
//                     <Clock className="h-4 w-4" />
//                     <span>{test.questions.length} Questions • {test.questions.length} minutes</span>
//                   </div>
//                   <Button
//                     onClick={() => handleStartTest(index)}
//                     className="w-full flex items-center justify-center gap-2"
//                   >
//                     Start Test
//                     <ArrowRight className="h-4 w-4" />
//                   </Button>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="text-center text-sm text-muted-foreground pb-8">
//           <p>Make sure you have a stable internet connection before starting any test</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Homepage;