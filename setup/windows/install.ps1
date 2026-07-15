# Installs the LastDisc watcher as a per-user scheduled task
# (runs at logon, LIMITED privileges - do NOT run this elevated).

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$installDir = Join-Path $env:LOCALAPPDATA "LastDisc"
New-Item -ItemType Directory -Path $installDir -Force | Out-Null
Copy-Item (Join-Path $scriptDir "watcher.ps1") $installDir -Force

$currentUser = (Get-CimInstance Win32_ComputerSystem).UserName
if (-not $currentUser) {
    $currentUser = $env:USERDOMAIN + "\" + $env:USERNAME
}

$taskName = "LastDiscWatcher"
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$installDir\watcher.ps1`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force

Write-Host "Installed. Task will start at next logon, or run now with:"
Write-Host "  Start-ScheduledTask -TaskName $taskName"
