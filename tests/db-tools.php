<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') exit('CLI only');
putenv('ACERBOX_ENV=test'); putenv('ACERBOX_DB_NAME=acerbox_test'); putenv('ACERBOX_DB_USER=acerbox_test');
require dirname(__DIR__) . '/backend/bootstrap.php';
$c=config();
if ($c['db_host']!=='127.0.0.1' || (int)$c['db_port']!==3307 || $c['db_name']!=='acerbox_test' || $c['env']!=='test') { fwrite(STDERR,'Unsafe test database'); exit(1); }
if (($argv[1] ?? '')==='rates') { query('DELETE FROM ab_rate_limits'); exit; }
if (($argv[1] ?? '')==='counts') { echo query('SELECT COUNT(*) FROM ab_bookings')->fetchColumn(),',',query('SELECT COUNT(*) FROM ab_booking_mail')->fetchColumn(); exit; }
if (($argv[1] ?? '')==='legacy-booking') {
    require dirname(__DIR__) . '/backend/availability.php';
    require dirname(__DIR__) . '/backend/bookings.php';
    publicAvailability();
    $slot=query("SELECT * FROM ab_slots WHERE booking_type='consultation' AND active=1 AND starts_at > UTC_TIMESTAMP() ORDER BY starts_at LIMIT 1")->fetch();
    $start=local($slot['starts_at']);
    createReservation((int)$slot['id'],'consultation',$start->format('Y-m-d'),$start->format('H:i'),'Legacy Booking Client','legacy@example.invalid','','Prior-version test fixture only');
    exit;
}
if (($argv[1] ?? '')==='past') { echo json_encode(query('SELECT id,starts_at FROM ab_slots WHERE starts_at < UTC_TIMESTAMP() LIMIT 1')->fetch()); exit; }
