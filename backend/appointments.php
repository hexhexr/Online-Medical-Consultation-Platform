<?php
/**
 * Online Medical Consultation Platform
 * Appointment Scheduling & Workflow Management (SRS Section 3.4, FR-15 to FR-22)
 */

require_once __DIR__ . '/db.php';

function handle_appointments($method, $action) {
    $current = get_auth_user();
    if (!$current) {
        json_response(['error' => 'Unauthorized access.'], 401);
    }

    $uid = $current['user_id'];
    $role = $current['role'];

    if ($method === 'POST') {
        $data = get_json_input();

        // ----------------------------------------------------
        // FR-15 to FR-18: Book an Appointment (Patient Only)
        // ----------------------------------------------------
        if ($action === 'book' && $role === 'Patient') {
            $doctorId = (int)($data['doctor_id'] ?? 0);
            $date = trim($data['preferred_date'] ?? '');
            $time = trim($data['preferred_time'] ?? '');

            if (!$doctorId || empty($date) || empty($time)) {
                json_response(['error' => 'Missing required fields.'], 400);
            }

            // Validate date and time format
            $appointmentTimestamp = strtotime("{$date} {$time}");
            if ($appointmentTimestamp === false) {
                json_response(['error' => 'Please select a valid appointment date and time.'], 400);
            }
            if ($appointmentTimestamp <= time()) {
                json_response(['error' => 'Appointments must be booked for a future date and time.'], 400);
            }

            // Verify doctor exists, is active, and verified
            $doctor = db_query_one(
                "SELECT user_id, name FROM users WHERE user_id = ? AND role = 'Doctor' AND is_verified = 1 AND status = 'Active'",
                [$doctorId]
            );
            if (!$doctor) {
                json_response(['error' => 'Doctor is not available.'], 400);
            }

            // FR-16 & FR-17: Conflict detection against doctor's existing schedule
            $conflict = db_query_one(
                "SELECT appointment_id FROM appointments WHERE doctor_id = ? " .
                "AND preferred_date = ? AND preferred_time = ? " .
                "AND status IN ('Pending', 'Confirmed')",
                [$doctorId, $date, $time]
            );
            if ($conflict) {
                json_response([
                    'error' => 'The selected time slot is no longer available. Please choose another time.'
                ], 409);
            }

            // FR-18: Assign status of Pending to new appointments
            $res = db_execute(
                "INSERT INTO appointments (patient_id, doctor_id, preferred_date, preferred_time, status) " .
                "VALUES (?, ?, ?, ?, 'Pending')",
                [$uid, $doctorId, $date, $time]
            );

            log_audit($uid, "BOOK_APPOINTMENT", "Booked appointment with doctor {$doctorId} on {$date} {$time}");

            json_response([
                'success' => true,
                'message' => 'Appointment request sent to the doctor.'
            ]);
        }

        // ----------------------------------------------------
        // Cancel Appointment (Patient Only)
        // ----------------------------------------------------
        if ($action === 'cancel' && $role === 'Patient') {
            $appointmentId = (int)($data['appointment_id'] ?? 0);
            if (!$appointmentId) {
                json_response(['error' => 'Appointment ID is required.'], 400);
            }

            $res = db_execute(
                "UPDATE appointments SET status = 'Cancelled' WHERE appointment_id = ? " .
                "AND patient_id = ? AND status IN ('Pending', 'Confirmed')",
                [$appointmentId, $uid]
            );

            if ($res['rows_affected'] === 0) {
                json_response(['error' => 'Only pending or confirmed appointments can be cancelled.'], 400);
            }

            log_audit($uid, "CANCEL_APPOINTMENT", "Patient cancelled appointment {$appointmentId}");
            json_response(['success' => true, 'message' => 'Appointment cancelled.']);
        }

        // ----------------------------------------------------
        // FR-20 & FR-21: Doctor Accept/Decline & Complete Status
        // ----------------------------------------------------
        if ($action === 'update_status' && $role === 'Doctor') {
            $appointmentId = (int)($data['appointment_id'] ?? 0);
            $status = trim($data['status'] ?? '');

            if (!$appointmentId || !in_array($status, ['Confirmed', 'Cancelled', 'Completed'], true)) {
                json_response(['error' => 'Invalid status update.'], 400);
            }

            $appt = db_query_one(
                "SELECT status FROM appointments WHERE appointment_id = ? AND doctor_id = ?",
                [$appointmentId, $uid]
            );
            if (!$appt) {
                json_response(['error' => 'Appointment not found.'], 404);
            }

            // Valid status transitions
            $allowed = [
                'Pending' => ['Confirmed', 'Cancelled'],
                'Confirmed' => ['Completed', 'Cancelled']
            ];

            if (!isset($allowed[$appt['status']]) || !in_array($status, $allowed[$appt['status']], true)) {
                json_response([
                    'error' => "A " . strtolower($appt['status']) . " appointment cannot be changed to " . strtolower($status) . "."
                ], 400);
            }

            db_execute(
                "UPDATE appointments SET status = ? WHERE appointment_id = ? AND doctor_id = ?",
                [$status, $appointmentId, $uid]
            );

            log_audit($uid, "UPDATE_APPOINTMENT", "Doctor updated appointment {$appointmentId} to {$status}");
            json_response(['success' => true, 'message' => "Appointment marked as {$status}."]);
        }

        // ----------------------------------------------------
        // FR-22: Attach External Meeting Link (Google Meet)
        // ----------------------------------------------------
        if ($action === 'attach_link' && $role === 'Doctor') {
            $appointmentId = (int)($data['appointment_id'] ?? 0);
            $link = trim($data['meeting_link'] ?? '');

            if (!$appointmentId || empty($link)) {
                json_response(['error' => 'Missing link or appointment ID.'], 400);
            }
            if (strlen($link) > 255 || !filter_var($link, FILTER_VALIDATE_URL)) {
                json_response(['error' => 'Please enter a valid HTTP or HTTPS meeting link.'], 400);
            }

            $res = db_execute(
                "UPDATE appointments SET meeting_link = ? WHERE appointment_id = ? AND doctor_id = ? AND status = 'Confirmed'",
                [$link, $appointmentId, $uid]
            );

            if ($res['rows_affected'] === 0) {
                json_response(['error' => 'Appointment must be confirmed before attaching a link.'], 400);
            }

            log_audit($uid, "ATTACH_MEETING_LINK", "Attached meeting link to appointment {$appointmentId}");
            json_response(['success' => true, 'message' => 'Meeting link attached.']);
        }
    }

    if ($method === 'GET' && $action === 'list') {
        if ($role === 'Patient') {
            $rows = db_query_all(
                "SELECT a.*, u.name AS doctor_name, u.specialty FROM appointments a " .
                "JOIN users u ON a.doctor_id = u.user_id WHERE a.patient_id = ? " .
                "ORDER BY a.preferred_date DESC, a.preferred_time DESC",
                [$uid]
            );
            json_response(['success' => true, 'appointments' => $rows]);
        }

        if ($role === 'Doctor') {
            $rows = db_query_all(
                "SELECT a.*, u.name AS patient_name FROM appointments a " .
                "JOIN users u ON a.patient_id = u.user_id WHERE a.doctor_id = ? " .
                "ORDER BY a.preferred_date ASC, a.preferred_time ASC",
                [$uid]
            );
            json_response(['success' => true, 'appointments' => $rows]);
        }
    }

    json_response(['error' => 'Invalid appointment request.'], 400);
}
