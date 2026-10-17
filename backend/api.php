<?php
/**
 * Online Medical Consultation Platform
 * Main API Dispatcher / Front Controller
 * 
 * Routes incoming /api/{endpoint} requests to the respective PHP controllers.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/appointments.php';
require_once __DIR__ . '/messaging.php';
require_once __DIR__ . '/records.php';
require_once __DIR__ . '/user.php';
require_once __DIR__ . '/public.php';
require_once __DIR__ . '/triage.php';
require_once __DIR__ . '/admin.php';

// Allow CORS for local development if needed
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Determine route and action
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

// Extract endpoint from URI: e.g. /api/auth or /api/triage
$route = $_GET['route'] ?? '';
if (empty($route)) {
    if (preg_match('#^/api/([a-zA-Z0-9_-]+)#', $requestUri, $matches)) {
        $route = $matches[1];
    } elseif (preg_match('#^/api#', $requestUri)) {
        $route = 'index';
    }
}
$route = strtolower(trim($route, '/'));

switch ($route) {
    case 'auth':
        handle_auth($method, $action);
        break;

    case 'appointments':
        handle_appointments($method, $action);
        break;

    case 'messaging':
        handle_messaging($method, $action);
        break;

    case 'records':
        handle_records($method, $action);
        break;

    case 'user':
        handle_user($method, $action);
        break;

    case 'public':
        handle_public($method, $action);
        break;

    case 'triage':
        handle_triage($method);
        break;

    case 'contact':
        handle_contact($method);
        break;

    case 'admin':
        handle_admin($method, $action);
        break;

    default:
        json_response([
            'error' => 'API endpoint not found.',
            'requested_route' => $route
        ], 404);
}
