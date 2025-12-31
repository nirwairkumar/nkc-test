import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">

            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold tracking-tight text-primary pb-2 border-b">
                        PRIVACY POLICY
                    </CardTitle>
                    <p className="text-sm text-muted-foreground pt-2">
                        Last Updated: {new Date().toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none pt-6 text-sm md:text-base leading-relaxed text-justify">
                    <p className="mb-4">
                        This Privacy Policy describes how TestoZa (“we”, “our”, or “us”) collects, uses, stores, and protects personal information of users who access or use our website, applications, and services (collectively referred to as the “Platform”). By accessing or using the Platform, you acknowledge that you have read, understood, and agreed to this Privacy Policy.
                    </p>

                    <p className="mb-4">
                        We collect personal information that users voluntarily provide during registration or while using the Platform. This may include name, email address, profile details, login credentials, and any other information submitted by the user. In addition, we collect usage-related data such as tests created or attempted, answers submitted, scores, test history, and interaction data. We may also collect technical information including IP address, browser type, device information, operating system, log files, cookies, and session data to ensure proper functioning of the Platform.
                    </p>

                    <p className="mb-4">
                        The information collected is used solely for the purpose of providing, operating, maintaining, and improving the Platform. This includes user authentication, test creation and participation, result generation, performance analysis, prevention of misuse or cheating, ensuring platform security, and communicating essential updates or notifications related to platform functionality. We do not use user data for any unlawful or unauthorized purposes.
                    </p>

                    <p className="mb-4">
                        All user data is stored using secure and reliable third-party infrastructure and industry-standard security practices. While we take reasonable steps to safeguard information, users acknowledge that no electronic transmission or storage system is completely secure and that absolute security cannot be guaranteed.
                    </p>

                    <p className="mb-4">
                        The Platform may use cookies and similar technologies to maintain user sessions, enhance user experience, analyze usage patterns, and improve overall performance. Users may disable cookies through their browser settings; however, doing so may affect certain features of the Platform.
                    </p>

                    <p className="mb-4">
                        We do not sell, trade, or rent personal information to third parties. Information may be shared only when required by law, court order, or governmental authority, or when necessary to protect the rights, property, safety, or integrity of the Platform and its users. We may also share limited data with trusted service providers strictly for operational purposes, subject to confidentiality obligations.
                    </p>

                    <p className="mb-4">
                        Users have the right to access, correct, update, or request deletion of their personal data, subject to applicable laws and legitimate business requirements. Requests related to personal data may be made by contacting us at support@testoza.com.
                    </p>

                    <p className="mb-4">
                        The Platform is not intended for children under the age of thirteen. If it is discovered that personal information of a minor has been collected without parental consent, such information will be deleted promptly upon notification.
                    </p>

                    <p className="mb-4">
                        We reserve the right to modify or update this Privacy Policy at any time. Continued use of the Platform after any changes constitutes acceptance of the revised Privacy Policy.
                    </p>

                    <p className="mb-4 font-semibold">
                        For any questions or concerns regarding this Privacy Policy, users may contact us at ziptrip.info.mail@gmail.com.
                    </p>
                </CardContent>
            </Card>
            {/* Spacer to ensure footer doesn't overlap on small screens if layout changes */}
            <div className="h-12"></div>
        </div>
    );
}
