"""
Flask REST API Microservice for AI NLP Symptom Triage.
Provides an internal HTTP REST endpoint (/predict) as specified in SRS Section 2.1 and FR-07.
"""
import os
import sys
from flask import Flask, request, jsonify

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from ai_engine.triage import predict_specialty
except ImportError:
    from triage import predict_specialty



app = Flask(__name__)

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    symptoms = str(data.get("symptoms", "")).strip()
    if not symptoms:
        return jsonify({"success": False, "error": "Symptoms description is required"}), 400

    try:
        result = predict_specialty(symptoms)
        result["success"] = True
        return jsonify(result)
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "MedConsult AI Triage"})

if __name__ == "__main__":
    # Portable manual start: python3 ai_engine/service.py (Windows: py ai_engine/service.py)
    # Default 5001 avoids clashing with other local services; configurable per machine.
    port = int(os.getenv("MEDCONSULT_AI_PORT", "5001"))
    app.run(host="127.0.0.1", port=port, debug=False)
