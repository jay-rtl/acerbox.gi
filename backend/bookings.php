<?php
declare(strict_types=1);

function submitBooking(array $data): array {
    spamCheck($data);
    $name=textField($data,'name',2,100);
    $email=textField($data,'email',3,254);
    if (!filter_var($email,FILTER_VALIDATE_EMAIL)) fail(422,'Enter a valid email address.',['email'=>'Enter a valid email address.']);
    $phone=textField($data,'phone',0,40);
    if ($phone && !preg_match('/^[0-9+() .-]{5,40}$/',$phone)) fail(422,'Enter a valid phone number.',['phone'=>'Check your phone number.']);
    $notes=textField($data,'notes',0,2000);
    $type=$data['booking_type'] ?? '';
    if (!is_string($type) || !isset(types()[$type])) fail(422,'Choose a supported booking type.',['booking_type'=>'Choose a supported type.']);
    $id=recordId($data);
    // Date/time are submitted explicitly, but only the server-stored interval is trusted.
    $date=textField($data,'date',10,10);
    $time=textField($data,'time',5,5);
    localDateTime($date,$time);
    rateLimit('booking',8);
    return createReservation($id,$type,$date,$time,$name,$email,$phone,$notes);
}

function createReservation(int $id,string $type,string $date,string $time,string $name,string $email,string $phone,string $notes): array {
    return locked(function () use ($id,$type,$date,$time,$name,$email,$phone,$notes) {
        $slot=query('SELECT * FROM ab_slots WHERE id=? AND active=1 FOR UPDATE',[$id])->fetch();
        if (!$slot || $slot['booking_type']!==$type) fail(409,'That time is no longer available. Please choose another.');
        $start=local($slot['starts_at']);
        if ($start->format('Y-m-d')!==$date || $start->format('H:i')!==$time) fail(422,'The selected date and time do not match this slot.');
        if ($start <= new DateTimeImmutable('now')) fail(422,'Choose a future date and time.');
        if (query('SELECT blocked_date FROM ab_blocked_dates WHERE blocked_date=?',[$date])->fetch() || overlaps($slot['starts_at'],$slot['ends_at'])) fail(409,'That time is no longer available. Please choose another.');
        query('INSERT INTO ab_bookings(slot_id,name,email,phone,booking_type,starts_at,ends_at,notes) VALUES (?,?,?,?,?,?,?,?)',[$id,$name,$email,$phone,$type,$slot['starts_at'],$slot['ends_at'],$notes]);
        return ['message'=>'Your booking request has been received. Acerbox will follow up to confirm availability.'];
    });
}

function bookingDTO(array $row): array {
    $dto=slotDTO($row);
    foreach (['name','email','phone','notes','status','created_at'] as $key) $dto[$key]=$row[$key];
    return $dto;
}

function manageBooking(array $data, string $action): array {
    return locked(function () use ($data,$action) {
        $id=recordId($data);
        $booking=query('SELECT * FROM ab_bookings WHERE id=? FOR UPDATE',[$id])->fetch();
        if (!$booking) fail(404,'Booking not found.');
        if ($action==='confirm') {
            if ($booking['status']==='cancelled') fail(409,'Cancelled requests cannot be reopened. Create a new request.');
            if (local($booking['starts_at']) <= new DateTimeImmutable('now')) fail(409,'Past bookings cannot be confirmed.');
            if (overlaps($booking['starts_at'],$booking['ends_at'],$id)) fail(409,'This request conflicts with another reservation.');
        }
        query('UPDATE ab_bookings SET status=?,updated_at=UTC_TIMESTAMP() WHERE id=?',[$action==='confirm'?'confirmed':'cancelled',$id]);
        return ['message'=>'Booking updated.'];
    });
}
