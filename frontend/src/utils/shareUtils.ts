export const shareTest = async (test: any) => {
    const testPath = test.slug || test.id;
    const url = `${window.location.origin}/test/${testPath}`;

    const message = `Try this test "${test.title}" on Testoza 🚀

Practice now:
${url}

Powered by Testoza
https://www.testoza.com`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: test.title,
                text: message,
            });
        } else {
            await navigator.clipboard.writeText(url);
            if (typeof window !== "undefined" && (window as any).toast) {
                (window as any).toast.success("Link copied!");
            }
        }
    } catch (err) {
        console.error("Share failed:", err);
    }
};

export const shareResultWhatsApp = (test: any, score: number | string, totalMarks: number | string) => {
    const message = `I just completed "${test.title}" on Testoza 🚀

My Score: ${score}/${totalMarks}

Try it here:
${window.location.origin}/test/${test.slug || test.id}

Powered by Testoza
https://www.testoza.com`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
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
    if (typeof window !== "undefined" && (window as any).toast) {
        (window as any).toast.info("Image downloaded — share it on Instagram 📸");
    }
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
${window.location.origin}/test/${test.slug || test.id}

Powered by Testoza
https://www.testoza.com`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: "My Test Result",
                text,
                files: [file],
            });
        } else {
            downloadResultImage(image);
        }
    } catch (err) {
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
    const testPath = test.slug || test.id;
    const url = `${window.location.origin}/test/${testPath}`;

    const message = `I scored ${score}/${totalMarks} in "${test.title}" on Testoza 🚀

Can you beat my score?

Try here:
${url}

Powered by Testoza
https://www.testoza.com`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: "My Test Result",
                text: message,
            });
        } else {
            await navigator.clipboard.writeText(message);
            if (typeof window !== "undefined" && (window as any).toast) {
                (window as any).toast.success("Message copied!");
            }
        }
    } catch (err) {
        console.error(err);
    }
};
