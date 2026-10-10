import { toast } from "sonner";
import { shareLink } from "@/utils/canonicalUrl";

export { shareLink };

/**
 * Share helpers.
 *
 * Two different jobs live in this file and they are not the same message:
 *
 *  - `shareTest` is a *teacher instructing a batch*. It goes into a class WhatsApp
 *    group next to the teacher's own name, so it carries one link, says what the
 *    paper is, and answers the question every Indian teacher asks before they press
 *    send: "will my students have to make an account?" (They don't.)
 *  - `shareResultWhatsApp` / `shareWithFriends` / `shareResultImage` are a *student
 *    bragging about a score*. Those keep the playful tone.
 *
 * Rules for both, learned the hard way (see TestoZa/Why_Teachers_Dont_Circulate_Tests_Oct2026.md):
 *
 *  1. Never ship a second "if the first link doesn't work" link. It told the
 *     teacher's own students that our links are unreliable, and the fallback it
 *     offered — /test-intro/<uuid> — is hard-blocked for private and conduct-mode
 *     tests, so the recommended Plan B was a wall.
 *  2. Always confirm on screen. The old code called `window.toast`, which is
 *     never assigned anywhere, so on every browser without the Web Share API
 *     (desktop Firefox, desktop Chrome) Share copied the link and showed nothing.
 *     Teachers concluded the button was dead.
 *  3. One absolute URL, always the same host. Links used to be built from
 *     `window.location.origin`, so the same test was testoza.com/test/x or
 *     app.testoza.com/test/x depending on where the teacher happened to be standing.
 */

/** The one link to a test: its conduct-mode link when it has one, else its slug, else its id. */
export const testLink = (test: any): string => {
    const conduct = test?.settings?.conduct_exam;
    if (conduct?.enabled) {
        const slug = conduct.conduct_slug || test.slug;
        if (slug) return shareLink(`/test/${slug}`);
    }
    if (test?.slug) return shareLink(`/test/${test.slug}`);
    return shareLink(`/test-intro/${test?.id}`);
};

/** True when the teacher switched on "candidates must sign in" (Test settings). */
export const needsSignIn = (test: any): boolean => Boolean(test?.settings?.login_required);

/** "30 questions · 45 min" — whichever of the two we actually know. */
const testFacts = (test: any): string => {
    const count = test?.total_questions || (Array.isArray(test?.questions) ? test.questions.length : 0);
    return [
        test?.institution_name || null,
        count ? `${count} question${count === 1 ? "" : "s"}` : null,
        test?.duration ? `${test.duration} min` : null,
    ].filter(Boolean).join(" · ");
};

/**
 * The message a teacher drops into the class group. Exported so the "Send to your
 * students" screen shows the teacher exactly what their students will read.
 */
export function testInviteText(test: any): string {
    const facts = testFacts(test);
    const lines = [`📝 *${test?.title || "Test"}*`];
    if (facts) lines.push(facts);
    lines.push("", "Open this link to start:", testLink(test));
    // Only promise what's true: a teacher can switch on "candidates must sign in".
    lines.push("", needsSignIn(test) ? "Sign in when the page asks, then start." : "No app and no account needed — just type your name.");
    // An institute's own paper shouldn't carry our name into their parents' groups.
    if (!test?.institution_name) lines.push("", "Conducted on TestoZa");
    return lines.join("\n");
}

/** Copy text and say so. Returns false when the browser refused (so callers can show the text instead). */
export const copyText = async (text: string, what = "Link"): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(`${what} copied`);
        return true;
    } catch {
        toast.error(`Could not copy the ${what.toLowerCase()} — select it and copy by hand`);
        return false;
    }
};

/** WhatsApp deep link for a message (optionally to one number). */
export const whatsappShareLink = (text: string, phone?: string | null): string => {
    const digits = (phone || "").replace(/[^0-9]/g, "");
    // Indian numbers are usually saved without the country code.
    const to = digits.length === 10 ? `91${digits}` : digits;
    return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
};

/**
 * Share a test with a batch. On phones this opens the OS share sheet; on desktop it
 * copies the full message (so pasting into WhatsApp Web gives the student the
 * instructions, not a bare URL) and confirms on screen.
 */
export const shareTest = async (test: any) => {
    const message = testInviteText(test);
    const url = testLink(test);

    try {
        if (navigator.share) {
            await navigator.share({ title: test?.title, text: message, url });
            return;
        }
    } catch (err: any) {
        // The teacher closing the share sheet is not an error worth a toast.
        if (err?.name === "AbortError") return;
        console.error("Share failed:", err);
    }

    await copyText(message, "Message");
};

export const shareResultWhatsApp = (test: any, score: number | string, totalMarks: number | string) => {
    const message = `I just completed "${test.title}" on Testoza 🚀

My Score: ${score}/${totalMarks}

Try it here:
${testLink(test)}`;

    window.open(whatsappShareLink(message), "_blank");
};

import html2canvas from "html2canvas";

export const generateResultImage = async () => {
    const element = document.getElementById("results-overview-section");
    if (!element) return null;
    const canvas = await html2canvas(element);
    return canvas.toDataURL("image/png");
};

export const downloadResultImage = (image: string) => {
    const link = document.createElement("a");
    link.download = "testoza-result.png";
    link.href = image;
    link.click();
    toast.info("Image downloaded — share it on Instagram 📸");
};

export const shareResultImage = async (test: any, score: number | string, totalMarks: number | string) => {
    const image = await generateResultImage();
    if (!image) return;

    const file = await fetch(image)
        .then((res) => res.blob())
        .then((blob) => new File([blob], "testoza-result.png", { type: "image/png" }));

    const text = `I scored ${score}/${totalMarks} in "${test.title}" on Testoza 🚀

Can you beat my score?

Try here:
${testLink(test)}`;

    try {
        if (navigator.share) {
            await navigator.share({ title: "My Test Result", text, files: [file] });
        } else {
            downloadResultImage(image);
        }
    } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error(err);
    }
};

export const shareToReddit = (url: string, title: string) => {
    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, "_blank");
};

export const shareToFacebook = (url: string) => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
};

export const shareWithFriends = async (test: any, score: number | string, totalMarks: number | string) => {
    const message = `I scored ${score}/${totalMarks} in "${test.title}" on Testoza 🚀

Can you beat my score?

Try here:
${testLink(test)}`;

    try {
        if (navigator.share) {
            await navigator.share({ title: "My Test Result", text: message });
            return;
        }
    } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error(err);
    }

    await copyText(message, "Message");
};
