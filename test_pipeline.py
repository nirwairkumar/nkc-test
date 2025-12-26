import asyncio
import sys
import os
import importlib.util

# Add the directory to sys.path to import modules with hyphens
current_dir = os.path.dirname(os.path.abspath(__file__))
module_dir = os.path.join(current_dir, "ai-intelligent-importer")
sys.path.append(module_dir)

# Import dynamically or just rely on sys.path if we change the folder structure in memory
# But since the files inside use relative imports (.schemas), we need to treat it as a package or fix context.
# Easiest way:
# We will manually import the class by loading the file directly
spec = importlib.util.spec_from_file_location("reasoning_pipeline", os.path.join(module_dir, "reasoning_pipeline.py"))
reasoning_pipeline = importlib.util.module_from_spec(spec)
sys.modules["reasoning_pipeline"] = reasoning_pipeline
# We need to load dependencies first... this is getting messy. 

# BETTER APPROACH: Run this script FROM the `ai-intelligent-importer` directory but pointing to parent for env?
# No, let's just make the folder importable by renaming it temporarily? No.

# Let's try inserting the parent dir into sys.path and treating 'ai-intelligent-importer' as a namespace package?
# Hyphens are strictly forbidden in Python identifiers.
# We effectively CANNOT import this module easily in a script without `importlib`.

# Let's try using `runpy` to execute the module as a script if possible, or just renaming the folder.
# RENAMING IS SAFER.
pass
import os

# Create a dummy PDF for testing if one doesn't exist
import fitz

def create_dummy_pdf(filename="test_doc.pdf"):
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Q.1 What isn the capital of France?", fontsize=12)
    page.insert_text((50, 70), "A) London", fontsize=12)
    page.insert_text((50, 90), "B) Paris", fontsize=12)
    page.insert_text((50, 110), "C) Berlin", fontsize=12)
    page.insert_text((50, 130), "D) Madrid", fontsize=12)
    doc.save(filename)
    return filename

filename = "test_doc.pdf"
if not os.path.exists(filename):
    create_dummy_pdf(filename)

print(f"Testing with {filename}...")
with open(filename, "rb") as f:
    content = f.read()

pipeline = ReasoningPipeline()
try:
    result = pipeline.process(content)
    print("Pipeline Result:")
    print(result)
except Exception as e:
    print(f"Pipeline Error: {e}")
    import traceback
    traceback.print_exc()
