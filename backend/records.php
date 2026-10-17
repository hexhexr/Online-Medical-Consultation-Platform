<?php
/**
 * Online Medical Consultation Platform
 * Digital Prescriptions & Billing Invoices (SRS Sections 3.6 & 3.7, FR-27 to FR-32)
 */

require_once __DIR__ . '/db.php';

function handle_records($method, $action) {
    $current = get_auth_user();
    if (!$current) {
        json_response(['error' => 'Unauthorized access.'], 401);
    }

    $uid = $current['user_id'];
    $role = $current['role'];

    // ----------------------------------------------------
    // Doctor Actions: Issue Prescription & Generate Invoice
    // ----------------------------------------------------
    if ($method === 'POST' && $role === 'Doctor') {
        $data = get_json_input();
        $appointmentId = (int)($data['appointment_id'] ?? 0);

        // Verify appointment belongs to this doctor and is Completed
        $appt = db_query_one(
            "SELECT appointment_id, status FROM appointments WHERE appointment_id = ? AND doctor_id = ?",
            [$appointmentId, $uid]
        );

        // FR-27 & FR-28: Issue Digital Prescription
        if ($action === 'issue_prescription') {
            $body = trim($data['prescription_body'] ?? '');
            if (!$appointmentId || empty($body)) {
                json_response(['error' => 'Prescription body cannot be empty.'], 400);
            }
            if (!$appt || $appt['status'] !== 'Completed') {
                json_response(['error' => 'Prescriptions can only be issued for completed appointments.'], 400);
            }

            // Check if already issued (1-to-1 relation)
            $existing = db_query_one("SELECT prescription_id FROM prescriptions WHERE appointment_id = ?", [$appointmentId]);
            if ($existing) {
                json_response(['error' => 'A prescription already exists for this appointment.'], 409);
            }

            try {
                db_execute(
                    "INSERT INTO prescriptions (appointment_id, doctor_id, prescription_body) VALUES (?, ?, ?)",
                    [$appointmentId, $uid, $body]
                );
                log_audit($uid, "ISSUE_PRESCRIPTION", "Issued prescription for appointment {$appointmentId}");
                json_response(['success' => true, 'message' => 'Prescription saved successfully.']);
            } catch (Exception $e) {
                json_response(['error' => 'Failed to save prescription: ' . $e->getMessage()], 500);
            }
        }

        // FR-30 & FR-31: Generate Consultation Invoice
        if ($action === 'generate_invoice') {
            $amount = (float)($data['amount'] ?? 0);
            if ($amount <= 0) {
                json_response(['error' => 'Please enter a valid consultation fee.'], 400);
            }
            if (!$appt || $appt['status'] !== 'Completed') {
                json_response(['error' => 'Invoices can only be generated for completed appointments.'], 400);
            }

            // Check if already generated (1-to-1 relation)
            $existing = db_query_one("SELECT invoice_id FROM invoices WHERE appointment_id = ?", [$appointmentId]);
            if ($existing) {
                json_response(['error' => 'An invoice already exists for this appointment.'], 409);
            }

            try {
                db_execute(
                    "INSERT INTO invoices (appointment_id, doctor_id, amount, payment_status) VALUES (?, ?, ?, 'Pending')",
                    [$appointmentId, $uid, $amount]
                );
                log_audit($uid, "GENERATE_INVOICE", "Generated invoice for appointment {$appointmentId} amount {$amount}");
                json_response(['success' => true, 'message' => 'Invoice generated successfully.']);
            } catch (Exception $e) {
                json_response(['error' => 'Failed to generate invoice: ' . $e->getMessage()], 500);
            }
        }
    }

    // ----------------------------------------------------
    // Patient Actions: View Prescriptions & Invoices
    // ----------------------------------------------------
    if ($method === 'GET' && $role === 'Patient') {
        // FR-29: View Prescriptions
        if ($action === 'my_prescriptions') {
            $rows = db_query_all(
                "SELECT p.*, u.name AS doctor_name, a.preferred_date FROM prescriptions p " .
                "JOIN appointments a ON p.appointment_id = a.appointment_id " .
                "JOIN users u ON p.doctor_id = u.user_id WHERE a.patient_id = ? " .
                "ORDER BY p.issued_at DESC",
                [$uid]
            );
            json_response(['success' => true, 'prescriptions' => $rows]);
        }

        // FR-32: View Consultation Invoices
        if ($action === 'my_invoices') {
            $rows = db_query_all(
                "SELECT i.*, u.name AS doctor_name, a.preferred_date FROM invoices i " .
                "JOIN appointments a ON i.appointment_id = a.appointment_id " .
                "JOIN users u ON i.doctor_id = u.user_id WHERE a.patient_id = ? " .
                "ORDER BY i.generated_at DESC",
                [$uid]
            );
            json_response(['success' => true, 'invoices' => $rows]);
        }
    }

    json_response(['error' => 'Invalid records request.'], 400);
}
