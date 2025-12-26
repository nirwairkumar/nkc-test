from fastapi import FastAPI
import sys
import os
import importlib.util

# Vercel Serverless Function Entry Point
# Since the folder name 'ai-preview-importer' has hyphens, we cannot import it normally.
# We must use importlib to load the module dynamically.

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))

# Add project root to sys.path so that relative imports inside the module work
if project_root not in sys.path:
    sys.path.append(project_root)

# Path to the preview_main.py file
module_path = os.path.join(project_root, "ai-preview-importer", "preview_main.py")

try:
    spec = importlib.util.spec_from_file_location("preview_main", module_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["preview_main"] = module # Register module
    spec.loader.exec_module(module)
    
    # Export the 'app' object which Vercel looks for
    app = module.app
    print("Successfully loaded AI Preview Importer for Vercel.")

except Exception as e:
    print(f"Failed to load AI Preview Importer: {e}")
    # Fallback app to show error in Vercel logs
    app = FastAPI()
    @app.get("/api/parse")
    def error_route():
        return {"error": str(e)}
