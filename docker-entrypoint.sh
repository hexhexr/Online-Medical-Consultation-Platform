#!/bin/bash
set -e

PORT="${PORT:-8000}"

echo "=========================================================="
echo " Starting MedConsult Platform (Render Production Mode)    "
echo " Web Port: ${PORT}                                       "
echo "=========================================================="

# 1. Start Python Flask AI NLP Triage Microservice in background on 127.0.0.1:5000
echo "[1/2] Launching Python Flask AI Triage Microservice (port 5000)..."
python3 ai_engine/service.py &
AI_PID=$!

# Wait briefly for AI service to initialize
sleep 2

if kill -0 $AI_PID 2>/dev/null; then
    echo "✓ AI microservice started successfully (PID: $AI_PID)"
else
    echo "WARNING: AI microservice failed to start in background"
fi

# 2. Start high-performance PHP built-in web server with concurrent workers
echo "[2/2] Launching PHP Web Server on 0.0.0.0:${PORT}..."
export PHP_CLI_SERVER_WORKERS=4
exec php -S 0.0.0.0:${PORT} router.php
