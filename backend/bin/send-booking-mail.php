<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') { http_response_code(403); exit; }
require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/booking-mail.php';
if (config()['env']!=='production' || !in_array('--allow-send',$argv,true)) {
    fwrite(STDERR,"Mail delivery requires production configuration and explicit --allow-send.\n"); exit(1);
}
$ids=query("SELECT booking_id FROM ab_booking_mail WHERE status='pending' OR (status='sending' AND attempted_at < UTC_TIMESTAMP() - INTERVAL 5 MINUTE) ORDER BY booking_id LIMIT 25")->fetchAll(PDO::FETCH_COLUMN);
foreach ($ids as $id) dispatchBookingMail((int)$id);
echo "Notification queue checked.\n";
