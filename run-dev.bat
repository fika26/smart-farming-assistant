@echo off
REM Starts backend and frontend in two windows (Windows).
cd /d "%~dp0"
if not exist backend\.venv (
  python -m venv backend\.venv
  backend\.venv\Scripts\pip install -r backend\requirements.txt
)
if not exist backend\.env copy backend\.env.example backend\.env
if not exist frontend\.env.local copy frontend\.env.example frontend\.env.local
if not exist frontend\node_modules (cd frontend && npm install && cd ..)
start "SFA backend"  cmd /k "cd backend && .venv\Scripts\uvicorn app.main:app --reload --port 8000"
start "SFA frontend" cmd /k "cd frontend && npm run dev"
echo Backend  http://localhost:8000/docs
echo Frontend http://localhost:3000
