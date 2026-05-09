@echo off
cd /d "%~dp0"
echo Staging all changes...
git add -A
echo.
echo Committing...
git commit -m "Update: %date% %time%"
echo.
echo Pushing to GitHub...
git push origin main
echo.
if %errorlevel%==0 (
  echo Done! Changes pushed to GitHub successfully.
) else (
  echo ERROR: Push failed. Check your remote URL and credentials.
)
pause
