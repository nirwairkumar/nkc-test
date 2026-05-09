import React, { useState } from 'react';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { sendSupportMessage } from '@/lib/supportApi';
import {
    Mail, Phone, MessageSquare, Send, ChevronDown, ChevronUp,
    HelpCircle, Loader2, HeadphonesIcon
} from 'lucide-react';
import { toast } from 'sonner';

const faqs = [
    {
        q: "Is TestoZa free to use?",
        a: "Yes! You can create and take unlimited tests for free. We also offer premium features for advanced analytics and branding."
    },
    {
        q: "How do I create a test from PDF?",
        a: "Go to \"Create Test\", select \"Import from PDF\", upload your question paper, and our AI will automatically extract questions for you."
    },
    {
        q: "Can I sell my tests?",
        a: "Currently, all tests are free. We are working on a marketplace feature that will allow verified educators to sell premium test series."
    },
];

export default function SupportPage() {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.message) {
            toast.error('Please fill in all required fields.');
            return;
        }
        setLoading(true);
        try {
            const { error } = await sendSupportMessage(formData);
            if (error) throw error;
            toast.success('Message sent! We will get back to you soon.');
            setFormData({ name: '', email: '', phone: '', message: '' });
        } catch (error: any) {
            toast.error('Failed to send message: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <SEO
                title="Help & Support - TestoZa"
                description="Get help with TestoZa. Contact our support team for any issues or suggestions regarding online test creation."
                keywords={["testoza support", "contact us", "help center", "customer care"]}
                schemas={[{
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": faqs.map(f => ({
                        "@type": "Question",
                        "name": f.q,
                        "acceptedAnswer": { "@type": "Answer", "text": f.a }
                    }))
                }]}
            />

            {/* Hero Header */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pt-8 pb-16">
                <div className="max-w-2xl mx-auto">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">We're here to help</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">Help &amp; Support</p>
                    <p className="text-sm text-slate-400 mt-1">Get in touch with our team for issues or suggestions.</p>
                </div>
            </div>

            <div className="px-4 -mt-10 pb-10 max-w-2xl mx-auto space-y-4">

                {/* Contact Form Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <HeadphonesIcon className="h-4 w-4 text-indigo-500" />
                        <div>
                            <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">Send us a Message</p>
                            <p className="text-xs text-slate-400">Have a suggestion or facing an issue?</p>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="name">
                                    Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="Your Name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="h-10 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="email">
                                    Email <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="h-10 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="phone">
                                Phone <span className="text-slate-300 dark:text-slate-600 normal-case tracking-normal font-normal">(Optional)</span>
                            </Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    placeholder="+91 9876543210"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="h-10 text-sm pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="message">
                                Message <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                            </Label>
                            <Textarea
                                id="message"
                                name="message"
                                placeholder="Describe your issue or suggestion..."
                                rows={4}
                                value={formData.message}
                                onChange={handleChange}
                                required
                                className="text-sm resize-none"
                            />
                        </div>

                        <Button type="submit" className="w-full h-10 text-sm font-semibold" disabled={loading}>
                            {loading
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                                : <><Send className="mr-2 h-4 w-4" />Send Message</>
                            }
                        </Button>
                    </form>
                </div>

                {/* Quick Contact Info */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Email Support</p>
                        <a href="mailto:support@testoza.com" className="text-sm font-bold text-indigo-800 dark:text-indigo-200 hover:underline">
                            support@testoza.com
                        </a>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-indigo-500" />
                        <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">Frequently Asked Questions</p>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {faqs.map((faq, i) => (
                            <div key={i}>
                                <button
                                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                >
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 pr-4">{faq.q}</span>
                                    {openFaq === i
                                        ? <ChevronUp className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                                        : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    }
                                </button>
                                {openFaq === i && (
                                    <div className="px-4 pb-4">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
