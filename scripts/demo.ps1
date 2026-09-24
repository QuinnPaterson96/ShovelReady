param(
    [Parameter(Mandatory=$true)][string]$Config,
    [Parameter(Mandatory=$true)][string]$Revision,
    [ValidateRange(1024,65535)][int]$Port = 8012
)
$ErrorActionPreference = 'Stop'
# Resolve an explicitly supplied relative config against the caller before changing directory.
$configPath = [System.IO.Path]::GetFullPath($Config)
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    python -m uv run --locked python scripts/demo.py --config $configPath --revision $Revision --port $Port
    if ($LASTEXITCODE -ne 0) { throw 'Demo failed; see the redacted diagnostic above.' }
} finally {
    Pop-Location
}
