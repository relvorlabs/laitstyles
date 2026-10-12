$ErrorActionPreference = "Stop"
$root = "c:\Users\olaitan\Dev\laitstyles"
$port = 3000..3010 | Where-Object {
  -not (Get-NetTCPConnection -State Listen -LocalPort $_ -ErrorAction SilentlyContinue)
} | Select-Object -First 1
if (-not $port) {
  throw "No available application port"
}
$stdout = Join-Path $root ".dbg\final-webpack-dev.stdout.log"
$stderr = Join-Path $root ".dbg\final-webpack-dev.stderr.log"
$arguments = @(
  ".\node_modules\next\dist\bin\next",
  "dev",
  "--webpack",
  "--no-server-fast-refresh",
  "--hostname",
  "127.0.0.1",
  "--port",
  [string]$port
)
$node = (Get-Command node -ErrorAction Stop).Source
$process = Start-Process -FilePath $node -ArgumentList $arguments -WorkingDirectory $root -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
[IO.File]::WriteAllText((Join-Path $root ".dbg\final-webpack-launcher.pid"), [string]$process.Id)
[IO.File]::WriteAllText((Join-Path $root ".dbg\final-recovery-port.txt"), [string]$port)
