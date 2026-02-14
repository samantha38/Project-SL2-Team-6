# Script to kill process using port 3000
# Usage: .\kill-port.ps1

$port = 3000
Write-Host "Checking for processes using port $port..." -ForegroundColor Yellow

$connections = netstat -ano | findstr ":$port" | findstr "LISTENING"
if ($connections) {
    $pids = $connections | ForEach-Object {
        if ($_ -match '\s+(\d+)$') {
            $matches[1]
        }
    } | Select-Object -Unique
    
    foreach ($pid in $pids) {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Killing process: $($process.ProcessName) (PID: $pid)" -ForegroundColor Red
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    
    Start-Sleep -Seconds 1
    Write-Host "Port $port is now free!" -ForegroundColor Green
} else {
    Write-Host "Port $port is already free!" -ForegroundColor Green
}

