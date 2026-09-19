<?php
// Local compiled-preview router: serve ONLY files under dist, with real 404s rather than PHP's index fallback.
$root=realpath(dirname(__DIR__) . '/dist');
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if ($path==='/') return false;
$file=realpath($root . $path);
if ($file && str_starts_with($file,$root . DIRECTORY_SEPARATOR) && is_file($file) && !preg_match('#/\.#',$path)) return false;
http_response_code(404);
header('Content-Type: application/json');
echo '{"error":"Not found."}';
