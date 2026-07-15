# Removes the LastDisc scheduled task, tray app, and installed files.

Stop-Process -Name "LastDiscTray" -Force -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "LastDiscTray" -ErrorAction SilentlyContinue

Unregister-ScheduledTask -TaskName "LastDiscWatcher" -Confirm:$false -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $env:LOCALAPPDATA "LastDisc") -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "LastDisc watcher removed."
