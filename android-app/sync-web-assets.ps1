$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$targetRoot = Join-Path $PSScriptRoot "app\src\main\assets\web"

New-Item -ItemType Directory -Force $targetRoot | Out-Null

$files = @("index.html", "app.js", "style.css", "manifest.json", "sw.js")
foreach ($file in $files) {
    Copy-Item (Join-Path $projectRoot $file) -Destination $targetRoot -Force
}

Copy-Item (Join-Path $projectRoot "icons") -Destination $targetRoot -Recurse -Force
Copy-Item (Join-Path $projectRoot "vendor") -Destination $targetRoot -Recurse -Force

Write-Host "Android Web assets synced to $targetRoot"

