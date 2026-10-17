<?php
/**
 * Online Medical Consultation Platform
 * AI-Driven NLP Symptom Triage Engine (SRS Section 3.2, FR-06 to FR-11)
 * 
 * Invokes the Python NLP module via internal REST API HTTP request as explicitly specified in:
 * - SRS FR-07: "The system shall pass the sanitised input from PHP to the Python NLP module via an internal REST API HTTP request."
 * - SRS Section 2.1, 2.6, 2.7: Python Flask micro-service running on internal port 5000.
 */

require_once __DIR__ . '/db.php';

function call_ai_triage($symptoms) {
    // Internal Flask REST API microservice (SRS FR-07)
    $flaskUrl = getenv('AI_SERVICE_URL') ?: 'http://127.0.0.1:5000/predict';
    $postData = json_encode(['symptoms' => $symptoms]);

    $context = stream_context_create([
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\nAccept: application/json\r\n",
            'content' => $postData,
            'timeout' => 3,
            'ignore_errors' => true
        ]
    ]);

    $response = @file_get_contents($flaskUrl, false, $context);
    if ($response) {
        $result = json_decode($response, true);
        if (is_array($result) && !empty($result['specialty'])) {
            return $result;
        }
    }

    throw new Exception("AI Triage REST microservice is unavailable or returned an invalid response.");
}

function handle_triage($method) {
    if ($method !== 'POST') {
        json_response(['error' => 'Method not allowed.'], 405);
    }

    // FR-04: RBAC check - Patient only
    $current = get_auth_user('Patient');
    if (!$current) {
        json_response(['error' => 'Unauthorized access. Patients only.'], 403);
    }

    $data = get_json_input();
    $symptoms = trim($data['symptoms'] ?? '');

    if (empty($symptoms)) {
        json_response(['error' => 'Please describe your symptoms.'], 400);
    }
    if (strlen($symptoms) > 2000) {
        json_response(['error' => 'Please keep the symptom description under 2000 characters.'], 400);
    }

    try {
        $analysis = call_ai_triage($symptoms);
    } catch (Exception $e) {
        // FR-11: Graceful fallback on AI module failure
        $doctors = db_query_all(
            "SELECT user_id, name, specialty, qualification, experience_years, biography FROM users " .
            "WHERE role = 'Doctor' AND is_verified = 1 AND status = 'Active'"
        );
        json_response([
            'success' => true,
            'ai_analysis' => [
                'specialty' => 'General Practitioner',
                'confidence' => 0.0,
                'fallback' => true,
                'message' => 'AI analysis unavailable. Showing all verified practitioners.'
            ],
            'recommended_doctors' => $doctors
        ]);
    }

    // FR-11: Threshold validation (fallback if confidence is low)
    if (($analysis['confidence'] ?? 0) < 0.35) {
        $analysis['specialty'] = 'General Practitioner';
        $analysis['low_confidence'] = true;
    }

    // FR-10 & FR-14: Retrieve verified doctors in predicted specialty
    $doctors = db_query_all(
        "SELECT user_id, name, specialty, qualification, experience_years, biography FROM users " .
        "WHERE role = 'Doctor' AND is_verified = 1 AND specialty = ? AND status = 'Active'",
        [$analysis['specialty']]
    );

    // If no specific doctors in that specialty, fallback to general practitioners
    if (empty($doctors)) {
        $doctors = db_query_all(
            "SELECT user_id, name, specialty, qualification, experience_years, biography FROM users " .
            "WHERE role = 'Doctor' AND is_verified = 1 AND specialty = 'General Practitioner' AND status = 'Active'"
        );
    }

    log_audit(
        $current['user_id'],
        "AI_TRIAGE",
        "Triaged to {$analysis['specialty']} with confidence {$analysis['confidence']}"
    );

    json_response([
        'success' => true,
        'ai_analysis' => $analysis,
        'recommended_doctors' => $doctors
    ]);
}
