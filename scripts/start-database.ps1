$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$binary = Join-Path $projectRoot '.local/mariadb-11.4.12-winx64/bin/mariadbd.exe'
$dataDirectory = Join-Path $projectRoot '.local/db-data'
if (!(Test-Path -LiteralPath $binary) -or !(Test-Path -LiteralPath "$dataDirectory/my.ini")) { throw 'The approved portable MariaDB/local data setup is missing. See docs/FEATURES.md.' }
$connection = New-Object System.Net.Sockets.TcpClient
try { $connection.Connect('127.0.0.1',3307); Write-Output 'Port 3307 is already listening; no second database process was started.'; return }
catch { } finally { $connection.Dispose() }
$process = Start-Process -FilePath $binary -ArgumentList '--no-defaults',"--basedir=`"$projectRoot/.local/mariadb-11.4.12-winx64`"", "--datadir=`"$dataDirectory`"",'--bind-address=127.0.0.1','--port=3307','--console' -WindowStyle Hidden -PassThru -RedirectStandardOutput "$projectRoot/.local/db-out.log" -RedirectStandardError "$projectRoot/.local/db-error.log"
Write-Output "Project-local MariaDB on 127.0.0.1:3307 (PID $($process.Id)). No service installed."
