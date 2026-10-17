import json
from pathlib import Path
import pickle
import re
import sys

MODEL_PATH = Path(__file__).with_name("triage_model.pkl")

with MODEL_PATH.open("rb") as file:
    model = pickle.load(file)


def clean_text(text):
    """Normalize and clean free-text symptoms."""
    return re.sub(r"[^a-zA-Z ]", " ", text.lower()).strip()


def predict_specialty(symptoms):
    """Predict medical specialty and confidence score from symptom text."""
    text = clean_text(symptoms)
    if not text:
        return {
            "specialty": "General Practitioner",
            "confidence": 0.0,
            "processed_text": "",
        }

    specialty = str(model.predict([text])[0])
    confidence = float(max(model.predict_proba([text])[0]))
    return {
        "specialty": specialty,
        "confidence": round(confidence, 2),
        "processed_text": text,
    }


if __name__ == "__main__":
    # Command-line interface for PHP shell_exec bridge
    # Usage: python3 triage.py "symptom description"
    input_text = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else ""
    try:
        result = predict_specialty(input_text)
        result["success"] = True
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}))
        sys.exit(1)
