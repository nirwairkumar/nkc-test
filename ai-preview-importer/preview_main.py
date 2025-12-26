from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import traceback

from .pdf_extractor import PDFExtractor
from .block_grouper import BlockGrouper
from .image_assigner import ImageAssigner
from .ai_formatter import AIFormatter
from .preview_schema import PreviewResponse

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8081", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from answer_resolution.answer_resolution_pipeline import AnswerResolutionPipeline

# Initialize Pipeline Components
extractor = PDFExtractor()
grouper = BlockGrouper()
assigner = ImageAssigner()
resolver = AnswerResolutionPipeline()
formatter = AIFormatter()

@app.post("/parse")
async def parse_document(file: UploadFile = File(...)):
    """
    Preview Importer Endpoint.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        print(f"--- Processing: {file.filename} ---")
        content = await file.read()
        
        # 1. Extract Raw Elements (Deterministic)
        elements = extractor.extract_elements(content)
        
        # 2. Group into Questions (Deterministic Regex)
        questions_raw = grouper.group_blocks(elements)
        
        # 3. Assign Images (Deterministic Proximity)
        questions_with_images = assigner.assign_images(questions_raw)
        
        if not questions_with_images:
            raise HTTPException(status_code=400, detail="No questions found in PDF (Regex mismatch)")

        # 4. Resolve Answers (In-Place Enrichment)
        resolution_result = resolver.resolve_answers(questions_with_images, elements)
        questions_resolved = resolution_result["questions"]
        can_confirm = resolution_result["canConfirm"]
        unanswered_count = resolution_result["unansweredCount"]

        # 5. Format with AI (Formatting Only)
        final_preview = formatter.format_json(questions_resolved)
        
        print(f"--- Successfully Parsed {len(final_preview)} questions ---")
        
        return {
            "status": "ok",
            "questions": final_preview, # Frontend expects "questions"
            "canConfirm": can_confirm,
            "unansweredCount": unanswered_count
        }

    except Exception as e:
        print(f"Pipeline Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("ai-preview-importer.preview_main:app", host="0.0.0.0", port=8000, reload=True)
