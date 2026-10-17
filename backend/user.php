<?php
/**
 * Online Medical Consultation Platform
 * User Profile Management (SRS Section 3.9, FR-37 to FR-40)
 */

require_once __DIR__ . '/db.php';

function handle_user($method, $action) {
    $current = get_auth_user();
    if (!$current) {
        json_response(['error' => 'Unauthorized access.'], 401);
    }

    $uid = $current['user_id'];
    $role = $current['role'];

    // ----------------------------------------------------
    // Retrieve Profile
    // ----------------------------------------------------
    if ($method === 'GET' && $action === 'get_profile') {
        $profile = db_query_one(
            "SELECT name, email, specialty, qualification, license_number, experience_years, biography " .
            "FROM users WHERE user_id = ?",
            [$uid]
        );
        if (!$profile) {
            json_response(['error' => 'User not found.'], 404);
        }
        json_response(['success' => true, 'profile' => $profile]);
    }

    // ----------------------------------------------------
    // FR-37 to FR-40: Update Profile
    // ----------------------------------------------------
    if ($method === 'POST' && $action === 'update_profile') {
        $data = get_json_input();
        $name = trim($data['name'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $password = (string)($data['password'] ?? '');
        $currentPassword = (string)($data['current_password'] ?? '');
        $biography = trim($data['biography'] ?? '');

        if (empty($name) || empty($email)) {
            json_response(['error' => 'Name and email are required.'], 400);
        }
        if (strlen($name) < 2 || strlen($name) > 255) {
            json_response(['error' => 'Please enter a valid full name.'], 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255) {
            json_response(['error' => 'Please enter a valid email address.'], 400);
        }
        if (strlen($biography) > 1200) {
            json_response(['error' => 'Biography must be 1200 characters or fewer.'], 400);
        }

        // Check if email taken by someone else
        $taken = db_query_one(
            "SELECT user_id FROM users WHERE email = ? AND user_id != ?",
            [$email, $uid]
        );
        if ($taken) {
            json_response(['error' => 'Email is already in use by another account.'], 400);
        }

        // FR-38: Password change requires confirmation of current password
        $newHash = null;
        if (!empty($password)) {
            $account = db_query_one("SELECT password_hash FROM users WHERE user_id = ?", [$uid]);
            if (empty($currentPassword) || !verify_password($currentPassword, $account['password_hash'])) {
                json_response(['error' => 'Current password is incorrect.'], 400);
            }
            if (strlen($password) < 8) {
                json_response(['error' => 'New password must be at least 8 characters.'], 400);
            }
            $newHash = hash_password($password);
        }

        // Build dynamic update query
        $fields = ["name = ?", "email = ?"];
        $params = [$name, $email];

        if ($newHash !== null) {
            $fields[] = "password_hash = ?";
            $params[] = $newHash;
        }

        // FR-39: Doctors may update biography.
        // FR-40: Doctor cannot update specialty (restricted to Admin).
        if ($role === 'Doctor') {
            $fields[] = "biography = ?";
            $params[] = $biography;
        }

        $params[] = $uid;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE user_id = ?";
        db_execute($sql, $params);

        $_SESSION['name'] = $name;
        log_audit($uid, "PROFILE_UPDATE", "Updated profile information.");

        json_response(['success' => true, 'message' => 'Profile updated successfully.']);
    }

    json_response(['error' => 'Invalid user request.'], 400);
}
