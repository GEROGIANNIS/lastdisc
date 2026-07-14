# Removes the LastDisc scheduled task and installed files.

Unregister-ScheduledTask -TaskName "LastDiscWatcher" -Confirm:$false -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $env:LOCALAPPDATA "LastDisc") -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "LastDisc watcher removed."
