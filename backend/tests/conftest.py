"""Shared pytest fixtures and configuration."""
import sys
import os

# Ensure the backend root is on sys.path so `from app.x import y` works
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
