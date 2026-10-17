<?php
/**
 * Online Medical Consultation Platform
 * Secure Messaging System (SRS Section 3.5, FR-23 to FR-26)
 * Supports Asynchronous Consultation Chat with 3-Second AJAX Polling
 */

require_once __DIR__ . '/db.php';

function handle_messaging($method, $action) {
    $current = get_auth_user(['Patient', 'Doctor']);
    if (!$current) {
        json_response(['error' => 'Unauthorized access.'], 401);
    }

    $uid = $current['user_id'];
    $role = $current['role'];

    // Helper to verify user is participant in appointment
    $verifyAccess = function($appointmentId) use ($uid, $role) {
        $column = ($role === 'Patient') ? 'patient_id' : 'doctor_id';
        return db_query_one(
            "SELECT appointment_id, status FROM appointments WHERE appointment_id = ? AND {$column} = ?",
            [$appointmentId, $uid]
        );
    };

    // ----------------------------------------------------
    // FR-23 & FR-24: Send Message
    // ----------------------------------------------------
    if ($method === 'POST' && $action === 'send') {
        $data = get_json_input();
        $appointmentId = (int)($data['appointment_id'] ?? 0);
        $body = trim($data['message_body'] ?? '');

        if (!$appointmentId || empty($body)) {
            json_response(['error' => 'Message body cannot be empty.'], 400);
        }
        if (strlen($body) > 2000) {
            json_response(['error' => 'Messages must be 2000 characters or fewer.'], 400);
        }

        $appt = $verifyAccess($appointmentId);
        if (!$appt) {
            json_response(['error' => 'You do not have access to this conversation.'], 403);
        }
        if ($appt['status'] !== 'Confirmed') {
            json_response(['error' => 'Messaging is available only while the appointment is confirmed.'], 400);
        }

        $res = db_execute(
            "INSERT INTO messages (appointment_id, sender_id, message_body) VALUES (?, ?, ?)",
            [$appointmentId, $uid, $body]
        );

        json_response(['success' => true, 'message_id' => $res['last_id']]);
    }

    // ----------------------------------------------------
    // FR-25 & FR-26: Fetch New Messages (3s Polling Loop)
    // ----------------------------------------------------
    if ($method === 'GET' && $action === 'fetch') {
        $appointmentId = (int)($_GET['appointment_id'] ?? 0);
        $lastId = (int)($_GET['last_id'] ?? 0);

        if (!$appointmentId) {
            json_response(['error' => 'Missing appointment ID.'], 400);
        }

        $appt = $verifyAccess($appointmentId);
        if (!$appt) {
            json_response(['error' => 'You do not have access to this conversation.'], 403);
        }

        $rows = db_query_all(
            "SELECT m.*, u.name AS sender_name FROM messages m " .
            "JOIN users u ON m.sender_id = u.user_id " .
            "WHERE m.appointment_id = ? AND m.message_id > ? " .
            "ORDER BY m.sent_at ASC",
            [$appointmentId, $lastId]
        );

        json_response(['success' => true, 'messages' => $rows]);
    }

    json_response(['error' => 'Invalid messaging request.'], 400);
}
