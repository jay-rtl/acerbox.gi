$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (!(Test-Path -LiteralPath "$projectRoot/dist/index.html")) { throw 'Run npm run build first.' }
$phpPath = (Get-Command php).Source
if ($phpPath.EndsWith('.bat')) {
    $launcher = Get-Content -LiteralPath $phpPath -Raw
    if ($launcher -match '"([^"\r\n]+php.exe)"') { $phpPath = $Matches[1] } else { throw 'Cannot resolve PHP executable.' }
}
$env:ACERBOX_PRIVATE_DIR = Join-Path $projectRoot 'backend'
$env:ACERBOX_ENV = 'development'
$env:ACERBOX_DB_NAME = 'acerbox_dev'
$env:ACERBOX_DB_USER = 'acerbox_dev'
$env:ACERBOX_ORIGIN = 'http://127.0.0.1:8084'
$process = Start-Process -FilePath $phpPath -ArgumentList '-S','127.0.0.1:8084','-t','dist','scripts/php-built-router.php' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput '.local/php-8084-out.log' -RedirectStandardError '.local/php-8084-error.log'
Write-Output "Compiled local preview: http://127.0.0.1:8084 (PID $($process.Id)). Development DB only."
