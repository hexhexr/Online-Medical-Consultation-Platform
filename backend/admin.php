<?php
/**
 * Online Medical Consultation Platform
 * Administrator Control Panel (SRS Section 3.8, FR-33 to FR-36 & FR-40)
 */

require_once __DIR__ . '/db.php';

function handle_admin($method, $action) {
    // FR-04: Administrator only access
    $current = get_auth_user('Administrator');
    if (!$current) {
        json_response(['error' => 'Unauthorized access. Administrators only.'], 403);
    }

    $adminId = $current['user_id'];

    // ----------------------------------------------------
    // GET Requests: Metrics, Lists, Audit Logs, Messages
    // ----------------------------------------------------
    if ($method === 'GET') {
        // FR-36: Platform Metrics
        if ($action === 'metrics') {
            $totalUsers = (int)db_query_one("SELECT COUNT(*) AS n FROM users")['n'];
            $activeAppts = (int)db_query_one("SELECT COUNT(*) AS n FROM appointments WHERE status = 'Confirmed'")['n'];
            $pendingDocs = (int)db_query_one("SELECT COUNT(*) AS n FROM users WHERE role = 'Doctor' AND is_verified = 0")['n'];

            json_response([
                'success' => true,
                'metrics' => [
                    'total_users' => $totalUsers,
                    'active_appointments' => $activeAppts,
                    'pending_doctors' => $pendingDocs
                ]
            ]);
        }

        // Pending Doctor Registrations
        if ($action === 'pending_doctors') {
            $doctors = db_query_all(
                "SELECT user_id, name, email, specialty, qualification, license_number, experience_years, created_at " .
                "FROM users WHERE role = 'Doctor' AND is_verified = 0 ORDER BY created_at DESC"
            );
            json_response(['success' => true, 'doctors' => $doctors]);
        }

        // Manage User Accounts
        if ($action === 'list_users') {
            $users = db_query_all(
                "SELECT user_id, name, email, role, specialty, qualification, license_number, experience_years, " .
                "is_verified, status, created_at FROM users ORDER BY user_id ASC"
            );
            json_response(['success' => true, 'users' => $users]);
        }

        // FR-35: Audit Log Monitoring
        if ($action === 'audit_logs') {
            $logs = db_query_all(
                "SELECT a.*, u.name AS user_name FROM audit_log a " .
                "LEFT JOIN users u ON a.user_id = u.user_id " .
                "ORDER BY a.logged_at DESC LIMIT 100"
            );
            json_response(['success' => true, 'logs' => $logs]);
        }

        // Support Inquiries
        if ($action === 'contact_messages') {
            $messages = db_query_all(
                "SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100"
            );
            json_response(['success' => true, 'messages' => $messages]);
        }
    }

    // ----------------------------------------------------
    // POST Requests: Verifications, User State, Specialty
    // ----------------------------------------------------
    if ($method === 'POST') {
        $data = get_json_input();

        // Contact Message Status Update
        if ($action === 'update_contact_status') {
            $messageId = (int)($data['message_id'] ?? 0);
            $status = trim($data['status'] ?? '');

            if (!$messageId || !in_array($status, ['New', 'Resolved'], true)) {
                json_response(['error' => 'Invalid contact message update.'], 400);
            }

            $res = db_execute(
                "UPDATE contact_messages SET status = ? WHERE message_id = ?",
                [$status, $messageId]
            );

            if ($res['rows_affected'] === 0) {
                json_response(['error' => 'Contact message not found.'], 404);
            }

            log_audit($adminId, "CONTACT_STATUS", "Set contact message {$messageId} to {$status}");
            json_response(['success' => true, 'message' => 'Support message status updated.']);
        }

        $target = (int)($data['user_id'] ?? 0);
        if (!$target) {
            json_response(['error' => 'User ID is required.'], 400);
        }

        // FR-33: Review, Approve, or Reject Doctor Applications
        if ($action === 'verify_doctor') {
            $decision = strtolower(trim($data['decision'] ?? ''));

            if ($decision === 'approve') {
                $doc = db_query_one(
                    "SELECT specialty, qualification, license_number FROM users WHERE user_id = ? AND role = 'Doctor' AND is_verified = 0",
                    [$target]
                );
                if (!$doc) {
                    json_response(['error' => 'Pending doctor not found.'], 404);
                }
                if (!in_array($doc['specialty'], DOCTOR_SPECIALTIES, true) || empty($doc['qualification']) || empty($doc['license_number'])) {
                    json_response(['error' => 'Doctor professional details must be complete before approval.'], 400);
                }

                db_execute("UPDATE users SET is_verified = 1 WHERE user_id = ? AND role = 'Doctor'", [$target]);
                log_audit($adminId, "VERIFY_DOCTOR", "Approved doctor ID {$target}");
                json_response(['success' => true, 'message' => 'Doctor approved successfully.']);
            }

            if ($decision === 'reject') {
                $res = db_execute("DELETE FROM users WHERE user_id = ? AND role = 'Doctor' AND is_verified = 0", [$target]);
                if ($res['rows_affected'] === 0) {
                    json_response(['error' => 'Pending doctor not found.'], 404);
                }
                log_audit($adminId, "REJECT_DOCTOR", "Rejected doctor application ID {$target}");
                json_response(['success' => true, 'message' => 'Doctor application rejected.']);
            }

            json_response(['error' => 'Invalid decision.'], 400);
        }

        // FR-34: Suspend or Activate User Accounts
        if ($action === 'update_user_status') {
            $status = trim($data['status'] ?? '');
            if (!in_array($status, ['Active', 'Suspended'], true)) {
                json_response(['error' => 'Invalid status.'], 400);
            }
            if ($target === $adminId && $status === 'Suspended') {
                json_response(['error' => 'You cannot suspend your own account.'], 400);
            }

            $res = db_execute("UPDATE users SET status = ? WHERE user_id = ?", [$status, $target]);
            if ($res['rows_affected'] === 0) {
                json_response(['error' => 'User not found.'], 404);
            }

            log_audit($adminId, "UPDATE_USER_STATUS", "Set user ID {$target} status to {$status}");
            json_response(['success' => true, 'message' => "User status updated to {$status}."]);
        }

        // FR-40: Administrator Change Doctor Medical Specialty
        if ($action === 'edit_specialty') {
            $specialty = trim($data['specialty'] ?? '');
            if (!in_array($specialty, DOCTOR_SPECIALTIES, true)) {
                json_response(['error' => 'Please select a valid specialty.'], 400);
            }

            $res = db_execute("UPDATE users SET specialty = ? WHERE user_id = ? AND role = 'Doctor'", [$specialty, $target]);
            if ($res['rows_affected'] === 0) {
                json_response(['error' => 'Doctor not found.'], 404);
            }

            log_audit($adminId, "EDIT_SPECIALTY", "Changed doctor {$target} specialty to {$specialty}");
            json_response(['success' => true, 'message' => 'Doctor specialty updated.']);
        }

        // FR-34: Permanently Delete User Account
        if ($action === 'delete_user') {
            if ($target === $adminId) {
                json_response(['error' => 'You cannot delete your own account.'], 400);
            }

            $res = db_execute("DELETE FROM users WHERE user_id = ?", [$target]);
            if ($res['rows_affected'] === 0) {
                json_response(['error' => 'User not found.'], 404);
            }

            log_audit($adminId, "DELETE_USER", "Permanently deleted user ID {$target}");
            json_response(['success' => true, 'message' => 'User permanently deleted.']);
        }
    }

    json_response(['error' => 'Invalid admin request.'], 400);
}
