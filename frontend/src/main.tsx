import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Render first, defer non-critical registrations
createRoot(document.getElementById("root")!).render(<App />);

// WebMCP tool registration for Agentic Browsing — deferred to avoid blocking render
const registerWebMCP = () => {
  try {
    const contexts = [
      (document as any).modelContext,
      (navigator as any).modelContext,
      (window as any).modelContext
    ];
    const modelContext = contexts.find(ctx => ctx && typeof ctx.registerTool === 'function');

    if (modelContext) {
      // 1. Create test from topic
      const handleCreateFromTopic = async (params: any) => {
        const topic = params.topic;
        const numQuestions = params.numQuestions || 10;
        window.location.href = `/create-test?topic=${encodeURIComponent(topic)}&num=${numQuestions}`;
        return { status: 'success', message: `Redirecting to test creation page for topic "${topic}" with ${numQuestions} questions.` };
      };
      modelContext.registerTool({
        name: 'create_test_from_topic',
        description: 'Generates a mock test or exam on a specific subject, topic, or target exam (such as JEE, NEET, GATE).',
        inputSchema: {
          type: 'object',
          properties: {
            topic: { 
              type: 'string', 
              description: 'The academic subject, chapter, or exam topic to generate questions for.' 
            },
            numQuestions: { 
              type: 'number', 
              description: 'Number of questions to generate (default is 10).' 
            }
          },
          required: ['topic']
        },
        execute: handleCreateFromTopic,
        handler: handleCreateFromTopic
      }, handleCreateFromTopic);

      // 2. Create test from content
      const handleCreateFromContent = async (params: any) => {
        window.location.href = `/create-test?title=${encodeURIComponent(params.title)}&type=${params.contentType}&content=${encodeURIComponent(params.content)}&num=${params.numQuestions || 10}`;
        return { status: 'success', message: 'Navigating to test builder page with prepopulated content.' };
      };
      modelContext.registerTool({
        name: 'create_test_from_content',
        description: 'Create a new online test or quiz from raw text, PDF materials, or YouTube video link.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'The title of the test.' },
            contentType: { type: 'string', enum: ['text', 'pdf', 'youtube'], description: 'The type of source content.' },
            content: { type: 'string', description: 'The text content, YouTube URL, or PDF description.' },
            numQuestions: { type: 'number', description: 'Desired number of questions (default is 10).' }
          },
          required: ['title', 'contentType', 'content']
        },
        execute: handleCreateFromContent,
        handler: handleCreateFromContent
      }, handleCreateFromContent);

      // 3. Search available tests
      const handleSearch = async (params: any) => {
        window.location.href = `/dashboard?search=${encodeURIComponent(params.query)}${params.category ? `&category=${encodeURIComponent(params.category)}` : ''}`;
        return { status: 'success', message: `Navigating to dashboard with query: ${params.query}` };
      };
      modelContext.registerTool({
        name: 'search_available_tests',
        description: 'Search through thousands of public mock exams, quizzes, and assessments created by the community.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term, topic, or subject name.' },
            category: { type: 'string', description: 'Filter tests by category or topic (e.g. Science, JEE, History).' }
          },
          required: ['query']
        },
        execute: handleSearch,
        handler: handleSearch
      }, handleSearch);

      // 4. Get pricing and plans
      const handlePricing = async (params: any) => {
        window.location.href = '/pricing';
        return { status: 'success', message: 'Navigating to pricing and features page.' };
      };
      modelContext.registerTool({
        name: 'get_pricing_and_plans',
        description: 'Retrieve current subscription plans, pricing details, and institutional features for TestoZa.',
        inputSchema: {
          type: 'object',
          properties: {
            audience: { type: 'string', enum: ['individual', 'school', 'institute'], description: 'Filter plans by target user audience.' }
          }
        },
        execute: handlePricing,
        handler: handlePricing
      }, handlePricing);
    }
  } catch (e) {
    // Silent fail — WebMCP not available
  }
};

// Defer registration slightly to ensure it doesn't block the very first paint,
// but keep the timeout low (100ms) so automated crawlers/testing run AFTER it registers.
setTimeout(registerWebMCP, 100);
