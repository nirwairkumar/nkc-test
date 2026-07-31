import { Library, Users, BookOpen, Award } from 'lucide-react';

export default function PlatformStatsSection() {
    const stats = [
        { icon: Library, label: 'Total Tests', value: '10,000+', color: 'text-blue-600' },
        { icon: Users, label: 'Contributors', value: '5,000+', color: 'text-green-600' },
        { icon: BookOpen, label: 'Categories', value: '50+', color: 'text-purple-600' },
        { icon: Award, label: 'Premium Tests', value: '2,000+', color: 'text-orange-600' },
    ];

    return (
        <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
            <div className="container mx-auto px-6">
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Trusted by Thousands
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Join our growing community of educators and learners creating amazing tests every day
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                        >
                            <stat.icon className={`w-12 h-12 ${stat.color} mx-auto mb-4`} />
                            <div className="text-4xl font-bold mb-2">{stat.value}</div>
                            <div className="text-sm text-muted-foreground">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
