<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require dirname(__DIR__) . '/bootstrap.php';
if (config()['env'] === 'production' && !in_array('--allow-production', $argv, true)) {
    fwrite(STDERR,"Refusing production migration without explicit --allow-production.\n"); exit(1);
}
db()->exec(file_get_contents(dirname(__DIR__) . '/migrations/001_features.sql'));
echo "Additive feature migration applied to ", config()['db_name'], ".\n";
