from pathlib import Path
import pickle

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

HERE = Path(__file__).parent


def specialty_for(disease):
    disease = disease.lower()
    groups = [
        (("heart", "attack", "hypertension"), "Cardiologist"),
        (("diabetes", "thyroid"), "Endocrinologist"),
        (("acne", "rash", "fungal", "psoriasis", "impetigo"), "Dermatologist"),
        (("osteoarthristis", "arthritis", "cervical"), "Orthopedist"),
        (("migraine", "paralysis"), "Neurologist"),
        (("jaundice", "hepatitis", "gastroenteritis", "peptic"), "Gastroenterologist"),
        (("allergy", "pneumonia", "tuberculosis", "asthma"), "Pulmonologist"),
    ]
    for words, specialty in groups:
        if any(word in disease for word in words):
            return specialty
    return "General Practitioner"


def train():
    df = pd.read_csv(HERE / "dataset" / "training_data.csv")
    symptom_columns = df.columns[:-1]
    texts, labels = [], []

    for _, row in df.iterrows():
        symptoms = [c.replace("_", " ") for c in symptom_columns if row[c] == 1]
        if symptoms:
            texts.append(" ".join(symptoms))
            labels.append(specialty_for(str(row["prognosis"])))

    x_train, x_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )
    model = Pipeline([
        ("tfidf", TfidfVectorizer(max_features=5000)),
        ("classifier", RandomForestClassifier(n_estimators=100, random_state=42)),
    ])
    model.fit(x_train, y_train)
    accuracy = accuracy_score(y_test, model.predict(x_test))

    with (HERE / "triage_model.pkl").open("wb") as file:
        pickle.dump(model, file)

    print(f"Model trained. Test accuracy: {accuracy:.2%}")


if __name__ == "__main__":
    train()
