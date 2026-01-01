import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsAndConditions() {
    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">

            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold tracking-tight text-primary pb-2 border-b">
                        TERMS AND CONDITIONS
                    </CardTitle>
                    {/* <p className="text-sm text-muted-foreground pt-2">
                        Last Updated: {new Date().toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p> */}
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none pt-6 text-sm md:text-base leading-relaxed text-justify">
                    <p className="mb-4">
                        These Terms and Conditions govern access to and use of TestoZa. By accessing or using the Platform, you agree to be legally bound by these Terms. If you do not agree, you must discontinue use of the Platform immediately.
                    </p>

                    <p className="mb-4">
                        The Platform is intended for users who are at least thirteen years of age. By using the Platform, you represent that the information provided by you is accurate, complete, and lawful. You are responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your account.
                    </p>

                    <p className="mb-4">
                        Users agree to use the Platform solely for lawful purposes and in a manner that does not violate any applicable laws, regulations, or rights of others. Any attempt to cheat, manipulate test outcomes, bypass security or proctoring mechanisms, copy platform content without authorization, disrupt system performance, or upload harmful or misleading content is strictly prohibited. We reserve the right to suspend or permanently terminate accounts found in violation of these rules.
                    </p>

                    <p className="mb-4">
                        All tests, content, and services on the Platform are provided on an “as is” and “as available” basis. We do not guarantee the accuracy, completeness, reliability, or suitability of any test, question, result, or evaluation. Test results are intended solely for practice, assessment, or informational purposes and should not be relied upon for academic, professional, or competitive exam decisions.
                    </p>

                    <p className="mb-4">
                        All intellectual property rights related to the Platform, including but not limited to software, design, logos, branding, and proprietary content, belong exclusively to TestoZa. Users retain ownership of content they create on the Platform; however, by submitting such content, users grant us a non-exclusive, royalty-free license to host, display, and distribute it solely for platform operations.
                    </p>

                    <p className="mb-4">
                        We do not guarantee uninterrupted access to the Platform. Service availability may be affected due to maintenance, technical issues, or circumstances beyond our control. We shall not be liable for any interruption, delay, data loss, or system failure.
                    </p>

                    <p className="mb-4">
                        To the maximum extent permitted by law, TestoZa shall not be liable for any direct, indirect, incidental, consequential, or special damages arising out of or related to the use of the Platform, including but not limited to loss of data, academic loss, career outcomes, or reliance on test results. Users acknowledge that use of the Platform is entirely at their own risk.
                    </p>

                    <p className="mb-4">
                        We reserve the right to suspend or terminate user access at any time, with or without notice, for violation of these Terms, security concerns, or legal compliance.
                    </p>

                    <p className="mb-4">
                        These Terms and Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or related to these Terms shall be subject to the exclusive jurisdiction of the courts of India.
                    </p>

                    <p className="mb-4 font-semibold">
                        For any questions, concerns, or legal notices, users may contact us at ziptrip.info.mail@gmail.com.
                    </p>
                </CardContent>
            </Card>
            {/* Spacer to ensure footer doesn't overlap on small screens if layout changes */}
            <div className="h-12"></div>
        </div>
    );
}
