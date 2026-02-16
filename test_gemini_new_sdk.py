#!/usr/bin/env python3
"""Test script to verify new google-genai SDK works with YouTube URLs"""

import sys
sys.path.insert(0, 'D:/Yuga Yatra/nkc-Test-platform/backend')

from google import genai
from google.genai import types
from app.core.config import settings

# Get API key from settings
api_key = settings.GEMINI_API_KEY

if not api_key:
    print("Error: GEMINI_API_KEY not set in settings")
    print("Please check your .env file")
    sys.exit(1)

print(f"Testing with API key: {api_key[:10]}...")

# Initialize client
client = genai.Client(api_key=api_key)

# Test URL - a known educational video
test_url = "https://www.youtube.com/watch?v=9hE5-98ZeCg"  # This is a sample video

print(f"\nTesting YouTube URL analysis:")
print(f"URL: {test_url}")

try:
    # Create content with video URL
    content = types.Content(
        parts=[
            types.Part.from_uri(file_uri=test_url, mime_type="video/mp4"),
            types.Part(text="Summarize this video in one sentence.")
        ]
    )
    
    print("Content created successfully")
    print(f"Content type: {type(content)}")
    
    # Generate content
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=content
    )
    
    print(f"\nResponse received!")
    print(f"Response text: {response.text}")
    print("\n[OK] Test passed! The new SDK format works correctly.")
    
except Exception as e:
    print(f"\n[ERROR] Test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
