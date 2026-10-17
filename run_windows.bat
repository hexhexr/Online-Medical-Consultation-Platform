@echo off
title MedConsult - Online Medical Consultation Platform
echo ========================================================
echo   MedConsult - Online Medical Consultation Platform
echo   FYP - University of Southern Punjab, Multan
echo ========================================================
echo.
echo Starting MedConsult on http://127.0.0.1:8000 ...
echo Press Ctrl+C at any time to stop the server.
echo.

:: Open browser automatically
start http://127.0.0.1:8000

:: Run PHP built-in web server with router
php -S 127.0.0.1:8000 router.php

pause
