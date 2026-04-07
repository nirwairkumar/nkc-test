import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { toast } from 'sonner';
import 'katex/dist/katex.min.css';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface AIChatBotProps {
  testContext: {
    testName: string;
    score: number;
    totalMarks: number;
    correct: number;
    wrong: number;
    skipped: number;
    accuracy: number;
    topics: any;
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const RECOMMENDED_QUESTIONS = [
  "Predict top colleges based on my marks",
  "What are my weakest topics?",
  "How can I improve my accuracy?",
  "Give me a revision plan based on my mistakes",
];

export function AIChatBot({ testContext, isOpen, onOpenChange }: AIChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim()) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          test_context: testContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'model', content: data.reply }]);
    } catch (error: any) {
      toast.error(error.message || 'Error communicating with TestoZa AI.');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: [0, -10, 0], 
              scale: 1 
            }}
            transition={{
              y: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              },
              default: { duration: 0.3 }
            }}
            className="mb-4 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 shadow-xl rounded-2xl p-4 w-64 cursor-pointer hover:shadow-2xl transition-all"
            onClick={() => onOpenChange(true)}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
               <span className="font-bold text-sm text-slate-800 dark:text-white">Analysis with AI</span>
            </div>
            <p className="text-xs text-slate-500 animate-pulse">
              Any help? Want to ask something about your results? Click here!
            </p>
          </motion.div>
        )}

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-[350px] md:w-[400px] h-[600px] max-h-[80vh] flex flex-col overflow-hidden mb-4 relative"
          >
            {/* Header */}
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between shadow-md z-10">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-1.5 rounded-full">
                  <img src="/ai-assistant.png" alt="AI" className="w-8 h-8 rounded-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">TestoZa AI</h3>
                  <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-semibold">Your Mentor</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-indigo-700 rounded-full" onClick={() => onOpenChange(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 dark:bg-slate-950 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-4">
                  <div className="bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-full">
                    <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300">How can I help you today?</h4>
                  <p className="text-sm text-slate-500">I have your result data. Ask me anything about your performance.</p>
                  
                  <div className="w-full flex flex-col gap-2 mt-4">
                    {RECOMMENDED_QUESTIONS.map((q, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleSendMessage(q)}
                        className="text-left text-xs bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-slate-700 p-3 rounded-xl shadow-sm transition-colors text-slate-700 dark:text-slate-300"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, idx) => (
                <div key={idx} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'model' && (
                    <div className="w-8 h-8 rounded-full shrink-0 mt-1 overflow-hidden">
                      <img src="/ai-assistant.png" alt="AI" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className={`p-3 rounded-2xl max-w-[80%] shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm'}`}>
                    {m.role === 'user' ? (
                       <p className="text-sm">{m.content}</p>
                    ) : (
                       <div className="prose prose-sm dark:prose-invert prose-p:leading-tight prose-a:text-indigo-400 max-w-none break-words">
                         <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{m.content}</ReactMarkdown>
                       </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                 <div className="flex gap-3 justify-start">
                   <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                       <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                       <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                       <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                 </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <Input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about your results..."
                className="flex-1 rounded-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
              />
              <Button 
                onClick={() => handleSendMessage()} 
                disabled={!inputValue.trim() || isTyping}
                size="icon" 
                className="rounded-full bg-indigo-600 hover:bg-indigo-700 shrink-0"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Permanent Anchor Icon when closed */}
      {!isOpen && (
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <Button 
            onClick={() => onOpenChange(true)}
            className="rounded-full w-14 h-14 bg-white hover:bg-slate-50 shadow-xl border-4 border-indigo-100 dark:border-slate-800 group p-0 overflow-hidden"
          >
            <img src="/ai-assistant.png" alt="AI" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
