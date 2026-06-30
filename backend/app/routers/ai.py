from fastapi import APIRouter, HTTPException, Depends, Body
from app.core.database import get_db
from app.core.config import settings
from supabase import Client
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from google import genai
from google.genai import types
# youtube_transcript_api and yt_dlp are lazily imported inside route functions
# to avoid loading 30-45MB of YouTube libs at server startup
import json
import re
import asyncio

router = APIRouter()

# Initialize Gemini Client using Google Cloud Vertex AI / Agent Platform
import os

client = None
try:
    if settings.GEMINI_API_KEY:
        client = genai.Client(
            vertexai=True,
            api_key=settings.GEMINI_API_KEY
        )
        print("Initialized google-genai client with Vertex AI using API key (Express Mode).")
    else:
        gcp_project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT") or "nkc-test-2-0"
        client = genai.Client(
            vertexai=True,
            project=gcp_project,
            location="us-central1"
        )
        print(f"Initialized google-genai client with Vertex AI (ADC). Project: {gcp_project}, Location: us-central1")
except Exception as e:
    print(f"Error initializing Vertex AI client: {e}")


class GenerateYoutubeRequest(BaseModel):
    url: str
    language: str = "English"
    creator_name: str
    creator_avatar: Optional[str] = None
    user_id: str 

class QuestionItem(BaseModel):
    id: str
    text: str

class GenerateTopicsRequest(BaseModel):
    questions: List[QuestionItem]

def extract_video_id(url: str) -> Optional[str]:
    """
    Extract YouTube video ID using yt-dlp for maximum compatibility.
    Handles all URL formats including:
    - Standard watch URLs: https://www.youtube.com/watch?v=VIDEO_ID
    - Live stream URLs: https://www.youtube.com/live/VIDEO_ID
    - Short URLs: https://youtu.be/VIDEO_ID
    - Embed URLs: https://www.youtube.com/embed/VIDEO_ID
    - Shorts: https://www.youtube.com/shorts/VIDEO_ID
    """
    try:
        import yt_dlp  # lazy-loaded: only used when YouTube URL is submitted
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'extract_flat': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract video info without downloading
            info = ydl.extract_info(url, download=False)
            
            if info and 'id' in info:
                video_id = info['id']
                # Validate that ID is exactly 11 characters (standard YouTube ID length)
                if len(video_id) == 11:
                    return video_id
                
            # Fallback: try to get ID from webpage URL if available
            if info and 'webpage_url' in info:
                # Try regex extraction on the canonical URL
                match = re.search(r'[?&]v=([0-9A-Za-z_-]{11})', info['webpage_url'])
                if match:
                    return match.group(1)
                    
    except Exception as e:  # catches yt_dlp.utils.DownloadError when lazy-loaded
        # Video might be private, deleted, or URL is invalid
        print(f"yt-dlp extraction error: {e}")
        
        # Fallback to regex-based extraction for common patterns
        regex_patterns = [
            r'(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&]|$)',  # Standard and live URLs
            r'youtu\.be\/([0-9A-Za-z_-]{11})(?:[?&]|$)',  # Short URLs
            r'embed\/([0-9A-Za-z_-]{11})(?:[?&]|$)',  # Embed URLs
            r'shorts\/([0-9A-Za-z_-]{11})(?:[?&]|$)',  # Shorts URLs
        ]
        
        for pattern in regex_patterns:
            match = re.search(pattern, url)
            if match and len(match.group(1)) == 11:
                return match.group(1)
                
    except Exception as e:
        print(f"Unexpected error extracting video ID: {e}")
        
    return None

def clean_json(text: str) -> str:
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1:
        return text
    return text[start:end+1]

