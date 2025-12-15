import { GoogleGenerativeAI } from "@google/generative-ai";
import supabase from './supabaseClient';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("Missing Gemini API Key in .env");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

// Helper to extract Video ID
function extractVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Fetch via local proxy to bypass CORS
async function fetchTranscript(videoId: string): Promise<string> {
    try {
        console.log("Fetching video page via proxy...");
        const videoPageResponse = await fetch(`/api/yt/watch?v=${videoId}`);
        const videoPageHtml = await videoPageResponse.text();

        // Strategy 1: Look for "captionTracks" directly (common in some responses)
        let captionTracks = null;
        const captionTracksRegex = /"captionTracks":\s*(\[.*?\])/;
        const match = videoPageHtml.match(captionTracksRegex);

        if (match) {
            captionTracks = JSON.parse(match[1]);
        }

        // Strategy 2: Look for ytInitialPlayerResponse (more robust)
        if (!captionTracks) {
            const playerResponseRegex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
            const playerMatch = videoPageHtml.match(playerResponseRegex);
            if (playerMatch) {
                try {
                    const playerResponse = JSON.parse(playerMatch[1]);
                    captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                } catch (e) {
                    console.error("Failed to parse ytInitialPlayerResponse", e);
                }
            }
        }

        if (!captionTracks || captionTracks.length === 0) {
            console.log("No captionTracks found manually.");
            // Return empty to allow fallback check later
            return "";
        }

        console.log(`Found ${captionTracks.length} caption tracks.`);

        // Priority: 
        // 1. English
        // 2. Hindi
        // 3. ANY (Support for 'any language' request)
        const track = captionTracks.find((t: any) => t.languageCode === 'en' && !t.kind) ||
            captionTracks.find((t: any) => t.languageCode === 'en') ||
            captionTracks.find((t: any) => t.languageCode === 'hi') ||
            captionTracks[0]; // Fallback to whatever is available

        if (!track) {
            return "";
        }

        const transcriptUrl = track.baseUrl;
        console.log("Fetching transcript from:", transcriptUrl, "Lang:", track.languageCode);

        // Proxy the transcript URL
        const urlObj = new URL(transcriptUrl);
        const path = urlObj.pathname + urlObj.search;
        const finalUrl = `/api/yt${path}`;

        const transcriptResponse = await fetch(finalUrl);
        if (!transcriptResponse.ok) throw new Error("Failed to fetch transcript XML");

        const transcriptXml = await transcriptResponse.text();

        // Parse XML to Text
        const textMatches = transcriptXml.match(/<text[^>]*>(.*?)<\/text>/g);

        if (textMatches && textMatches.length > 0) {
            const fullText = textMatches.map(t => {
                return t.replace(/<[^>]+>/g, '')
                    .replace(/&amp;/g, '&')
                    .replace(/&#39;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/&nbsp;/g, ' ');
            }).join(' ');
            return fullText;
        }

        return "";

    } catch (error) {
        console.error("Transcript fetch error:", error);
        // Do not throw here, return empty string so we can handle it in the main function (maybe fallback?)
        return "";
    }
}

export async function generateTestFromYouTube(url: string, userId: string) {
    if (!API_KEY) {
        throw new Error("Gemini API Key is missing. Please check .env file.");
    }

    try {
        console.log("Processing video URL:", url);
        const videoId = extractVideoId(url);

        if (!videoId) {
            throw new Error("Invalid YouTube URL");
        }

        let transcriptText = await fetchTranscript(videoId);

        // LIMITATION CHECK
        // If transcript is missing, we try to proceed ONLY if the user wants "any video".
        // Use Gemini Multimodal Fallback for videos without transcripts
        let usedMethod = "transcript";

        if (!transcriptText || transcriptText.length < 50) {
            console.log("Transcript failed or empty. Attempting direct video processing (Multimodal)...");
            usedMethod = "video";
            // Check if video is potentially accessible (public)
            // Note: We can't easily check 'public' status client-side without API key, 
            // but Gemini Multimodal works on Public videos.
        } else {
            // Limit transcript length (Token limit)
            if (transcriptText.length > 30000) {
                transcriptText = transcriptText.slice(0, 30000);
            }
            console.log("Using Transcript-based Generation. Length:", transcriptText.length);
        }

        // Use Gemini 2.5 Flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });

        let prompt;
        let requestContent;

        if (usedMethod === "transcript") {
            prompt = `
                You are an expert exam setter. I have provided a lecture transcript below.
                
                Your task:
                1. Analyze the content deeply.
                2. Create a comprehensive summary (max 300 words) in English.
                3. Generate **at least 10** high-quality multiple-choice questions (MCQs) in English.
                
                IMPORTANT: Output **ONLY** valid raw JSON. Do not use markdown formatting (no \`\`\`json).
                
                JSON Structure:
                {
                    "summary": "Summary of the lecture...",
                    "title": "A suitable title",
                    "questions": [
                        {
                            "id": 1,
                            "question": "Question text...",
                            "options": {
                                "A": "Option A text",
                                "B": "Option B text",
                                "C": "Option C text",
                                "D": "Option D text"
                            },
                            "correctAnswer": "A"
                        }
                    ]
                }

                Transcript:
                ${transcriptText}
            `;
            requestContent = prompt;
        } else {
            // MULTIMODAL FALLBACK
            prompt = `
                You are an expert exam setter.
                Analyze the video content efficiently.
                1. Extract key educational concepts.
                2. Create a summary (max 300 words).
                3. Generate 10 high-quality MCQs.

                Output **ONLY** valid raw JSON.
                JSON Structure:
                {
                    "summary": "Summary...",
                    "title": "Topic Title",
                    "questions": [ 
                        { 
                            "id": 1, 
                            "question": "...", 
                            "options": { "A": "...", "B": "...", "C": "...", "D": "..." }, 
                            "correctAnswer": "A" 
                        } 
                    ]
                }
            `;
            requestContent = [
                {
                    fileData: {
                        mimeType: "video/mp4",
                        fileUri: url,
                    },
                },
                { text: prompt },
            ];
        }

        console.log("Sending request to Gemini (" + usedMethod + ")...");

        // @ts-ignore
        const result = await model.generateContent(requestContent);
        const response = await result.response;
        let text = response.text();

        console.log("Raw AI Response:", text);

        // Clean markdown code blocks
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Parse JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse AI JSON:", e);
            throw new Error("AI generated invalid data format. Please try again or use a different video.");
        }

        console.log("AI Generation complete:", data.title);

        if (!data.questions || data.questions.length === 0) {
            throw new Error("AI discovered no questions content. Try a longer educational video.");
        }

        // 3. Save to Supabase
        const customId = `YT-${Date.now().toString().slice(-6)}`;

        const { data: insertedData, error } = await supabase
            .from('tests')
            .insert({
                title: data.title,
                description: data.summary,
                questions: data.questions,
                duration: 15,
                marks_per_question: 1,
                negative_marks: 0,
                custom_id: customId,
                created_by: userId
            })
            .select()
            .single();

        if (error) throw error;

        return insertedData;

    } catch (error: any) {
        console.error("Error in generateTestFromYouTube:", error);
        throw new Error(error.message || "Failed to generate test.");
    }
}