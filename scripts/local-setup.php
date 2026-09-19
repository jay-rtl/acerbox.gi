<?php
declare(strict_types=1);
// Only this explicitly loopback-only setup script knows local bootstrap credentials.
if (PHP_SAPI !== 'cli') exit('CLI only.');
$root=dirname(__DIR__);
$path=$root . '/backend/config.local.php';
if (is_file($path)) exit("Local config already exists; no credentials were changed.\n");
$db=new PDO('mysql:host=127.0.0.1;port=3307;charset=utf8mb4','root','acerbox-local-root-only',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$password=bin2hex(random_bytes(24));
foreach (['dev','test'] as $env) {
    $name='acerbox_' . $env;
    $db->exec("CREATE DATABASE IF NOT EXISTS $name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $db->exec('CREATE USER IF NOT EXISTS ' . $db->quote($name) . "@'127.0.0.1' IDENTIFIED BY " . $db->quote($password));
    $db->exec("GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON $name.* TO " . $db->quote($name) . "@'127.0.0.1'");
}
$adminPassword=bin2hex(random_bytes(12));
$config=['env'=>'development','origin'=>'http://127.0.0.1:5173','timezone'=>'America/New_York','db_host'=>'127.0.0.1','db_port'=>3307,
    'db_name'=>'acerbox_dev','db_user'=>'acerbox_dev','db_password'=>$password,'admin_username'=>'jake',
    'admin_password_hash'=>password_hash($adminPassword,PASSWORD_DEFAULT),'app_key'=>bin2hex(random_bytes(32)),
    'consultation_minutes'=>30,'session_path'=>$root . '/.local/sessions'];
if (!is_dir($config['session_path'])) mkdir($config['session_path'],0700,true);
file_put_contents($path,"<?php\nreturn " . var_export($config,true) . ";\n");
file_put_contents($root . '/.local/admin-credentials.txt',"LOCAL DEVELOPMENT ONLY\nUsername: jake\nPassword: $adminPassword\n");
echo "Local config created. Sign-in details saved privately in .local/admin-credentials.txt.\n";
