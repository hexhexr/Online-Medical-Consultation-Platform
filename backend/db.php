<?php
/**
 * Online Medical Consultation Platform
 * Centralized Database Connection & Helper Functions
 * 
 * Complies with SRS Section 2.5, 4.3 & 4.5:
 * - Uses PHP PDO with prepared statements exclusively to prevent SQL Injection
 * - Database target: MySQL 8.0 (XAMPP / LAMP Stack)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Database configuration (Complies with SRS Section 2.5 & 4.3: MySQL 8.0 via PDO)
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'medconsult_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');

const DOCTOR_SPECIALTIES = [
    'General Practitioner',
    'Cardiologist',
    'Endocrinologist',
    'Dermatologist',
    'Orthopedist',
    'Neurologist',
    'Gastroenterologist',
    'Pulmonologist'
];

/**
 * Returns a shared PDO MySQL database connection.
 * Exclusively connects to MySQL 8.0 using prepared statements (SRS Section 4.3 & 4.5).
 */
function get_db() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    return $pdo;
}

/**
 * Execute a SELECT query and return all matching rows as an array.
 */
function db_query_all($sql, $params = []) {
    $stmt = get_db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

/**
 * Execute a SELECT query and return a single row, or null.
 */
function db_query_one($sql, $params = []) {
    $stmt = get_db()->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE statement.
 * Returns array with ['last_id' => ..., 'rows_affected' => ...].
 */
function db_execute($sql, $params = []) {
    $db = get_db();
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return [
        'last_id' => $db->lastInsertId(),
        'rows_affected' => $stmt->rowCount(),
    ];
}

/**
 * Record an entry into the system audit log.
 */
function log_audit($user_id, $action_type, $description) {
    try {
        db_execute(
            "INSERT INTO audit_log (user_id, action_type, description) VALUES (?, ?, ?)",
            [$user_id, $action_type, $description]
        );
    } catch (Exception $e) {
        // Prevent audit logging failures from crashing main requests
        error_log("Audit log failed: " . $e->getMessage());
    }
}

/**
 * Output structured JSON response and terminate script.
 */
function json_response($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

/**
 * Parse incoming JSON body for POST/PUT requests.
 */
function get_json_input() {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Validates active session and retrieves user details.
 * Enforces Role-Based Access Control (RBAC).
 */
function get_auth_user($allowedRoles = null) {
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    $userId = (int)$_SESSION['user_id'];
    $account = db_query_one(
        "SELECT user_id, name, email, role, status, is_verified FROM users WHERE user_id = ?",
        [$userId]
    );

    if (!$account || $account['status'] !== 'Active') {
        session_unset();
        session_destroy();
        return null;
    }

    if ($account['role'] === 'Doctor' && empty($account['is_verified'])) {
        session_unset();
        session_destroy();
        return null;
    }

    if ($allowedRoles !== null) {
        if (is_string($allowedRoles) && $account['role'] !== $allowedRoles) {
            return null;
        }
        if (is_array($allowedRoles) && !in_array($account['role'], $allowedRoles, true)) {
            return null;
        }
    }

    $_SESSION['role'] = $account['role'];
    $_SESSION['name'] = $account['name'];

    return [
        'user_id' => (int)$account['user_id'],
        'role' => $account['role'],
        'name' => $account['name'],
        'email' => $account['email']
    ];
}

/**
 * Verifies a password against stored bcrypt hash (SRS Section 6 Security Requirement).
 */
function verify_password($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Hash password using bcrypt algorithm (SRS NFR Requirement).
 */
function hash_password($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}
