param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$BackupPath,
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z][A-Za-z0-9_]{0,62}$')]
    [string]$TargetDatabase,
    [Parameter(Mandatory = $true)]
    [switch]$ConfirmRestore,
    [ValidateSet('Auto', 'Local', 'Docker')]
    [string]$Tool = 'Auto'
)

# This script is deliberately for restore drills and isolated recovery only.
# It refuses a non-empty target, never drops a database, and reads credentials
# only from PGHOST/PGPORT/PGUSER/PGPASSWORD/PGSSLMODE environment variables.
$ErrorActionPreference = 'Stop'
foreach ($name in @('PGHOST', 'PGUSER', 'PGPASSWORD')) {
    if ([string]::IsNullOrWhiteSpace([string][Environment]::GetEnvironmentVariable($name))) {
        throw "$name is required in the environment."
    }
}
if ($TargetDatabase -notmatch '(?i)(^|_)(restore|staging|drill|test)(_|$)') {
    throw 'TargetDatabase must be clearly named as an isolated restore, staging, drill, or test database.'
}
if (-not $ConfirmRestore) {
    throw 'Pass -ConfirmRestore to acknowledge that this writes only to the isolated target database.'
}
$pgPort = if ([string]::IsNullOrWhiteSpace([string]$env:PGPORT)) { '5432' } else { [string]$env:PGPORT }
if ($pgPort -notmatch '^\d{1,5}$' -or [int]$pgPort -lt 1 -or [int]$pgPort -gt 65535) {
    throw 'PGPORT must be a valid TCP port.'
}

try { $backup = Get-Item -LiteralPath $BackupPath -ErrorAction Stop }
catch { throw 'BackupPath must point to an accessible dump file.' }
if ($backup.PSIsContainer -or $backup.Extension -ne '.dump') {
    throw 'BackupPath must be a PostgreSQL custom .dump file.'
}
$checksumPath = "$($backup.FullName).sha256"
if (-not (Test-Path -LiteralPath $checksumPath)) {
    throw 'The adjacent SHA-256 checksum file is required before restore.'
}
$checksumParts = (Get-Content -LiteralPath $checksumPath -Raw).Trim() -split '\s+\*', 2
if ($checksumParts.Count -ne 2 -or $checksumParts[0] -notmatch '^[A-Fa-f0-9]{64}$' -or $checksumParts[1] -ne $backup.Name) {
    throw 'The checksum file is malformed or belongs to a different backup.'
}
if ((Get-FileHash -LiteralPath $backup.FullName -Algorithm SHA256).Hash -ine $checksumParts[0]) {
    throw 'The backup checksum does not match. Do not restore this file.'
}

$localPsql = Get-Command psql -ErrorAction SilentlyContinue
$localRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if ($Tool -eq 'Auto') { $Tool = if ($localPsql -and $localRestore) { 'Local' } else { 'Docker' } }
if ($Tool -eq 'Local' -and (-not $localPsql -or -not $localRestore)) {
    throw 'psql and pg_restore must both be installed for -Tool Local. Use -Tool Docker when Docker is available.'
}
if ($Tool -eq 'Docker') {
    & docker info --format '{{.ServerVersion}}' *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Docker is required for -Tool Docker and is not running.' }
}

function Invoke-PostgresTool([string]$Command, [string[]]$Arguments, [bool]$MountBackup = $false) {
    if ($Tool -eq 'Local') {
        if ($Command -eq 'psql') { & psql @Arguments } else { & pg_restore @Arguments }
    } else {
        $dockerHost = [string]$env:PGHOST
        if ($dockerHost -in @('localhost', '127.0.0.1', '::1', '[::1]')) { $dockerHost = 'host.docker.internal' }
        $dockerArguments = @('run', '--rm', '--env', "PGHOST=$dockerHost", '--env', "PGPORT=$pgPort", '--env', 'PGUSER', '--env', 'PGPASSWORD')
        if (-not [string]::IsNullOrWhiteSpace([string]$env:PGSSLMODE)) { $dockerArguments += @('--env', 'PGSSLMODE') }
        if ($MountBackup) { $dockerArguments += @('-v', "$($backup.DirectoryName):/backup") }
        $dockerArguments += @('postgres:16-alpine', $Command) + $Arguments
        & docker @dockerArguments
    }
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL $Command command failed." }
}

function Read-TargetTableCount {
    $rows = @(Invoke-PostgresTool 'psql' @('--no-psqlrc', '--tuples-only', '--no-align', "--dbname=$TargetDatabase", '-c', "select count(*) from pg_catalog.pg_tables where schemaname = 'public';"))
    $value = ($rows | Where-Object { $_ -match '^\s*\d+\s*$' } | Select-Object -Last 1).Trim()
    if ($value -notmatch '^\d+$') { throw 'Could not confirm whether the target database is empty.' }
    return [int]$value
}

$before = Read-TargetTableCount
if ($before -ne 0) {
    throw 'TargetDatabase is not empty. Restore only into a newly created isolated database.'
}

if ($Tool -eq 'Local') {
    Invoke-PostgresTool 'pg_restore' @('--exit-on-error', '--no-owner', '--no-privileges', "--dbname=$TargetDatabase", $backup.FullName) | Out-Null
} else {
    Invoke-PostgresTool 'pg_restore' @('--exit-on-error', '--no-owner', '--no-privileges', "--dbname=$TargetDatabase", "/backup/$($backup.Name)") $true | Out-Null
}
$after = Read-TargetTableCount
if ($after -lt 1) {
    throw 'Restore finished without creating any public tables; inspect the isolated target before retrying.'
}

[PSCustomObject]@{
    backup = $backup.FullName
    targetDatabase = $TargetDatabase
    publicTablesBefore = $before
    publicTablesAfter = $after
    tool = $Tool
    restoredAtUtc = [DateTime]::UtcNow.ToString('O')
}
