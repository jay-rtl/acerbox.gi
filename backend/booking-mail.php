<?php
declare(strict_types=1);

function bookingMailMessage(array $booking, array $c): array {
    foreach ([$c['mail_to'],$c['mail_from'],$booking['email']] as $address) {
        if (!is_string($address) || preg_match('/[\r\n]/',$address) || !filter_var($address,FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Invalid notification mailbox.');
        }
    }
    $start=local($booking['starts_at']);
    $end=local($booking['ends_at']);
    $body="NEW ACERBOX BOOKING REQUEST #{$booking['id']}\n\n"
        . "Service: " . types()[$booking['booking_type']]['label'] . "\n"
        . "Date: " . $start->format('l, F j, Y') . "\n"
        . "Time: " . $start->format('g:i A') . ' - ' . $end->format('g:i A') . " ({$c['timezone']})\n"
        . "Name: {$booking['name']}\nEmail: {$booking['email']}\nPhone: {$booking['phone']}\n\n"
        . "Project notes:\n{$booking['notes']}\n\n"
        . "This request is pending, not a confirmed appointment. Reply to this email to contact the customer manually.\n"
        . "Manage availability and confirm/cancel the reservation in the protected dashboard:\n"
        . rtrim($c['origin'],'/') . "/admin.html\n";
    return ['to'=>$c['mail_to'],'subject'=>'Acerbox booking request #' . (int)$booking['id'],
        'body'=>$body,'headers'=>['From'=>$c['mail_from'],'Reply-To'=>$booking['email'],
        'MIME-Version'=>'1.0','Content-Type'=>'text/plain; charset=UTF-8','Content-Transfer-Encoding'=>'base64']];
}

function dispatchBookingMail(int $bookingId, ?callable $testSender=null): bool {
    $c=config();
    // No real emails on development/test environments, even if enabled accidentally.
    if ($testSender===null && ($c['env']!=='production' || !filter_var($c['mail_enabled'],FILTER_VALIDATE_BOOLEAN))) return false;
    if ($testSender!==null && $c['env']!=='test') throw new RuntimeException('Test sender is test-only.');
    $booking=query('SELECT * FROM ab_bookings WHERE id=?',[$bookingId])->fetch();
    if (!$booking) return false;
    $message=bookingMailMessage($booking,$c);
    // Atomic lease prevents a request and cron worker emailing the same booking concurrently.
    $claim=query("UPDATE ab_booking_mail SET status='sending',attempts=attempts+1,attempted_at=UTC_TIMESTAMP() WHERE booking_id=? AND (status='pending' OR (status='sending' AND attempted_at < UTC_TIMESTAMP() - INTERVAL 5 MINUTE))",[$bookingId]);
    if (!$claim->rowCount()) return false;
    try {
        $accepted=$testSender ? $testSender($message) : @mail($message['to'],$message['subject'],chunk_split(base64_encode($message['body'])),$message['headers']);
    } catch (Throwable $error) { $accepted=false; }
    query("UPDATE ab_booking_mail SET status=?,accepted_at=? WHERE booking_id=?",[$accepted?'accepted':'pending',$accepted?gmdate('Y-m-d H:i:s'):null,$bookingId]);
    if (!$accepted) error_log('Acerbox owner email deferred for booking #' . $bookingId);
    return (bool)$accepted;
}
