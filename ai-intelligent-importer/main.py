from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .reasoning_pipeline import ReasoningPipeline
import uvicorn

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8081", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = ReasoningPipeline()

@app.post("/parse")
async def parse_document(file: UploadFile = File(...)):
    """
    Intelligent endpoint to parse PDF using Gemini reasoning.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported currently")
    
    try:
        content = await file.read()
        response = pipeline.process(content)
        return response
    except Exception as e:
        print(f"Processing Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("ai-intelligent-importer.main:app", host="0.0.0.0", port=8000, reload=True)
