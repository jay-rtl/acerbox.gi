<?php
declare(strict_types=1);

function config(): array {
    static $config;
    if ($config !== null) return $config;
    $local = is_file(__DIR__ . '/config.local.php') ? require __DIR__ . '/config.local.php' : [];
    $defaults = ['env'=>'production','origin'=>'https://acerboxbuilds.com','timezone'=>'America/New_York',
        'db_host'=>'127.0.0.1','db_port'=>3306,'db_name'=>'','db_user'=>'','db_password'=>'',
        'admin_username'=>'jake','admin_password_hash'=>'','app_key'=>'','consultation_minutes'=>30,'session_path'=>'',
        'mail_enabled'=>false,'mail_to'=>'Acerbox27@gmail.com','mail_from'=>'',
        'availability_start_hour'=>9,'availability_end_hour'=>17,'shoot_minutes'=>240];
    $config = array_replace($defaults, $local);
    foreach ($config as $key => $value) {
        $env = getenv('ACERBOX_' . strtoupper($key));
        if ($env !== false) $config[$key] = $env;
    }
    if (strlen((string)$config['app_key']) < 32 || !$config['admin_password_hash'] || !$config['db_name']) {
        throw new RuntimeException('Private server configuration is incomplete.');
    }
    if (!in_array((int)$config['consultation_minutes'], [15,30,45,60], true)) throw new RuntimeException('Invalid consultation duration.');
    if ((int)$config['availability_start_hour']<0 || (int)$config['availability_end_hour']>23 || (int)$config['availability_start_hour'] >= (int)$config['availability_end_hour'] || !in_array((int)$config['shoot_minutes'],[60,120,180,240,360,480],true)) throw new RuntimeException('Invalid default availability hours.');
    return $config;
}

function db(): PDO {
    static $db;
    if ($db) return $db;
    $c = config();
    $db = new PDO("mysql:host={$c['db_host']};port={$c['db_port']};dbname={$c['db_name']};charset=utf8mb4",
        $c['db_user'], $c['db_password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);
    $db->exec("SET time_zone = '+00:00'");
    return $db;
}

function query(string $sql, array $values = []): PDOStatement {
    $statement = db()->prepare($sql);
    $statement->execute($values);
    return $statement;
}

function locked(callable $callback): mixed {
    $db = db();
    $db->beginTransaction();
    try {
        query('SELECT id FROM ab_booking_lock WHERE id = 1 FOR UPDATE')->fetch();
        $result = $callback();
        $db->commit();
        return $result;
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

final class ApiError extends RuntimeException {
    public function __construct(public int $status, string $message, public array $fields = []) { parent::__construct($message); }
}

function fail(int $status, string $message, array $fields = []): never { throw new ApiError($status, $message, $fields); }
function respond(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    exit;
}

function startSession(): void {
    $c = config();
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    if ($c['session_path']) session_save_path($c['session_path']);
    session_name('acerbox_session');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$c['env']==='production','httponly'=>true,'samesite'=>'Strict']);
    session_start();
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    $_SESSION['started'] ??= microtime(true);
}

function payload(): array {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 8192) fail(413, 'This request is too large.');
    if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) fail(415, 'Send a JSON request.');
    $raw = file_get_contents('php://input', false, null, 0, 8193);
    if (strlen($raw) > 8192) fail(413, 'This request is too large.');
    try { $data = json_decode($raw, false, 16, JSON_THROW_ON_ERROR); }
    catch (JsonException) { fail(400, 'Invalid JSON request.'); }
    if (!$data instanceof stdClass) fail(400, 'Send a JSON object.');
    return get_object_vars($data);
}

function csrf(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && $origin !== rtrim(config()['origin'], '/')) fail(403, 'This request origin is not allowed.');
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!$token || !hash_equals($_SESSION['csrf'], $token)) fail(403, 'Your session expired. Refresh and try again.');
}

function admin(): void {
    $now = time();
    if (empty($_SESSION['admin']) || !hash_equals(hash('sha256',config()['admin_password_hash']),$_SESSION['auth_version'] ?? '') || $now - ($_SESSION['last_active'] ?? 0) > 1800 || $now - ($_SESSION['login_at'] ?? 0) > 28800) {
        unset($_SESSION['admin']);
        fail(401, 'Please sign in to manage Acerbox.');
    }
    $_SESSION['last_active'] = $now;
}

function rateLimit(string $action, int $maximum = 6, int $seconds = 600): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown'; // Never trust forwarded headers from a visitor.
    $key = hash_hmac('sha256', $action . ':' . $ip . ':' . intdiv(time(), $seconds), config()['app_key']);
    query('INSERT INTO ab_rate_limits (bucket_key, hits, expires_at) VALUES (?,1,?) ON DUPLICATE KEY UPDATE hits=hits+1', [$key, time()+$seconds]);
    if ((int)query('SELECT hits FROM ab_rate_limits WHERE bucket_key=?',[$key])->fetchColumn() > $maximum) {
        header('Retry-After: ' . $seconds);
        fail(429, 'Too many attempts. Please wait and try again.');
    }
    query('DELETE FROM ab_rate_limits WHERE expires_at < ? LIMIT 100', [time()]);
}

function spamCheck(array $data): void {
    if (textField($data,'website',0,200) !== '') fail(422, 'Unable to accept this submission.');
    if (microtime(true) - $_SESSION['started'] < 2) fail(429, 'Please take a moment before submitting.');
}

function textField(array $data, string $key, int $min, int $max): string {
    if (!isset($data[$key]) && $min === 0) return '';
    if (!is_string($data[$key] ?? null)) fail(422, 'Please check the form.', [$key=>'Enter valid text.']);
    $value = trim($data[$key]);
    $length = mb_strlen($value);
    if ($length < $min || $length > $max || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $value)) {
        fail(422, 'Please check the form.', [$key=>"Use between $min and $max characters."]);
    }
    return $value; // Stored as plain text; frontend renders with textContent, never HTML.
}

function recordId(array $data): int {
    if (!is_int($data['id'] ?? null) || $data['id'] < 1) fail(422, 'Choose a valid record.');
    return $data['id'];
}

function types(): array {
    return ['consultation'=>['label'=>'Consultation Call','minutes'=>(int)config()['consultation_minutes']],
        'shoot'=>['label'=>'Shoot Day','minutes'=>null]];
}

function localDateTime(string $date, string $time): DateTimeImmutable {
    $value = "$date $time";
    $dt = DateTimeImmutable::createFromFormat('!Y-m-d H:i', $value, new DateTimeZone(config()['timezone']));
    if (!$dt || $dt->format('Y-m-d H:i') !== $value) fail(422, 'Choose a valid date and time.');
    return $dt;
}

function utc(DateTimeImmutable $dt): string { return $dt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'); }
function local(string $utc): DateTimeImmutable { return (new DateTimeImmutable($utc, new DateTimeZone('UTC')))->setTimezone(new DateTimeZone(config()['timezone'])); }
function overlaps(string $start, string $end, ?int $except = null): bool {
    $sql = "SELECT id FROM ab_bookings WHERE status IN ('pending','confirmed') AND starts_at < ? AND ends_at > ?";
    $values = [$end, $start];
    if ($except !== null) { $sql .= ' AND id <> ?'; $values[]=$except; }
    return (bool)query($sql . ' LIMIT 1', $values)->fetch();
}
