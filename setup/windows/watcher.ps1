# LastDisc - Windows watcher (MVP)
# Polls CD/DVD drives for a lastdisc.json manifest and launches the
# referenced Steam/GOG game exactly once per insertion.

$ErrorActionPreference = "SilentlyContinue"
$lockDir = Join-Path $env:TEMP "lastdisc"
$logDir = Join-Path $env:LOCALAPPDATA "LastDisc"
$logFile = Join-Path $logDir "watcher.log"

New-Item -ItemType Directory -Path $lockDir -Force | Out-Null
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$pollSeconds = 2

function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Write-Host $line
    try {
        # Limit log size by rotating/wiping if it exceeds 1MB (approx 10,000 lines)
        if (Test-Path $logFile) {
            $size = (Get-Item $logFile).Length
            if ($size -gt 1MB) {
                Remove-Item $logFile -Force
            }
        }
        Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
    } catch {}
}

function Find-Manifest {
    $cdDrives = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=5 or DriveType=2"
    foreach ($drive in $cdDrives) {
        $path = Join-Path "$($drive.DeviceID)\" "lastdisc.json"
        if (Test-Path $path) { return $path }
    }
    return $null
}

function Launch-Game($manifestPath) {
    $json = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $appId = $json.app_id
    $launcher = $json.launcher
    if (-not $appId) {
        Write-Log "manifest found but app_id missing: $manifestPath"
        return
    }
    $lockFile = Join-Path $lockDir "$appId.lock"
    if (Test-Path $lockFile) { return }  # already launched this insertion
    New-Item -ItemType File -Path $lockFile -Force | Out-Null
    
    if ($launcher -eq "gog") {
        Write-Log "Launching GOG Game ID $appId ($($json.title))"
        Start-Process "goggalaxy://open/launch?dbid=$appId"
    } else {
        Write-Log "Launching Steam AppID $appId ($($json.title))"
        Start-Process "steam://rungameid/$appId"
    }
}

function Clear-StaleLocks {
    if (-not (Find-Manifest)) {
        Get-ChildItem $lockDir -Filter "*.lock" | Remove-Item -Force
    }
}

Write-Log "LastDisc watcher started (poll every $pollSeconds s)"
while ($true) {
    $manifest = Find-Manifest
    if ($manifest) {
        Launch-Game $manifest
    } else {
        Clear-StaleLocks
    }
    Start-Sleep -Seconds $pollSeconds
}
