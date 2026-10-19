#!/bin/bash
# ==============================================================================
# Online Medical Consultation Platform - Linux Launcher
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================================="
echo " Starting Online Medical Consultation Platform (Linux)    "
echo "=========================================================="

# 1. Check MySQL / MariaDB service
echo "[1/3] Checking MySQL database..."
if mysql -u root -e "USE medconsult_db;" 2>/dev/null; then
    echo "  ✓ Connected to MySQL database 'medconsult_db'."
else
    echo "  ! Note: Could not auto-connect to 'medconsult_db' with root (no password)."
    echo "    If not running, start MySQL with: sudo systemctl start mysql"
fi

# 2. Launch Python AI Microservice
echo "[2/3] Starting Python AI Triage Microservice on 127.0.0.1:5000..."
python3 ai_engine/service.py &
AI_PID=$!

cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $AI_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

sleep 2

if kill -0 $AI_PID 2>/dev/null; then
    echo "  ✓ AI Microservice running (PID: $AI_PID)"
else
    echo "  ! Warning: AI Microservice failed to initialize."
fi

# 3. Launch PHP Web Server
echo "[3/3] Starting PHP Web Server on http://127.0.0.1:8000..."
echo "=========================================================="
echo " Platform URLs:"
echo "   Web App:  http://127.0.0.1:8000"
echo "   AI Micro: http://127.0.0.1:5000/health"
echo ""
echo " Pre-Configured Test Credentials:"
echo "   Admin:   admin@medconsult.com / admin123"
echo "   Doctor:  dr.sarah@medconsult.com / admin123"
echo "   Patient: ali.khan@example.com / password123"
echo "=========================================================="
echo "Press Ctrl+C to stop both servers."
echo ""

export PHP_CLI_SERVER_WORKERS=4
php -S 127.0.0.1:8000 router.php
