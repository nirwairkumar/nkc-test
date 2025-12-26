from typing import List, Optional
from .schemas import ParseResponse, QuestionFinal, LayoutBlock
from .image_manager import ImageManager
from .pdf_layout_reader import PDFLayoutReader
from .ai_brain import AIBrain

class ReasoningPipeline:
    def __init__(self):
        self.image_manager = ImageManager()
        self.reader = PDFLayoutReader(self.image_manager)
        self.brain = AIBrain()

    def process(self, file_bytes: bytes) -> ParseResponse:
        # Phase 1: Mechanical Extraction
        print(f"Phase 1: Extracting Layout for {len(file_bytes)} bytes...")
        blocks = self.reader.extract(file_bytes)
        print(f"Extracted {len(blocks)} blocks.")
        
        if not blocks:
            print("WARNING: No blocks found in PDF!")
            return ParseResponse(questions=[])

        # Phase 2: AI Reasoning
        print("Phase 2: AI Reasoning...")
        ai_output = self.brain.reason(blocks)
        
        # Phase 3: Assembly & Image Resolution
        print("Phase 3: Assembly...")
        final_questions = []
        
        for idx, q_reasoning in enumerate(ai_output.questions):
            # Resolve Question Image
            q_image_b64 = None
            if q_reasoning.questionImageIndexes:
                # Take the first assigned image for the question
                img_id = q_reasoning.questionImageIndexes[0]
                q_image_b64 = self.image_manager.get_base64(img_id)

            # Resolve Options & Option Images
            final_options = {}
            final_option_images = {}
            
            for key, opt_reasoning in q_reasoning.options.items():
                final_options[key] = opt_reasoning.text
                
                if opt_reasoning.imageIndexes:
                    # Take first image for option
                    opt_img_id = opt_reasoning.imageIndexes[0]
                    img_b64 = self.image_manager.get_base64(opt_img_id)
                    if img_b64:
                        final_option_images[key] = img_b64

            # Construct Final Question Object
            final_q = QuestionFinal(
                id=idx + 1,
                question=q_reasoning.question,
                image=q_image_b64,
                options=final_options,
                optionImages=final_option_images,
                correctAnswer=None # AI can infer this in future if prompt requested it
            )
            final_questions.append(final_q)

        return ParseResponse(questions=final_questions)
