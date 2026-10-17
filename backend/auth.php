<?php
/**
 * Online Medical Consultation Platform
 * User Authentication & Session Management (SRS Section 3.1, FR-01 to FR-05)
 */

require_once __DIR__ . '/db.php';

function handle_auth($method, $action) {
    if ($method === 'POST') {
        $data = get_json_input();

        // ----------------------------------------------------
        // FR-01: User Registration
        // ----------------------------------------------------
        if ($action === 'register') {
            $name = trim($data['name'] ?? '');
            $email = strtolower(trim($data['email'] ?? ''));
            $password = (string)($data['password'] ?? '');
            $role = trim($data['role'] ?? 'Patient');

            if (empty($name) || empty($email) || empty($password)) {
                json_response(['error' => 'Name, email and password are required.'], 400);
            }
            if (strlen($name) < 2 || strlen($name) > 255) {
                json_response(['error' => 'Please enter a valid full name.'], 400);
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255) {
                json_response(['error' => 'Please enter a valid email address.'], 400);
            }
            if (strlen($password) < 8) {
                json_response(['error' => 'Password must be at least 8 characters.'], 400);
            }
            if (!in_array($role, ['Patient', 'Doctor'], true)) {
                json_response(['error' => 'Only Patient or Doctor registration is allowed.'], 400);
            }

            // Check if email already exists
            $existing = db_query_one("SELECT user_id FROM users WHERE email = ?", [$email]);
            if ($existing) {
                json_response(['error' => 'Email already registered.'], 400);
            }

            $specialty = null;
            $qualification = null;
            $licenseNumber = null;
            $experienceYears = 0;

            if ($role === 'Doctor') {
                $specialty = trim($data['specialty'] ?? '');
                $qualification = trim($data['qualification'] ?? '');
                $licenseNumber = strtoupper(trim($data['license_number'] ?? ''));
                $experienceYears = filter_var($data['experience_years'] ?? 0, FILTER_VALIDATE_INT);

                if (!in_array($specialty, DOCTOR_SPECIALTIES, true)) {
                    json_response(['error' => 'Please select a valid medical specialty.'], 400);
                }
                if (empty($qualification) || strlen($qualification) > 255) {
                    json_response(['error' => 'Please enter your medical qualification.'], 400);
                }
                if (empty($licenseNumber) || strlen($licenseNumber) > 100) {
                    json_response(['error' => 'Please enter your medical registration/license number.'], 400);
                }
                if ($experienceYears === false || $experienceYears < 0 || $experienceYears > 70) {
                    json_response(['error' => 'Please enter valid years of experience.'], 400);
                }

                // Check license uniqueness
                $licenseExists = db_query_one("SELECT user_id FROM users WHERE license_number = ?", [$licenseNumber]);
                if ($licenseExists) {
                    json_response(['error' => 'This medical registration/license number is already registered.'], 400);
                }
            }

            // Password hashing with bcrypt
            $hashedPassword = hash_password($password);

            try {
                $res = db_execute(
                    "INSERT INTO users (name, email, password_hash, role, specialty, qualification, license_number, experience_years) " .
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [$name, $email, $hashedPassword, $role, $specialty, $qualification, $licenseNumber, $experienceYears]
                );
                $userId = $res['last_id'];
                log_audit($userId, "USER_REGISTER", "Registered as {$role}");
                json_response(['success' => true, 'message' => 'Registration successful. Please login.']);
            } catch (Exception $e) {
                json_response(['error' => 'Registration failed: ' . $e->getMessage()], 500);
            }
        }

        // ----------------------------------------------------
        // FR-02 & FR-03: User Login and Role-bound Session
        // ----------------------------------------------------
        if ($action === 'login') {
            $email = strtolower(trim($data['email'] ?? ''));
            $password = (string)($data['password'] ?? '');

            try {
                $account = db_query_one("SELECT * FROM users WHERE email = ?", [$email]);
            } catch (Exception $e) {
                json_response(['error' => 'Database connection error: ' . $e->getMessage()], 500);
            }

            if (!$account || !verify_password($password, $account['password_hash'])) {
                json_response(['error' => 'Invalid email or password.'], 401);
            }

            if ($account['status'] === 'Suspended') {
                json_response(['error' => 'Account suspended. Contact administrator.'], 403);
            }

            if ($account['role'] === 'Doctor' && empty($account['is_verified'])) {
                json_response(['error' => 'Your doctor account is waiting for administrator verification.'], 403);
            }

            // Create PHP role-bound session
            $_SESSION['user_id'] = (int)$account['user_id'];
            $_SESSION['role'] = $account['role'];
            $_SESSION['name'] = $account['name'];

            log_audit($account['user_id'], "USER_LOGIN", "User logged in successfully.");

            json_response([
                'success' => true,
                'role' => $account['role'],
                'name' => $account['name'],
                'user_id' => (int)$account['user_id']
            ]);
        }
    }

    if ($method === 'GET') {
        // ----------------------------------------------------
        // FR-05: Logout and Session Invalidation
        // ----------------------------------------------------
        if ($action === 'logout') {
            $current = get_auth_user();
            if ($current) {
                log_audit($current['user_id'], "USER_LOGOUT", "User logged out.");
            }
            session_unset();
            session_destroy();
            json_response(['success' => true]);
        }

        // ----------------------------------------------------
        // Session Status Check
        // ----------------------------------------------------
        if ($action === 'session') {
            $current = get_auth_user();
            if (!$current) {
                json_response(['authenticated' => false]);
            }
            json_response([
                'authenticated' => true,
                'user_id' => $current['user_id'],
                'role' => $current['role'],
                'name' => $current['name']
            ]);
        }
    }

    json_response(['error' => 'Invalid authentication request.'], 400);
}
