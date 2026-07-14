# Usage: .\make_marker.ps1 -AppId 12345 -Title "My Game" -OutDir .\disc_root
param(
    [Parameter(Mandatory=$true)][string]$AppId,
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][string]$OutDir
)
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$manifest = @{ app_id = $AppId; title = $Title; version = "1.0" } | ConvertTo-Json
Set-Content -Path (Join-Path $OutDir "lastdisc.json") -Value $manifest
Write-Host "Wrote $OutDir\lastdisc.json - burn this directory to disc."
