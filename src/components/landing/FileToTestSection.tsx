import { FileImage, FileText, Wand2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function FileToTestSection() {
    const navigate = useNavigate();

    const features = [
        {
            icon: FileText,
            title: 'PDF to Test',
            description: 'Upload any PDF document and our AI will extract content and generate relevant questions automatically.',
            color: 'from-red-500 to-orange-500',
            bgColor: 'from-red-500/10 to-orange-500/10',
        },
        {
            icon: FileImage,
            title: 'Image to Test',
            description: 'Upload images with text, diagrams, or charts. AI extracts and creates questions from visual content.',
            color: 'from-green-500 to-emerald-500',
            bgColor: 'from-green-500/10 to-emerald-500/10',
        },
        {
            icon: Wand2,
            title: 'AI-Powered',
            description: 'Advanced AI understands context, creates meaningful questions, and generates accurate answer options.',
            color: 'from-purple-500 to-violet-500',
            bgColor: 'from-purple-500/10 to-violet-500/10',
        },
        {
            icon: Zap,
            title: 'Instant Results',
            description: 'Get your complete test in seconds. Edit, customize, and publish immediately or save for later.',
            color: 'from-yellow-500 to-amber-500',
            bgColor: 'from-yellow-500/10 to-amber-500/10',
        },
    ];

    return (
        <section className="py-32 bg-white dark:bg-slate-900">
            <div className="container mx-auto px-6">
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-6">
                        <Wand2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">AI-Powered Generation</span>
                    </div>
                    <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Generate Tests from Files
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Transform your PDFs and images into comprehensive tests with the power of AI.
                        No manual work required.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group relative bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 hover:border-transparent hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgColor} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                            <div className="relative z-10">
                                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                    <feature.icon className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-muted-foreground text-lg leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Demo Section */}
                <div className="max-w-4xl mx-auto bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl p-12 border-2 border-dashed border-purple-300 dark:border-purple-700">
                    <div className="text-center space-y-6">
                        <div className="flex justify-center gap-4 mb-8">
                            <div className="w-20 h-24 bg-white dark:bg-slate-800 rounded-lg shadow-lg flex items-center justify-center border-2 border-red-200 dark:border-red-800">
                                <FileText className="w-10 h-10 text-red-500" />
                            </div>
                            <div className="flex items-center">
                                <div className="w-12 h-1 bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse"></div>
                            </div>
                            <div className="w-20 h-24 bg-white dark:bg-slate-800 rounded-lg shadow-lg flex items-center justify-center border-2 border-green-200 dark:border-green-800">
                                <Wand2 className="w-10 h-10 text-green-500" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold">Ready to Try?</h3>
                        <p className="text-lg text-muted-foreground">
                            Upload your first file and experience the magic of AI-powered test generation.
                        </p>
                        <Button
                            size="lg"
                            onClick={() => navigate('/ai-import')}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                        >
                            <FileText className="mr-2 w-5 h-5" />
                            Generate from File
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
