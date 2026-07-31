import { BookOpen, Search, TrendingUp, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function TestCollectionSection() {
    const navigate = useNavigate();

    const categories = [
        { name: 'Mathematics', count: 1250, color: 'from-blue-500 to-cyan-500', icon: '📐' },
        { name: 'Science', count: 980, color: 'from-green-500 to-emerald-500', icon: '🔬' },
        { name: 'Languages', count: 850, color: 'from-purple-500 to-pink-500', icon: '🗣️' },
        { name: 'History', count: 720, color: 'from-orange-500 to-red-500', icon: '📚' },
        { name: 'Technology', count: 1100, color: 'from-indigo-500 to-blue-500', icon: '💻' },
        { name: 'Business', count: 650, color: 'from-yellow-500 to-orange-500', icon: '💼' },
    ];

    return (
        <section className="py-32 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <div className="container mx-auto px-6">
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-purple-200 dark:border-purple-800 mb-6">
                        <Library className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Vast Collection</span>
                    </div>
                    <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Access Thousands of Tests
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Explore our extensive library of tests across multiple subjects and difficulty levels.
                        Find the perfect test or get inspired to create your own.
                    </p>
                </div>

                {/* Categories Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
                    {categories.map((category, index) => (
                        <div
                            key={index}
                            className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer overflow-hidden"
                            onClick={() => navigate(`/tests/${category.name.toLowerCase()}`)}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="text-4xl mb-3">{category.icon}</div>
                                    <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
                                    <p className="text-muted-foreground">{category.count} tests available</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search CTA */}
                <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-center text-white shadow-2xl">
                    <Search className="w-16 h-16 mx-auto mb-6 opacity-90" />
                    <h3 className="text-3xl md:text-4xl font-bold mb-4">Find Your Perfect Test</h3>
                    <p className="text-lg mb-8 opacity-90">
                        Search through thousands of tests by topic, difficulty, or creator.
                        Start exploring now!
                    </p>
                    <Button
                        size="lg"
                        onClick={() => navigate('/dashboard')}
                        className="bg-white text-purple-600 hover:bg-white/90 text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                    >
                        <Search className="mr-2 w-5 h-5" />
                        Browse Tests
                    </Button>
                </div>
            </div>
        </section>
    );
}
