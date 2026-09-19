<?php
declare(strict_types=1);

function slotDTO(array $row): array {
    $start = local($row['starts_at']);
    $end = local($row['ends_at']);
    return ['id'=>(int)$row['id'],'booking_type'=>$row['booking_type'],'date'=>$start->format('Y-m-d'),
        'time'=>$start->format('H:i'),'end_time'=>$end->format('H:i')];
}

function ensureDefaultAvailability(): void {
    $c=config();
    $today=(new DateTimeImmutable('today',new DateTimeZone($c['timezone'])));
    $values=[]; $placeholders=[];
    for ($day=0;$day<=90;$day++) {
        $date=$today->modify("+$day days");
        foreach (['consultation'=>(int)$c['consultation_minutes'],'shoot'=>(int)$c['shoot_minutes']] as $type=>$minutes) {
            $end=$date->setTime((int)$c['availability_end_hour'],0);
            for ($start=$date->setTime((int)$c['availability_start_hour'],0);$start->modify("+$minutes minutes") <= $end;$start=$start->modify("+$minutes minutes")) {
                $placeholders[]='(?,?,?)'; array_push($values,$type,utc($start),utc($start->modify("+$minutes minutes")));
            }
        }
    }
    // Ignore existing intervals: owner-removed windows must never be reopened automatically.
    query('INSERT IGNORE INTO ab_slots(booking_type,starts_at,ends_at) VALUES ' . implode(',',$placeholders),$values);
}

function windowBlocked(string $start,string $end): bool {
    return (bool)query('SELECT id FROM ab_blocked_windows WHERE starts_at < ? AND ends_at > ? LIMIT 1',[$end,$start])->fetch();
}

function publicAvailability(): array {
    ensureDefaultAvailability();
    $now = new DateTimeImmutable('now', new DateTimeZone(config()['timezone']));
    $rows = query('SELECT s.*, EXISTS(SELECT 1 FROM ab_bookings b WHERE b.status IN (\'pending\',\'confirmed\') AND b.starts_at < s.ends_at AND b.ends_at > s.starts_at) AS reserved, EXISTS(SELECT 1 FROM ab_blocked_windows w WHERE w.starts_at < s.ends_at AND w.ends_at > s.starts_at) AS blocked_window FROM ab_slots s WHERE s.active=1 AND s.starts_at >= ? AND s.starts_at < ? ORDER BY s.starts_at',
        [utc($now->setTime(0,0)),utc($now->modify('+91 days')->setTime(0,0))])->fetchAll();
    $blocked = query('SELECT blocked_date FROM ab_blocked_dates')->fetchAll(PDO::FETCH_COLUMN);
    $slots = array_map(function ($row) use ($blocked, $now) {
        $dto=slotDTO($row);
        $dto['status']=in_array($dto['date'],$blocked,true) || $row['blocked_window'] ? 'blocked' : (local($row['starts_at']) <= $now ? 'past' : ($row['reserved'] ? 'booked' : 'available'));
        return $dto;
    },$rows);
    return ['timezone'=>config()['timezone'],'today'=>$now->format('Y-m-d'),'last_date'=>$now->modify('+90 days')->format('Y-m-d'),'types'=>types(),'slots'=>$slots,'blocked_dates'=>$blocked];
}

function addSlot(array $data): array {
    $type = $data['booking_type'] ?? '';
    if (!is_string($type) || !isset(types()[$type])) fail(422,'Choose a supported booking type.');
    $start = localDateTime(textField($data,'date',10,10), textField($data,'time',5,5));
    $now = new DateTimeImmutable('now',new DateTimeZone(config()['timezone']));
    if ($start <= $now || $start > $now->modify('+90 days')) fail(422,'Availability must be in the next 90 days.');
    $end = $type==='consultation' ? $start->modify('+' . config()['consultation_minutes'] . ' minutes') : localDateTime($start->format('Y-m-d'),textField($data,'end_time',5,5));
    $duration = ($end->getTimestamp()-$start->getTimestamp()) / 60;
    if ($end->format('Y-m-d')!==$start->format('Y-m-d') || ($type==='shoot' && ($duration < 60 || $duration > 720))) fail(422,'Shoot windows must be 1–12 hours within the same day.');
    return locked(function () use ($type,$start,$end) {
        query('INSERT INTO ab_slots(booking_type,starts_at,ends_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE active=1',[$type,utc($start),utc($end)]);
        return ['message'=>'Availability saved.'];
    });
}

function changeAvailability(array $data, string $action): array {
    return locked(function () use ($data,$action) {
        if ($action==='block-window') {
            $date=textField($data,'date',10,10);
            $start=localDateTime($date,textField($data,'time',5,5));
            $end=localDateTime($date,textField($data,'end_time',5,5));
            $now=new DateTimeImmutable('now',new DateTimeZone(config()['timezone']));
            if ($end <= $start || $end <= $now || $start > $now->modify('+90 days')) fail(422,'Choose a future time range within the next 90 days.');
            query('INSERT IGNORE INTO ab_blocked_windows(starts_at,ends_at) VALUES (?,?)',[utc($start),utc($end)]);
            return ['message'=>'Time range blocked for all booking types. Existing requests are unchanged.'];
        }
        if ($action==='unblock-window') {
            query('DELETE FROM ab_blocked_windows WHERE id=?',[recordId($data)]);
            return ['message'=>'Time range unblocked. Existing reservations still apply.'];
        }
        if ($action==='remove') {
            $id=recordId($data);
            query('UPDATE ab_slots SET active=0 WHERE id=?',[$id]);
        } else {
            $date=textField($data,'date',10,10);
            localDateTime($date,'12:00');
            if ($action==='block') query('INSERT IGNORE INTO ab_blocked_dates(blocked_date) VALUES (?)',[$date]);
            else query('DELETE FROM ab_blocked_dates WHERE blocked_date=?',[$date]);
        }
        return ['message'=>'Availability updated. Existing booking requests are unchanged.'];
    });
}
