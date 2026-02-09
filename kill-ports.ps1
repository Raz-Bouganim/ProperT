# kill-ports.ps1
$ports = @(3000, 5000)
foreach ($port in $ports) {
    $pid = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
    if ($pid) {
        Write-Host "Killing process on port $port (PID: $pid)..." -ForegroundColor Cyan
        Stop-Process -Id $pid -Force
    } else {
        Write-Host "Port $port is free." -ForegroundColor Green
    }
}
