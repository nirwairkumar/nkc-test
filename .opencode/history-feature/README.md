# AI Test Generator Optimization

This directory contains the implementation documentation for optimizing the AI test generator with real-time progress tracking, parallel processing, and adaptive quality-based image processing.

## 📁 Files

### 1. **ai-test-generator-optimization-plan.md** (Main Document)
Comprehensive implementation plan including:
- Architecture analysis
- Detailed technical specifications
- Code implementations
- Phase-by-phase rollout plan
- Testing strategy

### 2. **IMPLEMENTATION_CHECKLIST.md** (Quick Reference)
Concise checklist for tracking implementation progress:
- Task breakdown by phase
- Configuration parameters
- API specifications
- Testing checklist
- Rollout steps

## 🎯 Goals

1. **Reduce Processing Time** 
   - 10 pages: 45-60s → 12-18s (70-75% faster)
   - 30 pages: 3-4 min → 45-60s (75% faster)

2. **Real-Time Progress Tracking**
   - SSE (Server-Sent Events) for live updates
   - 5 processing stages with visual progress
   - Time estimation

3. **Progressive Question Display**
   - Show questions immediately as extracted
   - Live question counter
   - Early access while processing continues

4. **Adaptive Quality Processing**
   - Analyze image quality before processing
   - Select optimal DPI (150/200/300) based on quality
   - Reject very low quality uploads (< 0.3 score)

## 🔧 Key Features

### Parallel Processing
- **Max Concurrent**: 15 batches
- **Batch Size**: 5 pages with 1-page overlap
- **Execution**: Asyncio with semaphore
- **Error Isolation**: Failed batches don't stop others

### Quality Analysis
Uses OpenCV to analyze:
- Sharpness (Laplacian variance)
- Contrast ratio
- Brightness levels
- Noise estimation

### SSE Events
```typescript
progress: { stage, percent, message, data }
question: { type, question, batch }
complete: { result }
error: { message }
```

## 📊 Quality Tiers

| Tier | Score | DPI | Processing Time | Use Case |
|------|-------|-----|-----------------|----------|
| High | ≥0.8 | 150 | ~2s/page | Crisp scans, good photos |
| Medium | 0.5-0.8 | 200 | ~3s/page | Average quality |
| Low | <0.5 | 300 | ~4s/page | Fuzzy images, poor lighting |
| Reject | <0.3 | - | Error | Too low quality |

## 🚀 Implementation Phases

### Phase 1: Backend (Week 1)
- [ ] Quality analyzer module
- [ ] Parallel batch processing
- [ ] SSE endpoint
- [ ] Unit tests

### Phase 2: Frontend (Week 2)
- [ ] Progress component
- [ ] SSE client integration
- [ ] Progressive question display
- [ ] Integration tests

### Phase 3: Testing (Week 3)
- [ ] Performance benchmarks
- [ ] Edge case testing
- [ ] UI/UX refinements

### Phase 4: Deployment (Week 4)
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Monitoring setup

## 📁 Files to Modify

### New Files
```
backend/ai_preview_importer/quality_analyzer.py
frontend/src/components/ProcessingProgress.tsx
```

### Modified Files
```
backend/ai_preview_importer/pdf_vision_pipeline.py
backend/app/routers/ai.py
frontend/src/pages/AITestImporter.tsx
```

## ⚙️ Configuration

### Backend Dependencies
```bash
pip install opencv-python numpy
```

### Frontend
No new dependencies required (uses native EventSource)

## 🔒 Backward Compatibility

- ✅ Old `/parse` endpoint remains functional
- ✅ New `/parse-stream` is opt-in
- ✅ No breaking changes

## 📈 Expected Results

### Performance
- 70-75% faster for high-quality documents
- 25% faster for low-quality documents
- 75% faster for large documents (30+ pages)

### User Experience
- Real-time progress visibility
- Questions appear immediately
- Clear error messages for low-quality uploads
- Batch progress visualization

## 🐛 Error Handling

### Quality Rejection
```
Error: "Image quality is too low for reliable extraction. 
Please upload a clearer image with better resolution and lighting."
```

### Batch Failure
- Isolated to single batch
- Other batches continue processing
- Failed batches can be retried individually

### Timeout
- 5-minute timeout for entire process
- SSE connection kept alive
- Clear timeout error message

## 📞 Questions?

Refer to the main plan document for:
- Detailed code implementations
- Complete API specifications
- Testing scenarios
- Rollout timeline

---

**Last Updated**: 2026-02-16
**Status**: Ready for Implementation
**Priority**: High
