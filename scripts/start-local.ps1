param([switch]$Tests)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$phpPath = (Get-Command php).Source
if ($phpPath.EndsWith('.bat')) {
    $launcher = Get-Content -LiteralPath $phpPath -Raw
    if ($launcher -match '"([^"\r\n]+php.exe)"') { $phpPath = $Matches[1] } else { throw 'Cannot resolve PHP executable.' }
}
$env:ACERBOX_PRIVATE_DIR = Join-Path $projectRoot 'backend'
if ($Tests) {
    $env:ACERBOX_ENV = 'test'
    $env:ACERBOX_DB_NAME = 'acerbox_test'
    $env:ACERBOX_DB_USER = 'acerbox_test'
    $env:ACERBOX_ORIGIN = 'http://127.0.0.1:8081'
    $env:ACERBOX_SESSION_PATH = Join-Path $projectRoot '.local/test-sessions'
    New-Item -ItemType Directory -Path $env:ACERBOX_SESSION_PATH -Force | Out-Null
    $ports = @(8081,8082)
} else { $ports = @(8080) }
foreach ($port in $ports) {
    $process = Start-Process -FilePath $phpPath -ArgumentList '-S',"127.0.0.1:$port",'scripts/php-router.php' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput ".local/php-$port-out.log" -RedirectStandardError ".local/php-$port-error.log"
    Write-Output "PHP API: http://127.0.0.1:$port (PID $($process.Id))"
}
if (!$Tests) {
    $nodePath = (Get-Command node).Source
    $process = Start-Process -FilePath $nodePath -ArgumentList 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput '.local/vite-out.log' -RedirectStandardError '.local/vite-error.log'
    Write-Output "Preview: http://127.0.0.1:5173 (PID $($process.Id))"
}
