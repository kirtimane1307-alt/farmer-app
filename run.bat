@echo off
REM Farm Management System - Developer Setup & Launcher Script
REM Usage: run.bat [check|backend|frontend|docker|migrate]

IF "%1"=="check" GOTO CHECK
IF "%1"=="backend" GOTO BACKEND
IF "%1"=="frontend" GOTO FRONTEND
IF "%1"=="docker" GOTO DOCKER
IF "%1"=="migrate" GOTO MIGRATE
IF "%1"=="" GOTO MENU

:MENU
echo ========================================================
echo  Farm Management System - Developer Launcher
echo ========================================================
echo  1. Run Diagnostic Check
echo  2. Start PostgreSQL via Docker Compose
echo  3. Run Database Migrations / Initialize Core Schema
echo  4. Start FastAPI Backend (Port 8000)
echo  5. Start Next.js Frontend (Port 3000)
echo  6. Exit
echo ========================================================
set /p choice="Select an option (1-6): "
IF "%choice%"=="1" GOTO CHECK
IF "%choice%"=="2" GOTO DOCKER
IF "%choice%"=="3" GOTO MIGRATE
IF "%choice%"=="4" GOTO BACKEND
IF "%choice%"=="5" GOTO FRONTEND
IF "%choice%"=="6" GOTO EXIT
GOTO MENU

:CHECK
echo Running Environment Check...
python check.py
pause
goto MENU

:DOCKER
echo Starting PostgreSQL via Docker Compose...
cd /d "%~dp0"
docker-compose up -d
pause
goto MENU

:MIGRATE
echo Initializing PostgreSQL Database Schema & Migrations...
cd /d "%~dp0backend"
python init_db.py
alembic upgrade head
pause
goto MENU

:BACKEND
echo Starting FastAPI Backend on http://localhost:8000...
cd /d "%~dp0backend"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
goto MENU

:FRONTEND
echo Starting Next.js Frontend on http://localhost:3000...
cd /d "%~dp0frontend"
npm run dev
pause
goto MENU

:EXIT
exit /b 0
