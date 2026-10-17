<?php
/**
 * Online Medical Consultation Platform
 * Public Directory & Contact Messages (SRS Section 3.3, FR-12 to FR-14)
 */

require_once __DIR__ . '/db.php';

function handle_public($method, $action) {
    // ----------------------------------------------------
    // FR-12 & FR-13: Verified Doctor Directory & Specialty Listing
    // ----------------------------------------------------
    if ($method === 'GET') {
        if ($action === 'list_doctors') {
            $doctors = db_query_all(
                "SELECT user_id, name, specialty, qualification, experience_years, biography FROM users " .
                "WHERE role = 'Doctor' AND is_verified = 1 AND status = 'Active' " .
                "ORDER BY name ASC"
            );
            json_response(['success' => true, 'doctors' => $doctors]);
        }
    }

    json_response(['error' => 'Invalid public request.'], 400);
}

function handle_contact($method) {
    if ($method !== 'POST') {
        json_response(['error' => 'Method not allowed.'], 405);
    }

    $data = get_json_input();
    $name = trim($data['name'] ?? '');
    $email = strtolower(trim($data['email'] ?? ''));
    $subject = trim($data['subject'] ?? '');
    $message = trim($data['message'] ?? $data['message_body'] ?? '');

    if (empty($name) || empty($email) || empty($subject) || empty($message)) {
        json_response(['error' => 'Please complete all contact fields.'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['error' => 'Please enter a valid email address.'], 400);
    }
    if (strlen($name) > 255 || strlen($subject) > 255 || strlen($message) > 5000) {
        json_response(['error' => 'Your contact message is too long.'], 400);
    }

    db_execute(
        "INSERT INTO contact_messages (name, email, subject, message_body) VALUES (?, ?, ?, ?)",
        [$name, $email, $subject, $message]
    );

    json_response([
        'success' => true,
        'message' => 'Your message has been sent to the MedConsult administrator.'
    ]);
}
