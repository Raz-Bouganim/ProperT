# kill-ports.ps1
param (
    [int[]]$ports = @(3000)
)

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    
    if ($connections) {
        # Get unique Process IDs
        $processIds = $connections.OwningProcess | Select-Object -Unique

        foreach ($id in $processIds) {
            # Skip System Idle Process (0) and current script process ($PID)
            if ($id -gt 0 -and $id -ne $PID) {
                Write-Host "Killing process $id on port $port..." -ForegroundColor Cyan
                try {
                    Stop-Process -Id $id -Force -ErrorAction Stop
                    Write-Host "Successfully killed process $id." -ForegroundColor Green
                } catch {
                    Write-Host "Failed to kill process $id. It might already be terminated." -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "Port $port is free." -ForegroundColor Green
    }
}
