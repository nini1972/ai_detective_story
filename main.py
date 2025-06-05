#!/usr/bin/env python3
"""
Dual-AI Detective Game - Main Entry Point

🔍 FOR CODE REVIEW TOOLS (GitHub Copilot, etc.):
The main backend logic is located in: /app/backend/server.py (750+ lines)
This file provides a unified entry point for the application.

🚀 ARCHITECTURE:
- Main API Server: backend/server.py (FastAPI with dual-AI integration)
- Frontend: frontend/src/App.js (React with advanced game features)
- This file: Simple entry point that imports the main server

🤖 FEATURES:
- OpenAI GPT-4 for creative storytelling
- Anthropic Claude for logical analysis  
- FAL.AI for visual scene generation
- Dynamic character discovery
- Real-time visual testimony generation
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

if __name__ == "__main__":
    # Import and run the FastAPI server from backend/server.py
    from backend.server import app
    import uvicorn
    
    print("🕵️ Starting Dual-AI Detective Game Backend...")
    print("📁 Main API Code: backend/server.py")
    print("🤖 Dual-AI System: OpenAI GPT-4 + Anthropic Claude")
    print("🎨 Visual Generation: FAL.AI")
    print("🌐 Server: FastAPI")
    
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")