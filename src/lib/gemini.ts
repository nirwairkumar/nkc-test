import { GoogleGenerativeAI } from "@google/generative-ai";
import supabase from './supabaseClient';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("Missing Gemini API Key in .env");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

// Helper to extract Video ID
function extractVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Helper to detect if it is a live video URL pattern
function isLiveVideo(url: string): boolean {
    return url.includes('/live/') || url.includes('live_stream');
}

// Fetch via local proxy to bypass CORS
async function fetchTranscript(videoId: string, signal?: AbortSignal): Promise<string> {
    try {
        console.log("Fetching video page via proxy...");
        const videoPageResponse = await fetch(`/api/yt/watch?v=${videoId}`, { signal });
        const videoPageHtml = await videoPageResponse.text();

        // Strategy 1: Look for "captionTracks" directly (common in some responses)
        let captionTracks = null;
        const captionTracksRegex = /"captionTracks":\s*(\[.*?\])/;
        const match = videoPageHtml.match(captionTracksRegex);

        if (match) {
            captionTracks = JSON.parse(match[1]);
        }

        // Strategy 2: Look for ytInitialPlayerResponse using robust brace counting
        if (!captionTracks) {
            const startToken = "ytInitialPlayerResponse = ";
            const startIdx = videoPageHtml.indexOf(startToken);

            if (startIdx !== -1) {
                let jsonStr = "";
                let braceCount = 0;
                let foundStart = false;

                // Start looking from after the token
                for (let i = startIdx + startToken.length; i < videoPageHtml.length; i++) {
                    const char = videoPageHtml[i];
                    if (char === '{') {
                        braceCount++;
                        foundStart = true;
                    } else if (char === '}') {
                        braceCount--;
                    }

                    if (foundStart) {
                        jsonStr += char;
                        if (braceCount === 0) break; // Found complete object
                    }
                }

                try {
                    const playerResponse = JSON.parse(jsonStr);
                    captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                } catch (e) {
                    console.error("Failed to parse extracted ytInitialPlayerResponse");
                }
            }
        }

        if (!captionTracks || captionTracks.length === 0) {
            // Check if it's an auto-generated caption issue or just missing
            console.log("No captionTracks found manually.");
            return "";
        }

        console.log(`Found ${captionTracks.length} caption tracks.`);

        // Priority: 
        // 1. Language Match (English/Hindi)
        // 2. English
        // 3. Hindi
        // 4. Any

        let track = captionTracks.find((t: any) => t.languageCode === 'en' && !t.kind);
        if (!track) track = captionTracks.find((t: any) => t.languageCode === 'en');
        if (!track) track = captionTracks.find((t: any) => t.languageCode === 'hi');
        if (!track) track = captionTracks[0];

        if (!track) return "";

        const transcriptUrl = track.baseUrl;
        console.log("Fetching transcript from:", transcriptUrl, "Lang:", track.languageCode);

        // Proxy the transcript URL
        const urlObj = new URL(transcriptUrl);
        const path = urlObj.pathname + urlObj.search;
        const finalUrl = `/api/yt${path}`;

        const transcriptResponse = await fetch(finalUrl, { signal });
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
        return "";
    }
}

export async function generateTestFromYouTube(url: string, userId: string, creatorName: string, creatorAvatar: string, language: string = 'English', signal?: AbortSignal) {
    if (!API_KEY) {
        throw new Error("Gemini API Key is missing. Please check .env file.");
    }

    try {
        if (signal?.aborted) throw new Error("Process cancelled");

        console.log("Processing video URL:", url);
        const videoId = extractVideoId(url);

        if (!videoId) {
            throw new Error("Invalid YouTube URL");
        }

        const isLive = isLiveVideo(url);
        let transcriptText = "";

        // Always try transcript first, but for Live videos it's Mandatory
        transcriptText = await fetchTranscript(videoId, signal);

        let usedMethod = "transcript";

        if (isLive) {
            if (!transcriptText || transcriptText.length < 50) {
                throw new Error("Live-streamed videos require captions to be enabled. No transcript found.");
            }
            console.log("Live Video Detected: Forced Transcript Mode.");
        } else {
            // Normal video fallback logic
            if (!transcriptText || transcriptText.length < 50) {
                console.log("Transcript failed or empty. Attempting direct video processing (Multimodal)...");
                usedMethod = "video";
            } else {
                if (transcriptText.length > 30000) {
                    transcriptText = transcriptText.slice(0, 30000);
                }
                console.log("Using Transcript-based Generation. Length:", transcriptText.length);
            }
        }

        if (signal?.aborted) throw new Error("Process cancelled");

        // Use Gemini 3.0 Pro Preview as requested/restored
        const model = genAI.getGenerativeModel({
            model: "gemini-3-pro-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        let prompt;
        let requestContent;

        if (usedMethod === "transcript") {
            const contextType = isLive ? "YouTube LIVE lecture transcript" : "lecture transcript";

            prompt = `
            You are an expert exam setter and educator.
            
            Task:
            1. Analyze the ${contextType}.
            2. **IMPORTANT**: Generate ALL content (Description, Revision Notes, Questions, Options) in **${language}**.
            3. Extract metadata (Teacher, Subject, Exam Type) for a short description.
            3. Create **structured revision notes** (Markdown supported) that help a student revise before exams.
               - Use clear bullet points
               - Include formulas, keywords, shortcuts, and step-by-step logic where applicable
               - Highlight common mistakes or traps if mentioned
               - Keep language simple and exam-oriented
            4. **Extract(if questions present in the video)** or **Generate as many MCQs as possible** (minimum 10) based strictly on the content.
            
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
            // MULTIMODAL FALLBACK - ONLY FOR NORMAL VIDEOS
            prompt = `
                You are an expert exam setter.
                Analyze the visual video content efficiently.
                1. Create a short description (Subject/Topic).
                2. **IMPORTANT**: Generate ALL content (Description, Revision Notes, Questions, Options) in **${language}**.
                3. Create **structured revision notes** (Markdown supported) that help a student revise before exams.
                   - Use clear bullet points
                   - Include formulas, keywords, shortcuts, and step-by-step logic where applicable
                   - Highlight common mistakes or traps if mentioned
                   - Keep language simple and exam-oriented
                3. **Extract(if questions present in the video)** or **Generate as many MCQs as possible** (minimum 10) based strictly on the content.

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

        if (signal?.aborted) throw new Error("Process cancelled");

        const cleanJson = (str: string) => {
            const start = str.indexOf('{');
            const end = str.lastIndexOf('}');
            if (start === -1 || end === -1) return str;
            return str.substring(start, end + 1);
        };

        const cleanedText = cleanJson(text);

        let data;
        try {
            data = JSON.parse(cleanedText);
        } catch (e) {
            console.error("Failed to parse AI JSON:", e);
            throw new Error("AI generated invalid data format. Please try again or use a different video.");
        }

        console.log("AI Generation complete:", data.title);

        if (!data.questions || data.questions.length === 0) {
            throw new Error("AI discovered no questions content. Try a longer educational video.");
        }

        if (signal?.aborted) throw new Error("Process cancelled");

        const { getNextTestId } = await import('./testsApi');
        const customId = await getNextTestId('YT');

        const { data: insertedData, error } = await supabase
            .from('tests')
            .insert({
                title: data.title,
                description: data.description,
                revision_notes: data.revision_notes,
                questions: data.questions,
                duration: Math.ceil(data.questions.length * 1),
                marks_per_question: 1,
                negative_marks: 0,
                custom_id: customId,
                created_by: userId,
                creator_name: creatorName,
                creator_avatar: creatorAvatar,
                is_public: true
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