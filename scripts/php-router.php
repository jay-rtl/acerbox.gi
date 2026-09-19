<?php
// Development-only router. Never upload this to production.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if ($path==='/api/index.php') { require dirname(__DIR__) . '/backend/api.php'; return true; }
http_response_code(404);
header('Content-Type: application/json');
echo '{"error":"Local API route not found."}';
