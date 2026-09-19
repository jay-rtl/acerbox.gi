<?php
// Feed a strong new password over stdin; do not put it in shell history or commit it.
if (PHP_SAPI !== 'cli') exit('CLI only');
$password=rtrim(stream_get_contents(STDIN),"\r\n");
if (strlen($password)<16 || strlen($password)>200) exit("Use a password between 16 and 200 characters.\n");
echo password_hash($password,PASSWORD_DEFAULT),PHP_EOL;
