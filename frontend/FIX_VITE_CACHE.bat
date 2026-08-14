@echo off
echo ========================================
echo Fixing Vite Cache Issue
echo ========================================
echo.

echo Step 1: Clearing Vite cache...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo Vite cache cleared!
) else (
    echo Vite cache not found (already clean)
)
echo.

echo Step 2: Clearing dist folder...
if exist "dist" (
    rmdir /s /q "dist"
    echo Dist folder cleared!
) else (
    echo Dist folder not found
)
echo.

echo ========================================
echo Cache cleared successfully!
echo ========================================
echo.
echo Now run: npm run dev
echo.
pause
