$ErrorActionPreference = "Stop"
$output = "c:\Users\olaitan\Dev\laitstyles\.dbg\final-admin-terminal-response.json"
$started = Get-Date
$result = [ordered]@{
  startedAt = $started.ToString("o")
  url = "http://127.0.0.1:3000/admin"
}
try {
  $response = Invoke-WebRequest $result.url -MaximumRedirection 0 -UseBasicParsing -TimeoutSec 600
  $result.status = [int]$response.StatusCode
  $result.reason = $response.StatusDescription
  $result.location = $response.Headers.Location
  $result.contentType = $response.Headers."Content-Type"
  $result.length = $response.RawContentLength
} catch {
  if ($_.Exception.Response) {
    $response = $_.Exception.Response
    $result.status = [int]$response.StatusCode
    $result.reason = $response.StatusDescription
    $result.location = $response.Headers.Location
    $result.contentType = $response.Headers."Content-Type"
  } else {
    $result.error = $_.Exception.GetType().FullName
    $result.message = $_.Exception.Message
  }
}
$result.elapsedMs = [int]((Get-Date) - $started).TotalMilliseconds
[IO.File]::WriteAllText($output, ($result | ConvertTo-Json))
