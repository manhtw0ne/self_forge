param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$OutputDirectory,
    [ValidateSet('Auto', 'Local', 'Docker')]
    [string]$Tool = 'Auto'
)

# The connection is intentionally read only from standard PostgreSQL
# environment variables. Do not place credentials in command arguments,
# source control, or a scheduled-task definition.
# Required: PGHOST, PGDATABASE, PGUSER, PGPASSWORD
# Optional: PGPORT (5432 by default), PGSSLMODE (for example require).
$ErrorActionPreference = 'Stop'
$requiredEnvironment = @('PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD')
foreach ($name in $requiredEnvironment) {
    if ([string]::IsNullOrWhiteSpace([string][Environment]::GetEnvironmentVariable($name))) {
        throw "$name is required in the environment."
    }
}
$pgPort = if ([string]::IsNullOrWhiteSpace([string]$env:PGPORT)) { '5432' } else { [string]$env:PGPORT }
if ($pgPort -notmatch '^\d{1,5}$' -or [int]$pgPort -lt 1 -or [int]$pgPort -gt 65535) {
    throw 'PGPORT must be a valid TCP port.'
}

try { $destinationRoot = (Resolve-Path -LiteralPath $OutputDirectory -ErrorAction Stop).Path }
catch { throw 'OutputDirectory must already exist and be accessible.' }
if (-not (Get-Item -LiteralPath $destinationRoot).PSIsContainer) {
    throw 'OutputDirectory must be a directory.'
}

$stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$backupName = "selfforge-postgres-$stamp.dump"
$backupPath = Join-Path $destinationRoot $backupName
$checksumPath = "$backupPath.sha256"
if ((Test-Path -LiteralPath $backupPath) -or (Test-Path -LiteralPath $checksumPath)) {
    throw 'Refusing to overwrite an existing backup.'
}

$localDump = Get-Command pg_dump -ErrorAction SilentlyContinue
$localRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if ($Tool -eq 'Auto') {
    $Tool = if ($localDump -and $localRestore) { 'Local' } else { 'Docker' }
}
if ($Tool -eq 'Local' -and (-not $localDump -or -not $localRestore)) {
    throw 'pg_dump and pg_restore must both be installed for -Tool Local. Use -Tool Docker when Docker is available.'
}
if ($Tool -eq 'Docker') {
    & docker info --format '{{.ServerVersion}}' *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Docker is required for -Tool Docker and is not running.' }
}

function Invoke-BackupTool([string[]]$Arguments) {
    if ($Tool -eq 'Local') {
        & pg_dump @Arguments
    } else {
        # --env NAME inherits each secret only from the current process; values
        # are not interpolated into this command. The generated dump alone is
        # mounted into the temporary PostgreSQL-tools container.
        $dockerHost = [string]$env:PGHOST
        # Docker Desktop containers need this bridge to reach a disposable
        # PostgreSQL database bound on the Windows host during restore drills.
        if ($dockerHost -in @('localhost', '127.0.0.1', '::1', '[::1]')) { $dockerHost = 'host.docker.internal' }
        $dockerArguments = @(
            'run', '--rm',
            '--env', "PGHOST=$dockerHost", '--env', "PGPORT=$pgPort", '--env', 'PGDATABASE', '--env', 'PGUSER', '--env', 'PGPASSWORD'
        )
        if (-not [string]::IsNullOrWhiteSpace([string]$env:PGSSLMODE)) { $dockerArguments += @('--env', 'PGSSLMODE') }
        $dockerArguments += @('-v', "${destinationRoot}:/backup", 'postgres:16-alpine') + $Arguments
        & docker @dockerArguments
    }
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL backup command failed.' }
}

try {
    if ($Tool -eq 'Local') {
        Invoke-BackupTool @('--format=custom', '--no-owner', '--no-privileges', "--file=$backupPath", "--dbname=$($env:PGDATABASE)")
        & pg_restore --list $backupPath *> $null
    } else {
        Invoke-BackupTool @('pg_dump', '--format=custom', '--no-owner', '--no-privileges', "--file=/backup/$backupName", "--dbname=$($env:PGDATABASE)")
        Invoke-BackupTool @('pg_restore', '--list', "/backup/$backupName") | Out-Null
    }
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $backupPath) -or (Get-Item -LiteralPath $backupPath).Length -lt 1) {
        throw 'Backup verification failed.'
    }
    $hash = Get-FileHash -LiteralPath $backupPath -Algorithm SHA256
    "$($hash.Hash.ToLowerInvariant()) *$backupName" | Set-Content -LiteralPath $checksumPath -NoNewline -Encoding ascii
    [PSCustomObject]@{
        backup = $backupPath
        checksum = $checksumPath
        sha256 = $hash.Hash.ToLowerInvariant()
        bytes = (Get-Item -LiteralPath $backupPath).Length
        tool = $Tool
        createdAtUtc = [DateTime]::UtcNow.ToString('O')
    }
} catch {
    # A partial dump must never look like a usable backup. The output target is
    # generated above and was confirmed not to exist before this invocation.
    if (Test-Path -LiteralPath $backupPath) {
        Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path -LiteralPath $checksumPath) {
        Remove-Item -LiteralPath $checksumPath -Force -ErrorAction SilentlyContinue
    }
    throw
}
