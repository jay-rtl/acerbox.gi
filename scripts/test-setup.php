<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') exit('CLI only');
putenv('ACERBOX_ENV=test'); putenv('ACERBOX_DB_NAME=acerbox_test'); putenv('ACERBOX_DB_USER=acerbox_test');
require dirname(__DIR__) . '/backend/bootstrap.php';
$c=config();
if ($c['env']!=='test' || $c['db_name']!=='acerbox_test' || $c['db_host']!=='127.0.0.1' || (int)$c['db_port']!==3307) { fwrite(STDERR,"Refusing to reset anything except loopback acerbox_test on 3307.\n"); exit(1); }
db()->exec(file_get_contents(dirname(__DIR__) . '/backend/migrations/001_features.sql'));
foreach (['ab_bookings','ab_slots','ab_reviews','ab_blocked_dates','ab_rate_limits'] as $table) db()->exec("DELETE FROM $table");
$tomorrow=(new DateTimeImmutable('tomorrow',new DateTimeZone($c['timezone'])))->format('Y-m-d');
require dirname(__DIR__) . '/backend/availability.php';
foreach ([['consultation','10:00',null],['consultation','11:00',null],['shoot','10:00','14:00'],['consultation','15:00',null]] as [$type,$time,$end]) {
    addSlot(['booking_type'=>$type,'date'=>$tomorrow,'time'=>$time,'end_time'=>$end]);
}
$past=(new DateTimeImmutable('yesterday',new DateTimeZone($c['timezone'])))->setTime(10,0);
query('INSERT INTO ab_slots(booking_type,starts_at,ends_at) VALUES (?,?,?)',['consultation',utc($past),utc($past->modify('+30 minutes'))]);
echo "Isolated test database reset and clearly fake test slots created.\n";
