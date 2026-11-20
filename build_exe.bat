@echo off
title StudyHub - Desktop Packaging Script
color 0b

echo ============================================================
echo         StudyHub Desktop - Build Standalone EXE
echo ============================================================
echo.

:: 1. Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in PATH. Please install Python 3.10+
    pause
    exit /b 1
)

:: 2. Check Node.js installation
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH. Please install Node.js 18+
    pause
    exit /b 1
)

:: 3. Build React Frontend assets into dist/
echo [Step 1/3] Building React + Tailwind frontend with Vite...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)
echo [OK] Frontend built successfully in dist/
echo.

:: 4. Install / Verify PyInstaller
echo [Step 2/3] Verifying PyInstaller...
pip show pyinstaller >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing PyInstaller...
    pip install pyinstaller
)
echo [OK] PyInstaller is ready.
echo.

:: 5. Compile Standalone EXE into release/
echo [Step 3/3] Packaging StudyHub Desktop into standalone executable...
echo This may take 1-2 minutes, please wait...

if not exist "release" mkdir "release"

pyinstaller --noconsole --onefile ^
    --name "StudyHub" ^
    --icon "StudyHub.ico" ^
    --add-data "dist;dist" ^
    --hidden-import "webview" ^
    --hidden-import "yt_dlp" ^
    --hidden-import "imageio_ffmpeg" ^
    --hidden-import "PIL" ^
    --distpath "release" ^
    --workpath "build-cache" ^
    --clean ^
    main.py

if %errorlevel% neq 0 (
    echo [ERROR] PyInstaller compilation failed.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo [SUCCESS] Build Complete!
echo Your standalone executable is ready:
echo   release\StudyHub.exe
echo.
echo Anyone can now download and run StudyHub.exe directly on Windows
echo with zero prerequisites (no Python, Node, or terminal needed)!
echo ============================================================
echo.
pause
