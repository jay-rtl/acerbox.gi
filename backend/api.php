<?php
declare(strict_types=1);
ini_set('display_errors','0');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
try {
    require_once __DIR__ . '/bootstrap.php';
    require_once __DIR__ . '/reviews.php';
    require_once __DIR__ . '/availability.php';
    require_once __DIR__ . '/bookings.php';
    startSession();
    $route=$_GET['route'] ?? 'context';
    $method=$_SERVER['REQUEST_METHOD'];
    if (!is_string($route)) fail(400,'Invalid route.');
    if ($method==='GET') {
        if ($route==='context') {
            $authenticated=false;
            if (!empty($_SESSION['admin'])) { try { admin(); $authenticated=true; } catch (ApiError) {} }
            respond(['csrf'=>$_SESSION['csrf'],'authenticated'=>$authenticated,'timezone'=>config()['timezone'],'types'=>types()]);
        }
        if ($route==='reviews') respond(publicReviews());
        if ($route==='availability') respond(publicAvailability());
        if ($route==='admin/reviews') { admin(); respond(['reviews'=>query('SELECT id,client_name,rating,review_text,status,created_at FROM ab_reviews ORDER BY id DESC LIMIT 500')->fetchAll()]); }
        if ($route==='admin/bookings') { admin(); respond(['bookings'=>array_map('bookingDTO',query('SELECT * FROM ab_bookings ORDER BY starts_at DESC LIMIT 500')->fetchAll())]); }
        if ($route==='admin/availability') {
            admin(); respond(['slots'=>array_map('slotDTO',query('SELECT * FROM ab_slots WHERE active=1 ORDER BY starts_at DESC LIMIT 500')->fetchAll()),'blocked_dates'=>query('SELECT blocked_date FROM ab_blocked_dates ORDER BY blocked_date')->fetchAll(PDO::FETCH_COLUMN)]);
        }
        fail(404,'Endpoint not found.');
    }
    if ($method!=='POST') { header('Allow: GET, POST'); fail(405,'This method is not allowed.'); }
    csrf();
    $data=payload();
    if ($route==='login') {
        rateLimit('login',5,900);
        $username=textField($data,'username',1,100);
        $password=textField($data,'password',1,200);
        $c=config();
        $validPassword=password_verify($password,$c['admin_password_hash']);
        if (!hash_equals($c['admin_username'],$username) || !$validPassword) fail(401,'The sign-in details are incorrect.');
        session_regenerate_id(true);
        $_SESSION=['csrf'=>bin2hex(random_bytes(32)),'started'=>microtime(true),'admin'=>true,'auth_version'=>hash('sha256',$c['admin_password_hash']),'login_at'=>time(),'last_active'=>time()];
        respond(['message'=>'Signed in.','csrf'=>$_SESSION['csrf']]);
    }
    if ($route==='logout') { admin(); $_SESSION=[]; session_destroy(); respond(['message'=>'Signed out.']); }
    if ($route==='reviews') respond(submitReview($data),201);
    if ($route==='bookings') respond(submitBooking($data),201);
    if (str_starts_with($route,'admin/')) {
        admin();
        $actions=[
            'admin/reviews/approve'=>fn()=>moderateReview($data,'approve'),
            'admin/reviews/unpublish'=>fn()=>moderateReview($data,'unpublish'),
            'admin/reviews/delete'=>fn()=>moderateReview($data,'delete'),
            'admin/bookings/confirm'=>fn()=>manageBooking($data,'confirm'),
            'admin/bookings/cancel'=>fn()=>manageBooking($data,'cancel'),
            'admin/availability/add'=>fn()=>addSlot($data),
            'admin/availability/remove'=>fn()=>changeAvailability($data,'remove'),
            'admin/availability/block'=>fn()=>changeAvailability($data,'block'),
            'admin/availability/unblock'=>fn()=>changeAvailability($data,'unblock'),
        ];
        if (isset($actions[$route])) respond($actions[$route]());
    }
    fail(404,'Endpoint not found.');
} catch (ApiError $error) { respond(['error'=>$error->getMessage(),'fields'=>$error->fields],$error->status); }
catch (Throwable $error) {
    $reference=bin2hex(random_bytes(6));
    error_log('Acerbox API error ' . $reference . ' (' . get_class($error) . ')');
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['error'=>'Temporarily unavailable. Please try again or contact Acerbox directly.','reference'=>$reference]);
}
