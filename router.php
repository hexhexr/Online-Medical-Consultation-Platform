<?php
/**
 * Online Medical Consultation Platform
 * Built-in PHP Development Web Server Router
 * 
 * Usage:
 *   php -S 127.0.0.1:8000 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 1. Route /api requests to backend/api.php
if (str_starts_with($uri, '/api')) {
    require __DIR__ . '/backend/api.php';
    exit;
}

// 2. Map root / to public/index.html
if ($uri === '/' || $uri === '' || $uri === '/index.html') {
    $target = __DIR__ . '/public/index.html';
    if (file_exists($target)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($target);
        exit;
    }
}

// 3. Resolve static asset path inside public/ (supports both /css/... and /public/css/...)
$normalizedUri = preg_replace('#^/public/#', '/', $uri);
$publicFile = __DIR__ . '/public' . $normalizedUri;

if (file_exists($publicFile) && !is_dir($publicFile)) {
    $ext = strtolower(pathinfo($publicFile, PATHINFO_EXTENSION));
    $mimeTypes = [
        'css'   => 'text/css; charset=utf-8',
        'js'    => 'application/javascript; charset=utf-8',
        'json'  => 'application/json; charset=utf-8',
        'svg'   => 'image/svg+xml',
        'png'   => 'image/png',
        'jpg'   => 'image/jpeg',
        'jpeg'  => 'image/jpeg',
        'gif'   => 'image/gif',
        'ico'   => 'image/x-icon',
        'woff'  => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf'   => 'font/ttf',
        'eot'   => 'application/vnd.ms-fontobject',
        'html'  => 'text/html; charset=utf-8',
    ];

    $mime = $mimeTypes[$ext] ?? 'application/octet-stream';
    header("Content-Type: {$mime}");
    header("Content-Length: " . filesize($publicFile));
    readfile($publicFile);
    exit;
}

// 4. Fallback: check with .html extension
if (file_exists($publicFile . '.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($publicFile . '.html');
    exit;
}

// 5. 404 handler
http_response_code(404);
$notFoundPage = __DIR__ . '/public/404.html';
if (file_exists($notFoundPage)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($notFoundPage);
} else {
    echo "404 Not Found";
}
exit;
