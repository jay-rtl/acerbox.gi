<?php
declare(strict_types=1);
putenv('ACERBOX_ENV=test'); putenv('ACERBOX_DB_NAME=acerbox_test'); putenv('ACERBOX_DB_USER=acerbox_test');
require dirname(__DIR__) . '/scripts/test-setup.php';
require dirname(__DIR__) . '/backend/bookings.php';
function check(bool $ok,string $label): void { if (!$ok) throw new RuntimeException($label); echo "PASS $label\n"; }
$date=(new DateTimeImmutable('+5 days',new DateTimeZone(config()['timezone'])))->format('Y-m-d');
$availability=publicAvailability();
$slots=array_values(array_filter($availability['slots'],fn($slot)=>$slot['date']===$date));
check(count($slots)===18 && count(array_filter($slots,fn($slot)=>$slot['status']==='available'))===18,'future dates available without owner setup');
check(count(array_filter($availability['slots'],fn($slot)=>$slot['date']===$availability['last_date']))===18,'entire 90-day horizon remains selectable');
$slot=array_values(array_filter($slots,fn($slot)=>$slot['booking_type']==='consultation' && $slot['time']==='10:00'))[0];
changeAvailability(['date'=>$date,'time'=>'09:45','end_time'=>'10:15'],'block-window');
$rows=publicAvailability()['slots'];
check(count(array_filter($rows,fn($row)=>$row['date']===$date && $row['status']==='blocked'))===3,'time block affects overlapping consultations and shoots');
try { createReservation($slot['id'],'consultation',$date,'10:00','Blocked Test','test@example.invalid','',''); throw new LogicException('Blocked time accepted'); }
catch (ApiError $error) { check($error->status===409,'server rejects booking a manually blocked time'); }
$blockId=(int)query('SELECT id FROM ab_blocked_windows LIMIT 1')->fetchColumn();
changeAvailability(['id'=>$blockId],'unblock-window');
$result=createReservation($slot['id'],'consultation',$date,'10:00','Default Test','test@example.invalid','','');
check(isset($result['notification_id']),'unblocked default time can be reserved');
$rows=publicAvailability()['slots'];
check(count(array_filter($rows,fn($row)=>$row['date']===$date && $row['status']==='booked'))===2,'reservation prevents overlapping consultation and shoot');
changeAvailability(['date'=>$date],'block');
check(count(array_filter(publicAvailability()['slots'],fn($row)=>$row['date']===$date && $row['status']==='blocked'))===18,'whole-day block disables all default slots');
changeAvailability(['date'=>$date],'unblock');
check(query('SELECT status FROM ab_bookings WHERE id=?',[$result['notification_id']])->fetchColumn()==='pending','blocking/unblocking preserves existing booking');
$remove=array_values(array_filter($slots,fn($row)=>$row['booking_type']==='consultation' && $row['time']==='16:00'))[0];
changeAvailability(['id'=>$remove['id']],'remove');
check(!in_array($remove['id'],array_column(publicAvailability()['slots'],'id'),true),'calendar regeneration never reopens owner-removed slot');
