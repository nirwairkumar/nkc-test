import React, { useState } from 'react';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { sendSupportMessage } from '@/lib/supportApi';
import { Mail, Phone, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function SupportPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);

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

            toast.success('Message sent successfully! We will get back to you soon.');
            setFormData({ name: '', email: '', phone: '', message: '' });
        } catch (error: any) {
            console.error('Support error:', error);
            toast.error('Failed to send message: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-6 px-4 max-w-4xl">
            <SEO
                title="Help & Support - TestoZa"
                description="Get help with TestoZa. Contact our support team for any issues or suggestions regarding online test creation."
                keywords={["testoza support", "contact us", "help center", "customer care"]}
                schemas={[
                    {
                        "@context": "https://schema.org",
                        "@type": "FAQPage",
                        "mainEntity": [
                            {
                                "@type": "Question",
                                "name": "Is TestoZa free to use?",
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": "Yes! You can create and take unlimited tests for free. We also offer premium features for advanced analytics and branding."
                                }
                            },
                            {
                                "@type": "Question",
                                "name": "How do I create a test from PDF?",
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": "Go to \"Create Test\", select \"Import from PDF\", upload your question paper, and our AI will automatically extract questions for you."
                                }
                            },
                            {
                                "@type": "Question",
                                "name": "Can I sell my tests?",
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": "Currently, all tests are free. We are working on a marketplace feature that will allow verified educators to sell premium test series."
                                }
                            }
                        ]
                    }
                ]}
            />
            <h1 className="text-3xl font-bold text-center mb-8">Help & Support</h1>

            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Send us a Message</CardTitle>
                        <CardDescription>Have a suggestion or facing an issue?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="Your Name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number <span className="text-muted-foreground text-sm">(Optional)</span></Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    placeholder="+91 9876543210"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
                                <Textarea
                                    id="message"
                                    name="message"
                                    placeholder="Describe your issue or suggestion..."
                                    rows={4}
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Sending...' : (
                                    <>
                                        Send Message <Send className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* FAQ Section */}
            <div className="max-w-3xl mx-auto mt-12 mb-8">
                <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Is TestoZa free to use?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Yes! You can create and take unlimited tests for free. We also offer premium features for advanced analytics and branding.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">How do I create a test from PDF?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Go to "Create Test", select "Import from PDF", upload your question paper, and our AI will automatically extract questions for you.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Can I sell my tests?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Currently, all tests are free. We are working on a marketplace feature that will allow verified educators to sell premium test series.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Footer Section */}
            {/* <footer className="mt-16 border-t pt-8 pb-4 text-muted-foreground">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Quick Links</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/" className="hover:text-primary transition-colors">Home</a></li>
                            <li><a href="/my-tests" className="hover:text-primary transition-colors">My Tests</a></li>
                            <li><a href="/results" className="hover:text-primary transition-colors">Results</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Support</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/support" className="hover:text-primary transition-colors">Help Center</a></li>
                            <li><a href="/contact" className="hover:text-primary transition-colors">Contact Us</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Legal</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                            <li><a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Get in Touch</h3>
                        <div className="flex flex-col space-y-2 text-sm">
                            <span className="text-xs">Contact Email:</span>
                            <a href="mailto:nkchaudhary431@gmail.com" className="font-medium hover:text-primary transition-colors">nkchaudhary431@gmail.com</a>
                        </div>
                    </div>
                </div>
                <div className="text-center text-xs border-t pt-4">
                    &copy; {new Date().getFullYear()} NKC Test Platform. All rights reserved.
                </div>
            </footer> */}
        </div>
    );
}
