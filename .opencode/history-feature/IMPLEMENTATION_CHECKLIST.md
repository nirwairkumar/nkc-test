# AI Test Generator - Implementation Checklist

## Overview
Optimizing AI test generator with parallel processing, adaptive quality-based DPI, real-time progress tracking (SSE), and progressive question display.

---

## Implementation Status

### Phase 1: Backend Implementation ✅ PLANNED

#### 1.1 Quality Analyzer Module
**File**: `backend/ai_preview_importer/quality_analyzer.py`
- [ ] Create quality analyzer class
- [ ] Implement sharpness detection (Laplacian variance)
- [ ] Implement contrast analysis
- [ ] Implement brightness check
- [ ] Implement noise estimation
- [ ] Add quality tier classification (high/medium/low)
- [ ] Add user-facing recommendations
- [ ] Write unit tests

#### 1.2 Parallel Processing
**File**: `backend/ai_preview_importer/pdf_vision_pipeline.py`
- [ ] Add `process_files_stream()` function
- [ ] Add `_process_single_batch()` helper
- [ ] Implement asyncio semaphore (max 15 concurrent)
- [ ] Add quality analysis integration
- [ ] Add progress callback support
- [ ] Add question callback support
- [ ] Implement error isolation per batch
- [ ] Update batch size (5 pages with 1-page overlap)

#### 1.3 SSE Endpoint
**File**: `backend/app/routers/ai.py`
- [ ] Add `/parse-stream` endpoint
- [ ] Implement EventSource streaming
- [ ] Add progress events
- [ ] Add question streaming events
- [ ] Add error handling
- [ ] Add timeout handling (5 minutes)

---

### Phase 2: Frontend Implementation ✅ PLANNED

#### 2.1 Progress Component
**File**: `frontend/src/components/ProcessingProgress.tsx`
- [ ] Create progress UI component
- [ ] Add stage icons (uploading, analyzing, processing, etc.)
- [ ] Add progress bar with percentage
- [ ] Add metadata display (batch X/Y, questions found, quality tier)
- [ ] Add batch progress visualization
- [ ] Style with theme colors

#### 2.2 AITestImporter Updates
**File**: `frontend/src/pages/AITestImporter.tsx`
- [ ] Add SSE client implementation
- [ ] Add `progress` state
- [ ] Add `streamingQuestions` state
- [ ] Add `isStreaming` state
- [ ] Update `handleProcess` to use SSE
- [ ] Add progressive question display section
- [ ] Show live question counter
- [ ] Update loading state UI

---

## Configuration

### Quality Thresholds
```python
High Quality:   Score ≥ 0.8  → DPI: 150
Medium Quality: Score 0.5-0.8 → DPI: 200
Low Quality:    Score < 0.5  → DPI: 300
Reject:         Score < 0.3  → Error: "Upload clearer image"
```

### Processing Parameters
```python
Batch Size: 5 pages
Overlap: 1 page
Max Concurrent: 15 batches
Timeout: 300 seconds (5 minutes)
```

---

## API Changes

### New Endpoint
```
POST /api/ai/parse-stream
Content-Type: multipart/form-data
Accept: text/event-stream

Parameters:
- files: List[File] - PDF/Image files
- answer_key: Optional[File] - Answer key
- mode: str - "extract" or "generate"

Events:
- progress: { stage, percent, message, data }
- question: { type, question, batch }
- complete: { result object }
- error: { message }
```

---

## Expected Performance

| Document | Before | After | Improvement |
|----------|--------|-------|-------------|
| 10 pages (high quality) | 45-60s | 12-18s | **70-75%** |
| 10 pages (low quality) | 45-60s | 35-45s | **25%** |
| 30 pages | 3-4 min | 45-60s | **75%** |

---

## Dependencies

### Backend
```bash
pip install opencv-python numpy
```

### Frontend
```bash
# No new dependencies required
# Uses native EventSource or fetch with ReadableStream
```

---

## Testing Checklist

### Unit Tests
- [ ] Quality analyzer with different image qualities
- [ ] Parallel batch processing with semaphore
- [ ] SSE event generation and parsing
- [ ] Error handling for failed batches

### Integration Tests
- [ ] End-to-end flow with 10-page PDF
- [ ] Progressive question display
- [ ] Error scenarios (low quality, network failure)
- [ ] Multiple concurrent uploads

### Performance Tests
- [ ] Time comparison: before vs after
- [ ] Memory usage monitoring
- [ ] SSE connection stability

---

## Rollout Steps

### Week 1: Backend
1. [ ] Create quality analyzer module
2. [ ] Implement parallel processing
3. [ ] Add SSE endpoint
4. [ ] Unit testing

### Week 2: Frontend
1. [ ] Create progress component
2. [ ] Update AITestImporter
3. [ ] Integration testing
4. [ ] UI/UX refinements

### Week 3: Testing
1. [ ] Performance benchmarking
2. [ ] Edge case testing
3. [ ] Error handling verification

### Week 4: Deployment
1. [ ] Staging deployment
2. [ ] Production deployment
3. [ ] Monitor metrics

---

## Notes

### Key Decisions
1. **No compression**: Preserves image quality
2. **Adaptive DPI**: Quality-based instead of fixed reduction
3. **Parallel processing**: 15 concurrent batches (no Gemini rate limit)
4. **Progressive display**: Questions show immediately
5. **Low quality rejection**: Score < 0.3 shows error

### Backward Compatibility
- Old `/parse` endpoint remains functional
- New `/parse-stream` is opt-in
- No breaking changes to existing functionality

### Security
- File size validation before processing
- SSE connection rate limiting
- File type validation
- Malware scanning (if available)

---

## Documentation

- **Full Plan**: `.opencode/history-feature/ai-test-generator-optimization-plan.md`
- **This Checklist**: `.opencode/history-feature/IMPLEMENTATION_CHECKLIST.md`

---

**Created**: 2026-02-16
**Status**: Ready for Implementation
**Priority**: High
