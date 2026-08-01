@echo off
REM Mtsprz — WhatsApp Web Browser Sender (Windows)
cd /d %~dp0
if not exist .venv ( uv sync )
uv run python sender.py
pause
