<?php
// Copy to config.local.php OUTSIDE the public web root, or supply environment variables.
return [
    'env' => 'development',
    'origin' => 'http://127.0.0.1:5173',
    'timezone' => 'America/New_York',
    'db_host' => '127.0.0.1', 'db_port' => 3307,
    'db_name' => 'acerbox_dev', 'db_user' => 'acerbox_dev', 'db_password' => '',
    'admin_username' => 'jake', 'admin_password_hash' => '',
    'app_key' => '', // At least 32 random characters; used for privacy-preserving rate-limit keys.
    'consultation_minutes' => 30,
    'session_path' => '', // Optional private, writable directory; otherwise use host PHP session storage.
];