@router.post("/generate/youtube")
async def generate_youtube_test(
    payload: GenerateYoutubeRequest,
    db: Client = Depends(get_db)
):
    if not client:
         raise HTTPException(status_code=500, detail="Server misconfigured: Vertex AI client not initialized")

    video_id = extract_video_id(payload.url)
    print(f"Extracted video ID: {video_id} from URL: {payload.url}")
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    transcript_text = ""
    used_method = "transcript"
    
    # 1. Fetch Transcript
    try:
        print(f"Attempting to fetch transcript for video ID: {video_id}")
        from youtube_transcript_api import YouTubeTranscriptApi  # lazy-loaded
        # Prefer English, Hindi, or auto
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'hi'])
        transcript_text = " ".join([t['text'] for t in transcript_list])
        print(f"Successfully fetched transcript. Length: {len(transcript_text)} characters")
    except Exception as e:
        print(f"Transcript Error: {e}. Falling back to Multimodal Video.")
        used_method = "video"

    # 2. Prepare Prompt & Content
    request_content = []
    
    if used_method == "transcript" and transcript_text:
        # Transcript Mode
        prompt = f"""
            You are an expert exam setter and educator.
            
            Task:
            1. Analyze the lecture transcript.
            2. **IMPORTANT**: Generate ALL content (Description, Revision Notes, Questions, Options) in **{payload.language}**.
            3. Extract metadata (Teacher, Subject, Exam Type) for a short description.
            3. Create **structured revision notes** (Markdown supported) that help a student revise before exams.
               - Use clear bullet points
               - Include formulas, keywords, shortcuts, and step-by-step logic where applicable
               - Highlight common mistakes or traps if mentioned
               - Keep language simple and exam-oriented
            4. **Generate as many MCQs as possible** (minimum 10) based strictly on the content.
            5. You can use LaTeX for mathematical equations (e.g., \\( E = mc^2 \\)). Markdown formatting is also supported to help you create the best test experience.

            IMPORTANT: Output **ONLY** valid raw JSON.
            
            JSON Structure:
            {{
                "title": "Topic or Video Title",
                "description": "Short info: Teacher Name | Subject | Exam Target (e.g. JEE/NEET/Board)",
                "revision_notes": "# Key Notes\\n* Point 1\\n* Formula...",
                "questions": [
                    {{
                        "id": 1,
                        "question": "Question text...",
                        "options": {{
                            "A": "...",
                            "B": "...",
                            "C": "...",
                            "D": "..."
                        }},
                        "correctAnswer": "A",
                        "marks": 1,
                        "negativeMarks": 0
                    }}
                ]
            }}

            Transcript:
            {transcript_text[:30000]}
        """
        request_content = {
            "role": "user",
            "parts": [{"text": prompt}]
        }
        
    else:
        # Multimodal Video Mode (Fallback)
        print("Using Multimodal Video Mode")
        prompt = f"""
            You are an expert exam setter.
            Analyze the visual video content efficiently from the content.
            1. Create a short description (Subject/Topic).
            2. **IMPORTANT**: Generate ALL content (Description, Revision Notes, Questions, Options) in **{payload.language}**.
            3. Create **structured revision notes** (Markdown supported) that help a student revise before exams.
               - Use clear bullet points
               - Include formulas, keywords, shortcuts, and step-by-step logic where applicable
               - Highlight common mistakes or traps if mentioned
               - Keep language simple and exam-oriented
            3. **Extract(if questions present in the video)** or **Generate as many MCQs as possible** (minimum 10) based strictly on the content.
            4. You can use LaTeX for mathematical equations (e.g., \\( E = mc^2 \\)). Markdown formatting is also supported to help you create the best test experience.



            Output **ONLY** valid raw JSON.
            JSON Structure:
            {{
                "title": "Topic Title",
                "description": "Short info...",
                "revision_notes": "Markdown notes...",
                "questions": [ 
                {{
                        "id": 1,
                        "question": "Question text...",
                        "options": {{
                            "A": "...",
                            "B": "...",
                            "C": "...",
                            "D": "..."
                        }},
                        "correctAnswer": "A",
                        "marks": 1,
                        "negativeMarks": 0
                    }}
                ]
            }}
        """
        # Construct Multimodal Payload for Gemini Python SDK
        # Use dict format with correct key names for video analysis
        # The Gemini model will fetch and analyze the video content from the URL
        request_content = {
            "role": "user",
            "parts": [
                {
                    "file_data": {
                        "mime_type": "video/mp4",
                        "file_uri": payload.url
                    }
                },
                {
                    "text": prompt
                }
            ]
        }
    
    # 3. Call Gemini with timeout
    try:
        print(f"Starting Gemini content generation for video: {payload.url}")
        print(f"Using method: {used_method}")
        
        # Generate content with timeout to prevent hanging
        # Use asyncio.to_thread to run blocking SDK call in separate thread
        print("Calling Gemini API...")
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.models.generate_content,
                model="gemini-3.5-flash",
                contents=request_content
            ),
            timeout=120.0
        )
        print("Gemini API call completed successfully")
        
        text = response.text if response.text else ""
        if not text:
            raise ValueError("Empty response from Gemini")
        
        # 3. Parse JSON
        cleaned = clean_json(text)
        data = json.loads(cleaned)
        
        # 4. Generate Custom ID (Simple logic for now, or match frontend logic)
        # We need a unique ID.
        # Let's fetch latest ID
        last_test = db.table("tests").select("custom_id").order("created_at", desc=True).limit(1).execute()
        next_id = "YT001"
        if last_test.data:
            lid = last_test.data[0].get("custom_id", "")
            if lid and lid.startswith("YT"):
                try:
                    num = int(lid.replace("YT", "")) + 1
                    next_id = f"YT{num:03d}"
                except:
                    pass
        
        # 5. Insert into DB
        test_insert = {
            "title": data.get("title", "Generated Test"),
            "description": data.get("description", ""),
            "revision_notes": data.get("revision_notes", ""),
            "questions": data.get("questions", []),
            "duration": len(data.get("questions", [])) * 1, # 1 min per q
            "custom_id": next_id,
            "created_by": payload.user_id,
            "creator_name": payload.creator_name,
            "creator_avatar": payload.creator_avatar,
            "is_public": True,
            "section_marking_model": "question-wise"
        }
        
        res = db.table("tests").insert(test_insert).execute()
        
        if res.data:
            return res.data[0]
            
        raise HTTPException(status_code=500, detail="Failed to save test")

    except asyncio.TimeoutError:
        print("AI Generation Error: Request timed out after 120 seconds")
        raise HTTPException(status_code=504, detail="AI Generation Failed: The video analysis is taking too long. Please try with a shorter video.")
    except Exception as e:
        print(f"AI Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Generation Failed: {str(e)}")

