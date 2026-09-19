$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$phpPath = (Get-Command php).Source
if ($phpPath.EndsWith('.bat')) {
    $launcher = Get-Content -LiteralPath $phpPath -Raw
    if ($launcher -match '"([^"\r\n]+php.exe)"') { $phpPath = $Matches[1] } else { throw 'Cannot resolve PHP executable.' }
}
$env:ACERBOX_PRIVATE_DIR = Join-Path $projectRoot 'backend'
$env:ACERBOX_ENV = 'test'
$env:ACERBOX_DB_NAME = 'acerbox_test'
$env:ACERBOX_DB_USER = 'acerbox_test'
$env:ACERBOX_ORIGIN = 'http://127.0.0.1:5174'
$env:ACERBOX_SESSION_PATH = Join-Path $projectRoot '.local/browser-sessions'
New-Item -ItemType Directory -Path $env:ACERBOX_SESSION_PATH -Force | Out-Null
$process = Start-Process -FilePath $phpPath -ArgumentList '-S','127.0.0.1:8083','scripts/php-router.php' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput '.local/php-8083-out.log' -RedirectStandardError '.local/php-8083-error.log'
Write-Output "Isolated browser-test API PID: $($process.Id)"
$env:ACERBOX_LOCAL_API_PORT = '8083'
$process = Start-Process -FilePath (Get-Command node).Source -ArgumentList 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput '.local/vite-test-out.log' -RedirectStandardError '.local/vite-test-error.log'
Write-Output "Isolated browser-test frontend: http://127.0.0.1:5174 (PID $($process.Id))"
