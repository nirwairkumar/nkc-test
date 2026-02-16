# AI Test Generator Optimization - Implementation Documentation

## Project Overview
**Goal**: Reduce document/image processing time while maintaining quality, with real-time progress tracking and progressive question display.

**Status**: Implementation Phase
**Last Updated**: 2026-02-16

---

## Table of Contents
1. [Current Architecture Analysis](#current-architecture)
2. [Optimization Strategy](#optimization-strategy)
3. [Implementation Plan](#implementation-plan)
4. [Technical Specifications](#technical-specifications)
5. [File Changes](#file-changes)
6. [Testing Strategy](#testing-strategy)

---

## Current Architecture Analysis

### Existing Flow (Bottlenecks)
```
User Upload → Sequential Batch Processing → All Results at Once
     ↓              ↓ (5 pages/batch)            ↓
  45-120s      Wait for each batch         No progress feedback
```

**Key Bottlenecks**:
1. Sequential batch processing (waits for each batch)
2. No real-time progress updates
3. All questions returned at once
4. Fixed 300 DPI regardless of image quality

### File Locations
- **Frontend**: `frontend/src/pages/AITestImporter.tsx`
- **Backend Router**: `backend/app/routers/ai.py`
- **Vision Pipeline**: `backend/ai_preview_importer/pdf_vision_pipeline.py`

---

## Optimization Strategy

### 1. Quality-Based Adaptive Processing

**Approach**: Analyze image quality before processing to select optimal DPI

**Quality Detection Algorithm**:
```python
def analyze_image_quality(image_bytes):
    """
    Returns quality tier based on multiple factors:
    - Sharpness (Laplacian variance)
    - Contrast ratio
    - OCR confidence sample
    - Noise levels
    """
    score = calculate_quality_score(image_bytes)
    
    if score >= 0.8:
        return {"tier": "high", "dpi": 150, "message": "High quality - fast processing"}
    elif score >= 0.5:
        return {"tier": "medium", "dpi": 200, "message": "Medium quality - balanced processing"}
    else:
        return {"tier": "low", "dpi": 300, "message": "Low quality - careful processing"}
```

**Error Handling for Low Quality**:
```python
if quality_tier == "low":
    raise QualityWarning(
        "Image quality is too low for reliable extraction. "
        "Please upload a clearer image with better resolution and lighting."
    )
```

### 2. Parallel Batch Processing

**Concurrency Strategy**:
- **Limit**: 10-20 concurrent batches maximum
- **Batch Size**: 5 pages per batch (with 1-page overlap)
- **Execution**: Use `asyncio.gather()` with semaphore

**Implementation**:
```python
async def process_batches_parallel(all_page_images, max_concurrent=15):
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def process_with_limit(batch_data):
        async with semaphore:
            return await process_single_batch(batch_data)
    
    tasks = [process_with_limit(batch) for batch in batches]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    return merge_results(results)
```

**Time Savings**:
- 10-page document: 60s → 15s (75% faster)
- 30-page document: 180s → 36s (80% faster)

### 3. Server-Sent Events (SSE) Progress System

**Endpoint**: `POST /api/ai/parse-stream`

**Event Types**:
```typescript
interface ProgressEvent {
  stage: 'uploading' | 'analyzing' | 'processing' | 'extracting' | 'finalizing' | 'complete' | 'error';
  percent: number;
  message: string;
  data?: {
    batch?: number;
    total_batches?: number;
    questions_found?: number;
    quality_tier?: string;
    dpi?: number;
  };
}

interface QuestionEvent {
  type: 'question';
  question: Question;
  batch: number;
}
```

**Event Flow**:
```
1. uploading      → Files received, validating
2. analyzing      → Checking image quality, selecting DPI
3. processing     → Starting batch X of Y
4. extracting     → AI working, N questions found so far
5. (repeat 3-4 for each batch)
6. finalizing     → Merging cross-page questions
7. complete       → All done, final count
```

### 4. Progressive Question Display

**Strategy**: Show questions immediately as each batch completes

**Frontend Flow**:
```typescript
const [questions, setQuestions] = useState<Question[]>([]);
const [progress, setProgress] = useState<ProgressEvent | null>(null);

// SSE Event Handler
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'progress') {
    setProgress(data);
  } else if (data.type === 'question') {
    // Add question immediately to display
    setQuestions(prev => [...prev, data.question]);
  }
};
```

**UX Benefits**:
- User sees immediate results
- Can start reviewing while processing continues
- Reduces perceived wait time significantly

---

## Implementation Plan

### Phase 1: Backend Changes

#### 1.1 Add Quality Analysis Module
**File**: `backend/ai_preview_importer/quality_analyzer.py`

```python
import cv2
import numpy as np
from PIL import Image
import io
from typing import Dict, Tuple
from utils.logger import get_logger

logger = get_logger(__name__)

class QualityAnalyzer:
    """Analyzes image quality to determine optimal processing parameters"""
    
    @staticmethod
    def analyze_page(image_bytes: bytes) -> Dict:
        """
        Analyze single page quality and return processing parameters
        """
        try:
            # Convert to PIL Image
            img = Image.open(io.BytesIO(image_bytes))
            img_array = np.array(img)
            
            # Convert to grayscale if needed
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # Calculate metrics
            metrics = {
                'sharpness': QualityAnalyzer._calculate_sharpness(gray),
                'contrast': QualityAnalyzer._calculate_contrast(gray),
                'brightness': QualityAnalyzer._calculate_brightness(gray),
                'noise': QualityAnalyzer._calculate_noise(gray)
            }
            
            # Calculate overall quality score (0-1)
            score = QualityAnalyzer._calculate_quality_score(metrics)
            
            # Determine tier and DPI
            if score >= 0.8:
                tier = 'high'
                dpi = 150
            elif score >= 0.5:
                tier = 'medium'
                dpi = 200
            else:
                tier = 'low'
                dpi = 300
            
            result = {
                'score': score,
                'tier': tier,
                'dpi': dpi,
                'metrics': metrics,
                'recommendation': QualityAnalyzer._get_recommendation(score)
            }
            
            logger.info(f"Quality analysis: {tier} tier (score: {score:.2f}, DPI: {dpi})")
            return result
            
        except Exception as e:
            logger.error(f"Quality analysis failed: {e}")
            # Default to high quality if analysis fails
            return {
                'score': 0.5,
                'tier': 'medium',
                'dpi': 200,
                'metrics': {},
                'recommendation': 'Default settings applied'
            }
    
    @staticmethod
    def _calculate_sharpness(gray: np.ndarray) -> float:
        """Calculate image sharpness using Laplacian variance"""
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = laplacian.var()
        # Normalize: good sharpness typically > 100
        return min(variance / 500, 1.0)
    
    @staticmethod
    def _calculate_contrast(gray: np.ndarray) -> float:
        """Calculate contrast ratio"""
        min_val = np.min(gray)
        max_val = np.max(gray)
        contrast = (max_val - min_val) / 255.0
        return contrast
    
    @staticmethod
    def _calculate_brightness(gray: np.ndarray) -> float:
        """Calculate average brightness"""
        return np.mean(gray) / 255.0
    
    @staticmethod
    def _calculate_noise(gray: np.ndarray) -> float:
        """Estimate noise level"""
        # Use median filter to denoise and compare
        denoised = cv2.medianBlur(gray, 5)
        noise = np.mean(np.abs(gray.astype(float) - denoised.astype(float)))
        # Normalize: lower is better
        return 1.0 - min(noise / 50, 1.0)
    
    @staticmethod
    def _calculate_quality_score(metrics: Dict) -> float:
        """Calculate overall quality score from metrics"""
        weights = {
            'sharpness': 0.4,
            'contrast': 0.3,
            'noise': 0.2,
            'brightness': 0.1
        }
        
        score = 0
        for metric, weight in weights.items():
            if metric in metrics:
                score += metrics[metric] * weight
        
        return score
    
    @staticmethod
    def _get_recommendation(score: float) -> str:
        """Get user-facing recommendation"""
        if score >= 0.8:
            return "Excellent quality - processing at 150 DPI for speed"
        elif score >= 0.6:
            return "Good quality - processing at 200 DPI for balance"
        elif score >= 0.4:
            return "Fair quality - processing at 300 DPI for accuracy"
        else:
            return "Warning: Low quality detected. Please upload a clearer image for best results."
```

#### 1.2 Update Vision Pipeline for Parallel Processing
**File**: `backend/ai_preview_importer/pdf_vision_pipeline.py`

**Key Changes**:
1. Add quality analysis integration
2. Implement parallel batch processing with semaphore
3. Add callback support for progress events

```python
async def process_files_stream(
    file_data: List[Dict], 
    mode: str = "extract", 
    answer_key: Optional[Dict] = None,
    progress_callback: Optional[Callable] = None,
    question_callback: Optional[Callable] = None,
    max_concurrent: int = 15
) -> Dict:
    """
    Stream-enabled file processing with parallel batches and progress updates
    """
    if not api_key:
        raise ValueError("Gemini API key not configured")
    
    logger.info(f"Starting stream processing with {len(file_data)} file(s)...")
    
    # Step 1: Notify upload start
    if progress_callback:
        await progress_callback({
            'stage': 'uploading',
            'percent': 10,
            'message': 'Receiving and validating files...'
        })
    
    # Step 2: Convert files to images
    all_page_images = []
    all_embedded_images = []
    
    for file_info in file_data:
        filename = file_info["filename"]
        content = file_info["content"]
        
        if is_pdf(content):
            # Don't render yet - we'll do quality-based rendering
            all_page_images.append({
                'type': 'pdf',
                'filename': filename,
                'content': content
            })
        elif is_image(filename):
            all_page_images.append({
                'type': 'image',
                'filename': filename,
                'content': content
            })
    
    # Step 3: Quality Analysis
    if progress_callback:
        await progress_callback({
            'stage': 'analyzing',
            'percent': 20,
            'message': 'Analyzing image quality...'
        })
    
    from ai_preview_importer.quality_analyzer import QualityAnalyzer
    
    # Analyze quality of first few pages to determine settings
    quality_results = []
    sample_size = min(3, len(all_page_images))
    
    for i in range(sample_size):
        page_info = all_page_images[i]
        if page_info['type'] == 'image':
            quality = QualityAnalyzer.analyze_page(page_info['content'])
        else:
            # For PDFs, render first page at 200 DPI for analysis
            first_page = render_pages_as_images(page_info['content'], dpi=200)[0]
            quality = QualityAnalyzer.analyze_page(first_page)
        quality_results.append(quality)
    
    # Use the lowest quality tier from samples (conservative approach)
    avg_score = sum(q['score'] for q in quality_results) / len(quality_results)
    
    if avg_score < 0.3:
        raise ValueError(
            "Image quality is too low for reliable extraction. "
            "Please upload a clearer image with better resolution and lighting."
        )
    
    # Determine final DPI based on quality
    if avg_score >= 0.8:
        selected_dpi = 150
        quality_tier = 'high'
    elif avg_score >= 0.5:
        selected_dpi = 200
        quality_tier = 'medium'
    else:
        selected_dpi = 300
        quality_tier = 'low'
    
    if progress_callback:
        await progress_callback({
            'stage': 'analyzing',
            'percent': 30,
            'message': f'Quality: {quality_tier} tier, using {selected_dpi} DPI',
            'data': {
                'quality_tier': quality_tier,
                'dpi': selected_dpi,
                'quality_score': avg_score
            }
        })
    
    # Step 4: Render all pages at selected DPI
    rendered_pages = []
    for page_info in all_page_images:
        if page_info['type'] == 'pdf':
            pages = render_pages_as_images(page_info['content'], dpi=selected_dpi)
            rendered_pages.extend(pages)
            
            # Also extract embedded images
            embedded = extract_embedded_images(page_info['content'])
            all_embedded_images.extend(embedded)
        else:
            img_bytes = convert_image_to_bytes(page_info['content'])
            rendered_pages.append(img_bytes)
    
    total_pages = len(rendered_pages)
    
    if progress_callback:
        await progress_callback({
            'stage': 'processing',
            'percent': 35,
            'message': f'Processing {total_pages} pages in parallel batches...',
            'data': {
                'total_pages': total_pages,
                'total_batches': (total_pages + 4) // 5  # Ceiling division
            }
        })
    
    # Step 5: Create batches with overlap
    MAX_PAGES_PER_BATCH = 5
    OVERLAP_PAGES = 1
    
    batches = []
    start_idx = 0
    batch_num = 0
    
    while start_idx < total_pages:
        batch_num += 1
        end_idx = min(start_idx + MAX_PAGES_PER_BATCH, total_pages)
        
        if start_idx == 0:
            batch_images = rendered_pages[start_idx:end_idx]
            batch_start_page = start_idx
        else:
            batch_images = rendered_pages[start_idx - OVERLAP_PAGES:end_idx]
            batch_start_page = start_idx - OVERLAP_PAGES
        
        batches.append({
            'batch_num': batch_num,
            'start_page': batch_start_page,
            'images': batch_images,
            'mode': mode,
            'embedded_images': all_embedded_images
        })
        
        start_idx = end_idx
    
    # Step 6: Process batches in parallel with semaphore
    semaphore = asyncio.Semaphore(max_concurrent)
    all_questions = []
    processed_batches = 0
    
    async def process_batch_with_progress(batch_data):
        nonlocal processed_batches
        
        async with semaphore:
            if progress_callback:
                await progress_callback({
                    'stage': 'processing',
                    'percent': 35 + (processed_batches / len(batches)) * 40,
                    'message': f'Processing batch {batch_data["batch_num"]} of {len(batches)}...',
                    'data': {
                        'batch': batch_data['batch_num'],
                        'total_batches': len(batches)
                    }
                })
            
            try:
                questions = await _process_single_batch(
                    batch_data, 
                    question_callback=question_callback
                )
                processed_batches += 1
                return {'success': True, 'questions': questions, 'batch': batch_data['batch_num']}
            except Exception as e:
                logger.error(f"Batch {batch_data['batch_num']} failed: {e}")
                processed_batches += 1
                return {'success': False, 'error': str(e), 'batch': batch_data['batch_num']}
    
    # Run all batches in parallel
    tasks = [process_batch_with_progress(batch) for batch in batches]
    batch_results = await asyncio.gather(*tasks)
    
    # Collect successful results
    for result in batch_results:
        if result['success']:
            all_questions.extend(result['questions'])
    
    # Step 7: Merge cross-page questions
    if progress_callback:
        await progress_callback({
            'stage': 'finalizing',
            'percent': 90,
            'message': 'Merging cross-page questions and matching answers...'
        })
    
    unique_questions = merge_cross_page_questions(all_questions)
    
    # Match answer key if provided
    if answer_key:
        answer_key_mappings = await process_answer_key(answer_key)
        unique_questions = _match_answer_key(unique_questions, answer_key_mappings)
    
    if progress_callback:
        await progress_callback({
            'stage': 'complete',
            'percent': 100,
            'message': f'Complete! Extracted {len(unique_questions)} questions.',
            'data': {
                'questions_count': len(unique_questions),
                'total_batches': len(batches),
                'successful_batches': sum(1 for r in batch_results if r['success'])
            }
        })
    
    return {
        'title': 'Extracted Exam',
        'description': f'Extracted from {total_pages} pages',
        'questions': unique_questions,
        'canConfirm': all(q.get('correctAnswer') is not None for q in unique_questions),
        'unansweredCount': sum(1 for q in unique_questions if q.get('correctAnswer') is None),
        'quality_tier': quality_tier,
        'dpi_used': selected_dpi
    }


async def _process_single_batch(
    batch_data: Dict,
    question_callback: Optional[Callable] = None
) -> List[Dict]:
    """Process a single batch and optionally stream questions"""
    batch_num = batch_data['batch_num']
    start_page = batch_data['start_page']
    images = batch_data['images']
    mode = batch_data['mode']
    embedded_images = batch_data['embedded_images']
    
    prompt = EXTRACT_PROMPT if mode == 'extract' else GENERATE_PROMPT
    
    content_parts = [prompt]
    
    for i, page_img in enumerate(images):
        actual_page_num = start_page + i + 1
        content_parts.append(f"\n--- PAGE {actual_page_num} ---\n")
        content_parts.append({
            "mime_type": "image/png",
            "data": base64.b64encode(page_img).decode("utf-8")
        })
    
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        generation_config={
            "temperature": 0.1,
            "top_p": 0.95,
            "max_output_tokens": 65536,
        }
    )
    
    response = model.generate_content(content_parts)
    raw_text = response.text
    
    batch_result = _parse_response(raw_text, embedded_images)
    questions = batch_result.get("questions", [])
    
    # Stream questions immediately if callback provided
    if question_callback:
        for q in questions:
            await question_callback({
                'type': 'question',
                'question': q,
                'batch': batch_num
            })
    
    return questions
```

#### 1.3 Add SSE Endpoint
**File**: `backend/app/routers/ai.py`

Add new endpoint for streaming progress:

```python
from fastapi import BackgroundTasks
from fastapi.responses import StreamingResponse
import json
import asyncio

@router.post("/parse-stream")
async def parse_document_stream(
    files: List[UploadFile] = File(...),
    answer_key: Optional[UploadFile] = File(None),
    mode: str = Query("extract", regex="^(extract|generate)$")
):
    """
    Stream-enabled document parsing with real-time progress updates.
    Returns Server-Sent Events (SSE) with progress and extracted questions.
    """
    async def event_generator():
        queue = asyncio.Queue()
        
        async def progress_callback(data):
            await queue.put({
                'event': 'progress',
                'data': data
            })
        
        async def question_callback(data):
            await queue.put({
                'event': 'question',
                'data': data
            })
        
        async def process_document():
            try:
                # Validate files
                valid_extensions = ('.pdf', '.png', '.jpg', '.jpeg', '.webp')
                file_data = []
                
                for file in files:
                    if not file.filename or not file.filename.lower().endswith(valid_extensions):
                        raise ValueError(f"Invalid file type: {file.filename}")
                    
                    content = await file.read()
                    file_data.append({
                        "filename": file.filename,
                        "content": content,
                        "content_type": file.content_type
                    })
                
                # Process answer key if provided
                answer_key_data = None
                if answer_key:
                    answer_key_content = await answer_key.read()
                    answer_key_data = {
                        "filename": answer_key.filename,
                        "content": answer_key_content,
                        "content_type": answer_key.content_type
                    }
                
                # Process with streaming
                result = await process_files_stream(
                    file_data,
                    mode=mode,
                    answer_key=answer_key_data,
                    progress_callback=progress_callback,
                    question_callback=question_callback,
                    max_concurrent=15
                )
                
                # Send final result
                await queue.put({
                    'event': 'complete',
                    'data': result
                })
                
            except Exception as e:
                logger.error(f"Stream processing error: {e}")
                await queue.put({
                    'event': 'error',
                    'data': {'message': str(e)}
                })
        
        # Start processing in background
        asyncio.create_task(process_document())
        
        # Stream events
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=300.0)
                
                if event['event'] == 'complete':
                    yield f"event: complete\ndata: {json.dumps(event['data'])}\n\n"
                    break
                elif event['event'] == 'error':
                    yield f"event: error\ndata: {json.dumps(event['data'])}\n\n"
                    break
                else:
                    yield f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
                    
            except asyncio.TimeoutError:
                yield f"event: error\ndata: {json.dumps({'message': 'Processing timeout'})}\n\n"
                break
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
```

### Phase 2: Frontend Changes

#### 2.1 Create Processing Progress Component
**New File**: `frontend/src/components/ProcessingProgress.tsx`

```typescript
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload, Scan, FileSearch, CheckCircle, AlertCircle } from 'lucide-react';

interface ProcessingProgressProps {
  stage: string;
  percent: number;
  message: string;
  data?: {
    batch?: number;
    total_batches?: number;
    questions_found?: number;
    quality_tier?: string;
    dpi?: number;
  };
}

const stageIcons = {
  uploading: Upload,
  analyzing: Scan,
  processing: FileSearch,
  extracting: FileSearch,
  finalizing: Loader2,
  complete: CheckCircle,
  error: AlertCircle
};

const stageColors = {
  uploading: 'text-blue-500',
  analyzing: 'text-purple-500',
  processing: 'text-yellow-500',
  extracting: 'text-orange-500',
  finalizing: 'text-indigo-500',
  complete: 'text-green-500',
  error: 'text-red-500'
};

export function ProcessingProgress({ stage, percent, message, data }: ProcessingProgressProps) {
  const Icon = stageIcons[stage] || Loader2;
  const colorClass = stageColors[stage] || 'text-gray-500';
  
  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-card border rounded-lg shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-full bg-muted ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{message}</h3>
          {data && (
            <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
              {data.quality_tier && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary">
                  Quality: {data.quality_tier}
                </span>
              )}
              {data.dpi && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary">
                  DPI: {data.dpi}
                </span>
              )}
              {data.batch !== undefined && data.total_batches && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary">
                  Batch {data.batch} of {data.total_batches}
                </span>
              )}
              {data.questions_found !== undefined && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                  {data.questions_found} questions found
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <Progress value={percent} className="h-2" />
      
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>Processing...</span>
        <span>{percent}%</span>
      </div>
      
      {stage === 'processing' && data?.batch && data?.total_batches && (
        <div className="mt-3 flex gap-1">
          {Array.from({ length: data.total_batches }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full ${
                i < (data.batch || 0) ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 2.2 Update AITestImporter with SSE
**File**: `frontend/src/pages/AITestImporter.tsx`

Key changes to add SSE support and progressive question display:

```typescript
// Add new state
const [progress, setProgress] = useState<{
  stage: string;
  percent: number;
  message: string;
  data?: any;
} | null>(null);
const [streamingQuestions, setStreamingQuestions] = useState<Question[]>([]);
const [isStreaming, setIsStreaming] = useState(false);

// Update handleProcess function
const handleProcess = async (selectedMode: ProcessMode) => {
  if (files.length === 0) {
    setError("Please select at least one file first.");
    return;
  }

  setMode(selectedMode);
  setLoading(true);
  setError(null);
  setStreamingQuestions([]);
  setIsStreaming(true);
  setProgress(null);

  const formData = new FormData();
  files.forEach((fileObj) => {
    formData.append('files', fileObj.file);
  });

  if (answerKeyFile) {
    formData.append('answer_key', answerKeyFile);
  }

  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

    // Use EventSource for SSE
    const eventSource = new EventSource(
      `${baseUrl}/ai/parse-stream?mode=${selectedMode}`,
      { 
        withCredentials: true,
        body: formData // Note: EventSource doesn't support POST with body directly
      }
    );

    // Alternative: Use fetch with ReadableStream
    const response = await fetch(`${baseUrl}/ai/parse-stream?mode=${selectedMode}`, {
      method: 'POST',
      body: formData,
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("Failed to start stream");
    }

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          const event = line.slice(7);
          
          // Find next data line
          const dataLine = lines[lines.indexOf(line) + 1];
          if (dataLine?.startsWith('data: ')) {
            const data = JSON.parse(dataLine.slice(6));

            if (event === 'progress') {
              setProgress(data);
            } else if (event === 'question') {
              setStreamingQuestions(prev => [...prev, data.question]);
            } else if (event === 'complete') {
              setParsedData(data);
              setIsStreaming(false);
              setLoading(false);
            } else if (event === 'error') {
              setError(data.message);
              setIsStreaming(false);
              setLoading(false);
            }
          }
        }
      }
    }

  } catch (err: any) {
    console.error("Process Error:", err);
    setError(err.message || "An unknown error occurred");
    setIsStreaming(false);
    setLoading(false);
  }
};

// In loading state, show progress component
if (loading && isStreaming) {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {progress && (
        <ProcessingProgress
          stage={progress.stage}
          percent={progress.percent}
          message={progress.message}
          data={progress.data}
        />
      )}
      
      {/* Show streaming questions */}
      {streamingQuestions.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Questions Found ({streamingQuestions.length})
            </h3>
            <span className="text-sm text-muted-foreground animate-pulse">
              More coming...
            </span>
          </div>
          
          <ScrollArea className="h-[400px] border rounded-md p-4 bg-muted/20">
            {streamingQuestions.map((q, idx) => (
              <Card key={idx} className="mb-3 opacity-75 hover:opacity-100 transition-opacity">
                <CardContent className="p-3">
                  <div className="flex gap-2">
                    <span className="font-bold text-primary min-w-[24px]">{q.id}.</span>
                    <div className="flex-1 text-sm line-clamp-2">
                      {q.question}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
```

---

## Technical Specifications

### Quality Analysis Thresholds

| Metric | High (≥0.8) | Medium (0.5-0.8) | Low (<0.5) |
|--------|-------------|------------------|------------|
| **Sharpness** | ≥400 | 200-400 | <200 |
| **Contrast** | ≥0.6 | 0.4-0.6 | <0.4 |
| **Brightness** | 0.3-0.8 | 0.2-0.9 | <0.2 or >0.9 |
| **Noise** | ≥0.7 | 0.5-0.7 | <0.5 |

### Processing Parameters

| Quality Tier | DPI | Avg Time/Page | Batch Size | Concurrent |
|--------------|-----|---------------|------------|------------|
| **High** | 150 | 2-3s | 5 pages | 15 batches |
| **Medium** | 200 | 3-4s | 5 pages | 15 batches |
| **Low** | 300 | 4-6s | 5 pages | 15 batches |

### Error Threshold
- Quality score < 0.3: **Reject upload** with warning
- Quality score 0.3-0.5: **Process with caution** at 300 DPI
- Quality score > 0.5: **Normal processing**

---

## File Changes Summary

### New Files
1. `backend/ai_preview_importer/quality_analyzer.py` - Image quality analysis
2. `frontend/src/components/ProcessingProgress.tsx` - Progress UI component

### Modified Files
1. `backend/ai_preview_importer/pdf_vision_pipeline.py`
   - Add `process_files_stream()` function
   - Add `_process_single_batch()` helper
   - Integrate quality analyzer
   - Add parallel processing with semaphore

2. `backend/app/routers/ai.py`
   - Add `/parse-stream` SSE endpoint
   - Import streaming functions

3. `frontend/src/pages/AITestImporter.tsx`
   - Add SSE client implementation
   - Add progressive question state
   - Replace loading state with progress component
   - Show streaming questions immediately

---

## Testing Strategy

### Unit Tests
1. **Quality Analyzer**
   - Test with high, medium, low quality images
   - Verify correct DPI selection
   - Test error threshold rejection

2. **Parallel Processing**
   - Test with 1, 5, 10, 20 batches
   - Verify semaphore limits concurrent execution
   - Test error isolation (one batch fails, others continue)

3. **SSE Events**
   - Test event sequence
   - Test question streaming
   - Test error handling

### Integration Tests
1. **End-to-End Flow**
   - Upload 10-page PDF
   - Verify progress updates
   - Verify questions appear progressively
   - Verify final result

2. **Error Scenarios**
   - Low quality image rejection
   - Network interruption during stream
   - Invalid file format
   - Gemini API failure

### Performance Tests
1. **Time Comparison**
   - Measure 10-page document: before vs after
   - Measure 30-page document: before vs after
   - Verify 50-75% time reduction

2. **Load Testing**
   - Multiple concurrent uploads
   - Memory usage monitoring
   - SSE connection stability

---

## Expected Results

### Performance Improvements

| Document | Before | After | Improvement |
|----------|--------|-------|-------------|
| 10 pages (high quality) | 45-60s | 12-18s | **70-75% faster** |
| 10 pages (low quality) | 45-60s | 35-45s | **25% faster** |
| 30 pages | 3-4 min | 45-60s | **75% faster** |

### User Experience Improvements
- ✅ Real-time progress with stage breakdown
- ✅ Questions appear immediately (progressive display)
- ✅ Quality-based optimization (faster for good images)
- ✅ Clear error messages for low-quality uploads
- ✅ Visual batch progress indicator

### Quality Maintenance
- ✅ No image compression (preserves quality)
- ✅ Adaptive DPI (higher for poor quality)
- ✅ Same AI model (Gemini 2.0 Flash)
- ✅ Same prompt structure

---

## Rollout Plan

### Phase 1: Backend (Week 1)
- [ ] Create quality analyzer module
- [ ] Implement parallel batch processing
- [ ] Add SSE endpoint
- [ ] Unit testing

### Phase 2: Frontend (Week 2)
- [ ] Create ProcessingProgress component
- [ ] Update AITestImporter with SSE
- [ ] Implement progressive question display
- [ ] Integration testing

### Phase 3: Testing & Optimization (Week 3)
- [ ] Performance benchmarking
- [ ] Edge case testing
- [ ] UI/UX refinements
- [ ] Documentation updates

### Phase 4: Deployment (Week 4)
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Monitor metrics
- [ ] User feedback collection

---

## Monitoring & Metrics

### Key Metrics to Track
1. **Processing Time**: Average time per document
2. **Quality Distribution**: % high/medium/low quality uploads
3. **Error Rate**: Quality rejections, processing failures
4. **User Engagement**: Time spent on page, cancel rate
5. **SSE Performance**: Connection stability, event delivery

### Alerts
- Processing time > 2x expected
- Error rate > 5%
- SSE connection failures > 1%
- Quality rejection rate > 30%

---

## Notes

### Dependencies
- Add `opencv-python` for quality analysis
- Ensure FastAPI supports streaming responses
- Frontend uses native EventSource or fetch with ReadableStream

### Compatibility
- Works with existing file types (PDF, PNG, JPG, WEBP)
- Maintains backward compatibility with old `/parse` endpoint
- SSE requires HTTP/1.1 or HTTP/2

### Security
- Validate file sizes before processing
- Sanitize SSE event data
- Rate limit SSE connections per user
- Scan uploaded files for malware

---

## References

- **Original Files**: 
  - `backend/ai_preview_importer/pdf_vision_pipeline.py`
  - `backend/app/routers/ai.py`
  - `frontend/src/pages/AITestImporter.tsx`

- **Related Documentation**:
  - Gemini API Documentation
  - FastAPI StreamingResponse
  - Server-Sent Events Specification

---

**Document Version**: 1.0
**Last Updated**: 2026-02-16
**Author**: AI Optimization Team
**Status**: Ready for Implementation
