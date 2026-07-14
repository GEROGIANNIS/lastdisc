# Usage: .\make_marker.ps1 [-AppId 12345] [-Title "My Game"] [-OutDir .\disc_root] [-Gui]
param(
    [string]$AppId,
    [string]$Title,
    [string]$OutDir,
    [switch]$Gui
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$PythonScript = Join-Path $ProjectRoot "tools\cd_creator.py"

# Function to check if Python is available in PATH
function Test-PythonAvailable {
    $val = Get-Command python -ErrorAction SilentlyContinue
    return $null -ne $val
}

# If Gui switch is provided, launch GUI server
if ($Gui) {
    if (Test-PythonAvailable) {
        Write-Host "Launching CD Creator GUI..."
        python "$PythonScript" --gui
        exit
    } else {
        Write-Error "Python 3 is required to run the graphical Cover Editor."
        exit 1
    }
}

# If no parameters are provided, go interactive CLI mode
if (-not $AppId -and -not $Title -and -not $OutDir) {
    if (Test-PythonAvailable) {
        Write-Host "No arguments provided. Launching interactive CD Creator script..."
        python "$PythonScript"
        exit
    } else {
        Write-Host "Python 3 was not found in your PATH."
        Write-Host "Usage for manual folder generation:"
        Write-Host "  .\make_marker.ps1 -AppId <appid> -Title '<title>' -OutDir <outdir>"
        exit 1
    }
}

# Ensure all legacy parameters are present if generating folder manually
if (-not $AppId -or -not $Title -or -not $OutDir) {
    Write-Error "For manual directory generation, AppId, Title, and OutDir are all required."
    exit 1
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$manifest = @{ app_id = $AppId; title = $Title; version = "1.0" } | ConvertTo-Json
Set-Content -Path (Join-Path $OutDir "lastdisc.json") -Value $manifest
Write-Host "Wrote $OutDir\lastdisc.json - burn this directory to disc."
Write-Host "Tip: For an interactive menu, Steam search, and Cover Editor, install Python and run: .\make_marker.ps1"
Write-Host "Tip: For the graphical Cover Art Editor, run: .\make_marker.ps1 -Gui"
