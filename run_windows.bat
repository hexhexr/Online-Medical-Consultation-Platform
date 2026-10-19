@echo off
title MedConsult - Online Medical Consultation Platform
echo ========================================================
echo   MedConsult - Online Medical Consultation Platform
echo   FYP - University of Southern Punjab, Multan
echo ========================================================
echo.
echo Pre-Configured Test Credentials:
echo   Admin:   admin@medconsult.com / admin123
echo   Doctor:  dr.sarah@medconsult.com / admin123
echo   Patient: ali.khan@example.com / password123
echo ========================================================
echo.
echo Starting Python AI Microservice on http://127.0.0.1:5000 ...
start /B python ai_engine\service.py
timeout /t 2 >nul

echo Starting PHP Web Server on http://127.0.0.1:8000 ...
start http://127.0.0.1:8000
php -S 127.0.0.1:8000 router.php

pause
