"""
Vercel Serverless Function entrypoint for LexNav FastAPI backend.
Maps incoming /api requests on Vercel directly to the FastAPI application.
"""
import sys
from pathlib import Path

# Ensure the 'lexnav' directory is at the head of sys.path
root_dir = Path(__file__).resolve().parent.parent
lexnav_dir = root_dir / "lexnav"

if str(lexnav_dir) not in sys.path:
    sys.path.insert(0, str(lexnav_dir))

from app.main import app

# Vercel's Python runtime will detect and serve 'app' as the ASGI application
