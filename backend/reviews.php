<?php
declare(strict_types=1);

function publicReviews(): array {
    return ['reviews'=>query("SELECT client_name, rating, review_text FROM ab_reviews WHERE status='approved' ORDER BY approved_at DESC, id DESC LIMIT 50")->fetchAll()];
}

function submitReview(array $data): array {
    spamCheck($data);
    $name = textField($data, 'client_name', 2, 100);
    $text = textField($data, 'review_text', 10, 2000);
    $rating = $data['rating'] ?? null;
    if (!is_int($rating) || $rating < 1 || $rating > 5) fail(422, 'Choose a rating from 1 to 5.', ['rating'=>'Choose 1–5 stars.']);
    rateLimit('review', 6);
    $fingerprint = hash('sha256', mb_strtolower($name) . '|' . $rating . '|' . $text);
    try {
        query('INSERT INTO ab_reviews(client_name,rating,review_text,fingerprint) VALUES (?,?,?,?)', [$name,$rating,$text,$fingerprint]);
    } catch (PDOException $e) {
        if ($e->getCode()==='23000') fail(409, 'This review has already been submitted.');
        throw $e;
    }
    return ['message'=>'Thanks — your review has been submitted and is awaiting approval.'];
}

function moderateReview(array $data, string $action): array {
    $id = recordId($data);
    if (!query('SELECT id FROM ab_reviews WHERE id=?',[$id])->fetch()) fail(404,'Review not found.');
    if ($action==='delete') query('DELETE FROM ab_reviews WHERE id=?',[$id]);
    elseif ($action==='approve') query("UPDATE ab_reviews SET status='approved', approved_at=COALESCE(approved_at,UTC_TIMESTAMP()),updated_at=UTC_TIMESTAMP() WHERE id=?",[$id]);
    else query("UPDATE ab_reviews SET status='pending', approved_at=NULL,updated_at=UTC_TIMESTAMP() WHERE id=?",[$id]);
    return ['message'=>'Review updated.'];
}
