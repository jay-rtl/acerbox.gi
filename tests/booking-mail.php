<?php
declare(strict_types=1);
putenv('ACERBOX_ENV=test'); putenv('ACERBOX_DB_NAME=acerbox_test'); putenv('ACERBOX_DB_USER=acerbox_test');
putenv('ACERBOX_MAIL_FROM=bookings@example.invalid');
require dirname(__DIR__) . '/backend/bootstrap.php';
require dirname(__DIR__) . '/backend/bookings.php';
$c=config();
if ($c['db_host']!=='127.0.0.1' || (int)$c['db_port']!==3307 || $c['db_name']!=='acerbox_test') exit('Unsafe test database');
require dirname(__DIR__) . '/scripts/test-setup.php';
function check(bool $ok,string $label): void { if (!$ok) throw new RuntimeException($label); echo "PASS $label\n"; }
$slot=query("SELECT * FROM ab_slots WHERE booking_type='consultation' AND starts_at > UTC_TIMESTAMP() ORDER BY starts_at LIMIT 1")->fetch();
$start=local($slot['starts_at']);
$result=createReservation((int)$slot['id'],'consultation',$start->format('Y-m-d'),$start->format('H:i'),'Email Test','customer@example.invalid','','Test project');
$id=$result['notification_id'];
check(query('SELECT status FROM ab_booking_mail WHERE booking_id=?',[$id])->fetchColumn()==='pending','reservation queues owner notification atomically');
check(!dispatchBookingMail($id),'local/test environment never sends real mail');
check(!dispatchBookingMail($id,fn($message)=>false),'delivery failure is reported without losing booking');
check(query('SELECT status FROM ab_booking_mail WHERE booking_id=?',[$id])->fetchColumn()==='pending','failed delivery remains retryable');
$captured=null;
check(dispatchBookingMail($id,function ($message) use (&$captured) { $captured=$message; return true; }),'retry accepts notification');
check($captured['to']==='Acerbox27@gmail.com' && $captured['headers']['Reply-To']==='customer@example.invalid','fixed owner recipient and customer Reply-To');
check(str_contains($captured['body'],'Consultation Call') && str_contains($captured['body'],'Test project') && str_contains($captured['body'],'/admin.html'),'email contains schedule, form details and dashboard link');
check(!dispatchBookingMail($id,fn($message)=>throw new RuntimeException('must not resend')),'accepted notification is not sent twice');
check(query('SELECT status FROM ab_bookings WHERE id=?',[$id])->fetchColumn()==='pending','email does not automatically confirm request');
$booking=query('SELECT * FROM ab_bookings WHERE id=?',[$id])->fetch();
$booking['email']="customer@example.invalid\r\nBcc: victim@example.invalid";
try { bookingMailMessage($booking,$c); throw new LogicException('Header injection accepted'); }
catch (RuntimeException $error) { if ($error instanceof LogicException) throw $error; echo "PASS header injection rejected\n"; }