# --- PDF/Image Parsing Endpoint (Gemini Full-Page Vision Pipeline) ---
from fastapi import UploadFile, File, Query
from utils.logger import get_logger
# process_files is lazily imported inside the route to avoid loading heavy OCR libs at startup

logger = get_logger("ai_router")

@router.post("/parse")
async def parse_document(
    files: List[UploadFile] = File(..., description="Upload PDF or image files"),
    answer_key: Optional[UploadFile] = File(None, description="Optional answer key file (PDF or image)"),
    mode: str = Query("extract", pattern="^(extract|generate)$", description="Processing mode: 'extract' to keep exact questions, 'generate' to create new ones")
):
    """
    Parses uploaded PDF/image files and returns structured questions.
    Supports multiple files (images and/or PDFs) and an optional answer key for correct answer matching.
    
    Modes:
    - extract: Extract exact questions from the exam paper as-is
    - generate: Create new original MCQs based on the content
    """
    logger.info(f"Received {len(files)} file(s) for AI processing (mode: {mode})")
    
    if answer_key:
        logger.info(f"Answer key file received: {answer_key.filename}")
    
    try:
        # 1. Validation
        valid_extensions = ('.pdf', '.png', '.jpg', '.jpeg', '.webp')
        for file in files:
            if not file.filename or not file.filename.lower().endswith(valid_extensions):
                raise HTTPException(status_code=400, detail=f"Invalid file type: {file.filename}. Only PDF, PNG, JPG, JPEG, WEBP allowed.")
        
        if answer_key and answer_key.filename:
            if not answer_key.filename.lower().endswith(valid_extensions):
                raise HTTPException(status_code=400, detail="Invalid answer key file type. Only PDF and Images allowed.")

        # 2. Read Files
        file_data = []
        for file in files:
            content = await file.read()
            file_data.append({
                "filename": file.filename,
                "content": content,
                "content_type": file.content_type
            })
            logger.info(f"File '{file.filename}' size: {len(content)} bytes")
        
        # Read answer key if provided
        answer_key_data = None
        if answer_key:
            answer_key_content = await answer_key.read()
            answer_key_data = {
                "filename": answer_key.filename,
                "content": answer_key_content,
                "content_type": answer_key.content_type
            }
            logger.info(f"Answer key '{answer_key.filename}' size: {len(answer_key_content)} bytes")

        # 3. Run Vision Pipeline
        from ai_preview_importer.pdf_vision_pipeline import process_files  # lazy import
        result = await process_files(file_data, mode=mode, answer_key=answer_key_data)
        
        # 4. Return Result
        logger.info(f"Parsing complete ({mode} mode). Returning {len(result.get('questions', []))} questions.")
        return result

    except ValueError as ve:
        logger.error(f"Validation/Pipeline Error: {str(ve)}")
        raise HTTPException(status_code=500, detail=str(ve))
    except Exception as e:
        logger.error(f"Server Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


# --- ULTRA-FAST Streaming Endpoint with Real-Time Progress ---
from fastapi.responses import StreamingResponse
# process_files_stream is lazily imported inside the route to avoid loading heavy OCR libs at startup
import asyncio

@router.post("/parse-stream")
async def parse_document_stream(
    files: List[UploadFile] = File(..., description="Upload PDF or image files"),
    answer_key: Optional[UploadFile] = File(None, description="Optional answer key file (PDF or image)"),
    mode: str = Query("extract", pattern="^(extract|generate)$", description="Processing mode: 'extract' to keep exact questions, 'generate' to create new ones")
):
    """
    ULTRA-FAST streaming document parsing with real-time progress updates.
    Uses Server-Sent Events (SSE) to stream progress and extracted questions.
    
    Features:
    - Quality-based adaptive DPI (150/200/300)
    - Parallel batch processing (up to 15 concurrent)
    - Real-time progress updates
    - Progressive question streaming
    - 70-85% faster than standard endpoint
    
    Events:
    - progress: { stage, percent, message, data }
    - question: { type, question, batch }
    - complete: { final result }
    - error: { message }
    """
    logger.info(f"🚀 Starting ULTRA-FAST stream processing for {len(files)} file(s)")
    
    # IMPORTANT: Read ALL file content BEFORE starting the stream
    # FastAPI closes file handles after request handler returns
    valid_extensions = ('.pdf', '.png', '.jpg', '.jpeg', '.webp')
    file_data = []
    answer_key_data = None
    
    try:
        for file in files:
            if not file.filename or not file.filename.lower().endswith(valid_extensions):
                raise ValueError(f"Invalid file type: {file.filename}. Only PDF, PNG, JPG, JPEG, WEBP allowed.")
            
            content = await file.read()
            file_data.append({
                "filename": file.filename,
                "content": content,
                "content_type": file.content_type
            })
            logger.info(f"File '{file.filename}' size: {len(content)} bytes")
        
        # Process answer key if provided
        if answer_key:
            if not answer_key.filename.lower().endswith(valid_extensions):
                raise ValueError("Invalid answer key file type. Only PDF and Images allowed.")
            
            answer_key_content = await answer_key.read()
            answer_key_data = {
                "filename": answer_key.filename,
                "content": answer_key_content,
                "content_type": answer_key.content_type
            }
            logger.info(f"Answer key '{answer_key.filename}' size: {len(answer_key_content)} bytes")
            
    except ValueError as ve:
        logger.error(f"Validation Error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"File Read Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to read files: {str(e)}")
    
    async def event_generator():
        """Generate SSE events for the stream"""
        queue = asyncio.Queue()
        processing_complete = False
        final_result = None
        processing_error = None
        
        async def progress_callback(data):
            """Callback for progress updates"""
            await queue.put({
                'event': 'progress',
                'data': data
            })
        
        async def question_callback(data):
            """Callback for question streaming"""
            await queue.put({
                'event': 'question',
                'data': data
            })
        
        async def process_document():
            """Main processing function"""
            nonlocal processing_complete, final_result, processing_error
            
            try:
                # Use the new HYBRID pipeline (OCR + Vision + Streaming)
                from ai_preview_importer.hybrid_pipeline import process_files_hybrid_stream  # lazy import
                result = await process_files_hybrid_stream(
                    file_data,
                    mode=mode,
                    answer_key=answer_key_data,
                    progress_callback=progress_callback,
                    question_callback=question_callback,
                    max_concurrent=15
                )
                
                final_result = result
                processing_complete = True
                
                # Send completion event
                await queue.put({
                    'event': 'complete',
                    'data': result
                })
                
            except ValueError as ve:
                logger.error(f"Validation Error: {str(ve)}")
                processing_error = str(ve)
                await queue.put({
                    'event': 'error',
                    'data': {'message': str(ve), 'type': 'validation'}
                })
                processing_complete = True
                
            except Exception as e:
                logger.error(f"Processing Error: {str(e)}")
                processing_error = str(e)
                await queue.put({
                    'event': 'error',
                    'data': {'message': f"Processing failed: {str(e)}", 'type': 'server'}
                })
                processing_complete = True
        
        # Start processing in background
        asyncio.create_task(process_document())
        
        # Stream events with timeout
        start_time = asyncio.get_event_loop().time()
        max_duration = 600  # 10 minutes max
        
        while True:
            try:
                # Check timeout
                elapsed = asyncio.get_event_loop().time() - start_time
                if elapsed > max_duration:
                    yield f"event: error\ndata: {json.dumps({'message': 'Processing timeout - document too large', 'type': 'timeout'})}\n\n"
                    break
                
                # Wait for next event with shorter timeout to allow checking
                timeout = 1.0 if not processing_complete else 0.1
                event = await asyncio.wait_for(queue.get(), timeout=timeout)
                
                # Format as SSE
                yield f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
                
                # Exit on complete or error
                if event['event'] in ('complete', 'error'):
                    break
                    
            except asyncio.TimeoutError:
                # Send keepalive to prevent connection timeout
                if not processing_complete:
                    yield f": keepalive\n\n"
                else:
                    # Check if processing is done
                    break
            except Exception as e:
                logger.error(f"Stream error: {e}")
                yield f"event: error\ndata: {json.dumps({'message': f'Stream error: {str(e)}', 'type': 'stream'})}\n\n"
                break
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*"
        }
        )


