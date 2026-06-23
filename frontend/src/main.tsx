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
        }
      }, async (params: any) => {
        window.location.href = `/create-test?title=${encodeURIComponent(params.title)}&type=${params.contentType}&content=${encodeURIComponent(params.content)}&num=${params.numQuestions || 10}`;
        return { status: 'success', message: 'Navigating to test builder page with prepopulated content.' };
      });

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
        }
      }, async (params: any) => {
        window.location.href = `/dashboard?search=${encodeURIComponent(params.query)}${params.category ? `&category=${encodeURIComponent(params.category)}` : ''}`;
        return { status: 'success', message: `Navigating to dashboard with query: ${params.query}` };
      });

      modelContext.registerTool({
        name: 'get_pricing_and_plans',
        description: 'Retrieve current subscription plans, pricing details, and institutional features for TestoZa.',
        inputSchema: {
          type: 'object',
          properties: {
            audience: { type: 'string', enum: ['individual', 'school', 'institute'], description: 'Filter plans by target user audience.' }
          }
        }
      }, async (params: any) => {
        window.location.href = '/pricing';
        return { status: 'success', message: 'Navigating to pricing and features page.' };
      });
    }
  } catch (e) {
    // Silent fail — WebMCP not available
  }
};

if ('requestIdleCallback' in window) {
  (window as any).requestIdleCallback(registerWebMCP);
} else {
  setTimeout(registerWebMCP, 2000);
}
