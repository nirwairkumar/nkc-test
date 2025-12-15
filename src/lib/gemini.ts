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

        // Logic check for method
        let usedMethod = "transcript";

        if (!transcriptText || transcriptText.length < 50) {
            console.log("Transcript failed or empty. Attempting direct video processing (Multimodal)...");
            usedMethod = "video";
        } else {
            // Limit transcript length (Token limit)
            if (transcriptText.length > 30000) {
                transcriptText = transcriptText.slice(0, 30000);
            }
            console.log("Using Transcript-based Generation. Length:", transcriptText.length);
        }

        // Use Gemini 2.5 Flash as requested
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        let prompt;
        let requestContent;

        if (usedMethod === "transcript") {
            prompt = `
                You are an expert exam setter and educator.
                
                Task:
                1. Analyze the lecture transcript.
                2. Extract metadata (Teacher, Subject, Exam Type) for a short description.
                3. Create **structured revision notes** (Markdown supported) that help a student revise before exams.
                   - Use clear bullet points
                   - Include formulas, keywords, shortcuts, and step-by-step logic where applicable
                   - Highlight common mistakes or traps if mentioned
                   - Keep language simple and exam-oriented
                4. **Extract(if questions present in the video)** orGenerate **as many MCQs as possible** (aim for 15-20, minimum 10) based strictly on the content.
                
                IMPORTANT: Output **ONLY** valid raw JSON.
                
                JSON Structure:
                {
                    "title": "Topic or Video Title",
                    "description": "Short info: Teacher Name | Subject | Exam Target (e.g. JEE/NEET/Board)",
                    "revision_notes": "# Key Notes\n* Point 1\n* Formula...",
                    "questions": [
                        {
                            "id": 1,
                            "question": "Question text...",
                            "options": {
                                "A": "...",
                                "B": "...",
                                "C": "...",
                                "D": "..."
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
                Analyze the visual video content efficiently.
                1. Create a short description (Subject/Topic).
                2. Create structured revision notes (bullet points, key concepts).
                3. Extract(if questions present in the video) or Generate **high-quality MCQs** as many as possible. for large videos, generate minimum 10 MCQs. based strictly on the content.

                Output **ONLY** valid raw JSON.
                JSON Structure:
                {
                    "title": "Topic Title",
                    "description": "Short info...",
                    "revision_notes": "Markdown notes...",
                    "questions": [ 
                    {
                            "id": 1,
                            "question": "Question text...",
                            "options": {
                                "A": "...",
                                "B": "...",
                                "C": "...",
                                "D": "..."
                            },
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

        // Create a more robust JSON cleaner
        const cleanJson = (str: string) => {
            // Find the first '{' and last '}'
            const start = str.indexOf('{');
            const end = str.lastIndexOf('}');

            if (start === -1 || end === -1) return str;

            return str.substring(start, end + 1);
        };

        const cleanedText = cleanJson(text);

        // Parse JSON
        let data;
        try {
            data = JSON.parse(cleanedText);
        } catch (e) {
            console.error("Failed to parse AI JSON:", e);
            console.log("Failed Text Snippet:", text.substring(0, 500)); // Log part of text for debugging
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
                description: data.description,
                revision_notes: data.revision_notes, // New field
                questions: data.questions,
                duration: Math.max(15, Math.ceil(data.questions.length * 1.5)), // Dynamic duration
                marks_per_question: 4,
                negative_marks: -1,
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