@router.post("/generate/topics")
async def generate_topics(
    payload: GenerateTopicsRequest
):
    if not client:
        raise HTTPException(status_code=500, detail="Server misconfigured: Vertex AI client not initialized")
    
    if not payload.questions:
        return {"topics": {}}

    try:
        # Prepare the questions text for the prompt
        questions_text = "\n".join([f"ID: {q.id} | Question: {q.text}" for q in payload.questions])

        prompt = f"""
        You are an expert educational content analyzer. 
        Analyze the following questions and assign a specific, concise 'Topic' to each.
        The topic should be the primary subject matter (e.g., 'Kinematics', 'Ionic Equilibrium', 'Vectors', 'Cell Biology').
        Return the result as a raw JSON object where keys are the question IDs and values are the topic names.
        
        Questions:
        {questions_text}

        Return ONLY the JSON object. Example:
        {{
            "id1": "Topic A",
            "id2": "Topic B"
        }}
        """

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        if not response.text:
            raise HTTPException(status_code=500, detail="Gemini failed to generate content")

        topics_map = json.loads(clean_json(response.text))
        return {"topics": topics_map}

    except Exception as e:
        print(f"Error generating topics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class PredictRankRequest(BaseModel):
    test_title: str
    description: Optional[str] = None
    score: float
    total_marks: float
    difficulty: Optional[str] = "Medium"

@router.post("/predict-rank")
async def predict_rank(payload: PredictRankRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Server misconfigured: Vertex AI client not initialized")
    
    prompt = f"""
    You are an expert AI educational counselor.
    The student has taken a mock test titled "{payload.test_title}".
    Test Description: {payload.description or "N/A"}
    Difficulty: {payload.difficulty}
    Student Score: {payload.score} out of {payload.total_marks}
    
    Task: Search the internet for the most recent historical cutoffs, marks vs rank data, and statistics for this specific exam.
    Based on the student's score, predict their ALL INDIA RANK (AIR) or equivalent rank/percentile.
    
    IMPORTANT FORMAT RULES - Follow strictly:
    - Output ONLY a short result. No long paragraphs.
    - Line 1: "🏆 **Predicted AIR Range: X,XXX - Y,YYY**" (bolded rank range)
    - Line 2: "📊 **Estimated Percentile: XX.X%**"
    - Line 3: One short encouraging sentence (max 15 words).
    - Do NOT write any analysis, explanation, or historical data. Just the rank range and percentile.
    """
    
    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[{"google_search": {}}],
                temperature=0.7
            )
        )
        return {"rank_prediction": response.text}
    except Exception as e:
        logger.error(f"Rank Prediction Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ChatMessage(BaseModel):
    role: str
    content: str

class AIChatRequest(BaseModel):
    messages: List[ChatMessage]
    test_context: Dict[str, Any]


def _build_mentor_system_prompt(context: Dict[str, Any], past_history: List[Dict] = None) -> str:
    """Build a comprehensive, data-rich system prompt for the AI mentor."""
    
    # ── 1. Test Overview ──
    test_name = context.get('testName', 'Unknown Test')
    test_desc = context.get('testDescription', '')
    duration = context.get('duration', 0)
    total_qs = context.get('totalQuestions', 0)
    score = context.get('score', 0)
    total_marks = context.get('totalMarks', 0)
    correct = context.get('correct', 0)
    wrong = context.get('wrong', 0)
    skipped = context.get('skipped', 0)
    accuracy = context.get('accuracy', 0)
    percentage = context.get('percentage', 0)
    
    prompt = f"""You are **TestoZa AI**, an elite AI mentor and educational counselor. You have DEEP, COMPLETE access to this student's test data. You are not a generic chatbot — you are a **real mentor** with full knowledge of every question, every answer, and every mistake the student made.

═══════════════════════════════════════════
📋 CURRENT TEST: {test_name}
═══════════════════════════════════════════
{f'Description: {test_desc}' if test_desc else ''}
Duration: {duration} minutes | Total Questions: {total_qs}

📊 SCORE CARD:
• Score: {score} / {total_marks} ({percentage}%)
• Correct: {correct} | Wrong: {wrong} | Skipped: {skipped}
• Accuracy: {accuracy}%
"""

    # ── 2. Topic Analysis ──
    topic_analysis = context.get('topicAnalysis', [])
    if topic_analysis:
        prompt += "\n═══════════════════════════════════════════\n"
        prompt += "📈 TOPIC-WISE PERFORMANCE ANALYSIS:\n"
        prompt += "═══════════════════════════════════════════\n"
        
        weak_topics = []
        strong_topics = []
        moderate_topics = []
        
        for t in topic_analysis:
            name = t.get('name', 'Unknown')
            perf = t.get('performance', 'Weak')
            t_correct = t.get('correct', 0)
            t_wrong = t.get('wrong', 0)
            t_skipped = t.get('skipped', 0)
            t_score = t.get('score', 0)
            t_max = t.get('maxScore', 0)
            t_pct = t.get('percentage', 0)
            t_count = t.get('count', 0)
            
            emoji = "🟢" if perf == "Strong" else "🟡" if perf == "Moderate" else "🔴"
            prompt += f"  {emoji} {name}: {t_score}/{t_max} ({t_pct}%) — {t_correct}✓ {t_wrong}✗ {t_skipped}⊘ [{t_count} Qs] → {perf}\n"
            
            if perf == "Weak": weak_topics.append(name)
            elif perf == "Strong": strong_topics.append(name)
            else: moderate_topics.append(name)
        
        if weak_topics:
            prompt += f"\n⚠️ WEAK TOPICS REQUIRING ATTENTION: {', '.join(weak_topics)}\n"
        if strong_topics:
            prompt += f"✅ STRONG TOPICS: {', '.join(strong_topics)}\n"
        if moderate_topics:
            prompt += f"🔄 MODERATE TOPICS (can improve): {', '.join(moderate_topics)}\n"

    # ── 3. Section Performance ──
    section_perf = context.get('sectionPerformance', [])
    if section_perf and len(section_perf) > 1:
        prompt += "\n═══════════════════════════════════════════\n"
        prompt += "📑 SECTION-WISE PERFORMANCE:\n"
        prompt += "═══════════════════════════════════════════\n"
        for s in section_perf:
            s_name = s.get('name', 'Unknown')
            s_score = s.get('score', 0)
            s_max = s.get('maxScore', 0)
            s_pct = round((s_score / s_max * 100) if s_max > 0 else 0, 1)
            prompt += f"  • {s_name}: {s_score}/{s_max} ({s_pct}%) — {s.get('correct', 0)}✓ {s.get('wrong', 0)}✗ {s.get('skipped', 0)}⊘\n"

    # ── 4. Question-Level Detail (Wrong & Skipped Only — most actionable) ──
    question_details = context.get('questionDetails', [])
    if question_details:
        wrong_qs = [q for q in question_details if q.get('status') == 'wrong']
        skipped_qs = [q for q in question_details if q.get('status') == 'skipped']
        
        if wrong_qs:
            prompt += "\n═══════════════════════════════════════════\n"
            prompt += f"❌ WRONG ANSWERS ({len(wrong_qs)} questions):\n"
            prompt += "═══════════════════════════════════════════\n"
            for i, q in enumerate(wrong_qs[:30], 1):
                q_text = q.get('question', '')[:150]
                q_topic = q.get('topic', 'Uncategorized')
                correct_ans = q.get('correctAnswer', '?')
                user_ans = q.get('userAnswer', '?')
                q_type = q.get('type', 'single')
                options = q.get('options', {})
                
                prompt += f"\n  Q{q.get('id', i)}. [{q_topic}] ({q_type})\n"
                prompt += f"     Question: {q_text}\n"
                if options and q_type != 'numerical':
                    # Show option text for user answer and correct answer
                    user_option_text = options.get(str(user_ans), str(user_ans)) if user_ans else '?'
                    correct_option_text = options.get(str(correct_ans), str(correct_ans)) if correct_ans else '?'
                    prompt += f"     Student chose: ({user_ans}) {user_option_text[:80]}\n"
                    prompt += f"     Correct answer: ({correct_ans}) {correct_option_text[:80]}\n"
                else:
                    prompt += f"     Student answered: {user_ans} | Correct: {correct_ans}\n"
        
        if skipped_qs:
            prompt += f"\n⊘ SKIPPED QUESTIONS ({len(skipped_qs)}):\n"
            for q in skipped_qs[:15]:
                q_topic = q.get('topic', 'Uncategorized')
                prompt += f"  • Q{q.get('id', '?')} [{q_topic}]: {q.get('question', '')[:100]}\n"

    # ── 5. Past Exam History ──
    if past_history and len(past_history) > 0:
        prompt += "\n═══════════════════════════════════════════\n"
        prompt += f"📚 PAST EXAM HISTORY ({len(past_history)} recent attempts):\n"
        prompt += "═══════════════════════════════════════════\n"
        for i, attempt in enumerate(past_history, 1):
            a_title = attempt.get('test_title', 'Unknown')
            a_score = attempt.get('score', 0)
            a_date = attempt.get('created_at', '')[:10]
            prompt += f"  {i}. {a_title} — Score: {a_score} ({a_date})\n"
        prompt += "\nUse this history to identify trends, improvement patterns, and recurring weak areas.\n"

    # ── 6. Mentor Personality & Guidelines ──
    prompt += """
═══════════════════════════════════════════
🎯 YOUR ROLE & GUIDELINES:
═══════════════════════════════════════════

**Identity**: You are TestoZa AI — an experienced, warm, data-driven mentor. Think of yourself as a combination of a brilliant tutor and a caring older sibling who genuinely wants this student to succeed.

**Core Principles**:
1. **Be SPECIFIC** — Never give vague advice. Always reference actual question numbers, topic names, scores, and percentages from the data above.
2. **Be ACTIONABLE** — Every suggestion must be something the student can DO right now. "Study more" is BAD. "Spend 45 minutes solving 10 Kinematics problems focusing on projectile motion" is GOOD.
3. **Be HONEST but ENCOURAGING** — If performance is poor, acknowledge it kindly but don't sugarcoat. Pair every criticism with a concrete improvement path.
4. **Be DATA-DRIVEN** — When discussing weak topics, cite the exact score breakdown. When suggesting priorities, rank by impact (most wrong questions first).
5. **Be a REAL MENTOR** — Share study strategies, time management tips, exam-day techniques, and mental health advice when relevant.

**Response Format**:
- Use Markdown formatting with headers, bullet points, and emphasis.
- Format math equations using LaTeX (e.g., $E=mc^2$ or $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$).
- Use emojis sparingly for visual structure (✅ ❌ 📊 💡 🎯).
- Keep responses focused and scannable — use headers to organize if response is long.
- For study plans, use tables or numbered lists with specific time allocations.

**When asked about colleges/rank prediction**: Use your knowledge of Indian competitive exams (JEE, NEET, GATE, etc.) to give realistic estimates based on the score percentage marked. Always mention it's an estimate from a mock test.

**When explaining wrong answers**: Reference the exact question, show what the student chose vs. correct answer, and explain the concept briefly. If you can identify a pattern (e.g., careless errors vs. conceptual gaps), highlight it.

**When creating study plans**: Be hyper-specific. Include: which topics, how many hours, what type of practice (conceptual vs. numerical), and specific resources if possible.

**IMPORTANT**: You must NEVER make up data that isn't provided above. If you don't have certain information, say so.
"""
    
    return prompt


@router.post("/chat")
async def chat_with_ai(
    payload: AIChatRequest,
    db: Client = Depends(get_db)
):
    if not client:
        raise HTTPException(status_code=500, detail="Server misconfigured: Vertex AI client not initialized")
    
    context = payload.test_context
    
    # ── Fetch past exam history from database (if user ID provided) ──
    past_history = []
    user_id = context.get('userId')
    if user_id:
        try:
            from app.core.database import supabase as admin_db
            attempts_res = admin_db.table("user_tests")\
                .select("test_id, score, created_at")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(10)\
                .execute()
            
            if attempts_res.data:
                # Fetch test titles for these attempts
                test_ids = list(set([a["test_id"] for a in attempts_res.data if a.get("test_id")]))
                tests_map = {}
                if test_ids:
                    tests_res = admin_db.table("tests")\
                        .select("id, title")\
                        .in_("id", test_ids)\
                        .execute()
                    if tests_res.data:
                        tests_map = {t["id"]: t["title"] for t in tests_res.data}
                
                for attempt in attempts_res.data:
                    tid = attempt.get("test_id", "")
                    past_history.append({
                        "test_title": tests_map.get(tid, "Unknown Test"),
                        "score": attempt.get("score", 0),
                        "created_at": attempt.get("created_at", "")
                    })
        except Exception as e:
            logger.error(f"Error fetching past history for AI chat: {e}")
            # Non-critical, continue without history
    
    # ── Build comprehensive system prompt ──
    system_prompt = _build_mentor_system_prompt(context, past_history)
    
    contents = [{"role": "user", "parts": [{"text": system_prompt}]}]
    contents.append({"role": "model", "parts": [{"text": "Understood. I have full access to the student's test data including every question, answer, topic analysis, and performance metrics. I will act as TestoZa AI — their dedicated mentor. I'm ready to provide specific, data-driven guidance."}]})
    
    for msg in payload.messages:
        role = "user" if msg.role == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg.content}]})
        
    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-3.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.7
            )
        )
        return {"reply": response.text}
    except Exception as e:
        logger.error(f"AI Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
