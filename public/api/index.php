<?php
declare(strict_types=1);
// Backend and credentials live OUTSIDE public_html. This file is the only public PHP entrypoint.
$private = getenv('ACERBOX_PRIVATE_DIR') ?: dirname(__DIR__, 2) . '/acerbox-private';
if (!is_file($private . '/api.php')) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo '{"error":"Scheduling and reviews are temporarily unavailable. Please contact Acerbox directly."}';
    exit;
}
require $private . '/api.php';
