[CmdletBinding(DefaultParameterSetName = 'Create')]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^https://')]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true, ParameterSetName = 'Create')]
    [switch]$Create,

    [Parameter(Mandatory = $true, ParameterSetName = 'List')]
    [switch]$List,

    [Parameter(Mandatory = $true, ParameterSetName = 'Revoke')]
    [switch]$Revoke,

    [Parameter(ParameterSetName = 'Create')]
    [ValidateRange(1, 100)]
    [int]$Count = 1,

    [Parameter(ParameterSetName = 'Create')]
    [ValidateRange(1, 1000)]
    [int]$MaxUses = 1,

    [Parameter(ParameterSetName = 'Create')]
    [ValidateLength(0, 80)]
    [string]$Label = 'beta',

    [Parameter(ParameterSetName = 'Create')]
    [datetimeoffset]$ExpiresAt,

    [Parameter(Mandatory = $true, ParameterSetName = 'Revoke')]
    [ValidateRange(1, [long]::MaxValue)]
    [long]$InviteId,

    [string]$OperatorKey = $env:SELF_FORGE_OPERATOR_KEY
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($OperatorKey)) {
    throw 'Set SELF_FORGE_OPERATOR_KEY or pass -OperatorKey. The key is never written by this script.'
}

$base = $BaseUrl.TrimEnd('/')
$headers = @{ 'X-SelfForge-Operator-Key' = $OperatorKey }
$endpoint = "$base/api/operator/beta-invites"

if ($List) {
    Invoke-RestMethod -Method Get -Uri $endpoint -Headers $headers |
        Select-Object id, label, maxUses, useCount, active, expiresAt, createdAt, revokedAt |
        Format-Table -AutoSize
    return
}

if ($Revoke) {
    Invoke-RestMethod -Method Delete -Uri "$endpoint/$InviteId" -Headers $headers | Out-Null
    Write-Output "Invite $InviteId revoked."
    return
}

$issued = [System.Collections.Generic.List[object]]::new()
for ($index = 1; $index -le $Count; $index++) {
    $body = @{ label = if ($Count -eq 1) { $Label } else { "$Label-$index" }; maxUses = $MaxUses }
    if ($PSBoundParameters.ContainsKey('ExpiresAt')) {
        if ($ExpiresAt -le [datetimeoffset]::UtcNow) { throw 'ExpiresAt must be in the future.' }
        $body.expiresAt = $ExpiresAt.ToUniversalTime().ToString('o')
    }
    $response = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -ContentType 'application/json' `
        -Body ($body | ConvertTo-Json -Compress)
    $issued.Add([pscustomobject]@{
        id = $response.id
        label = $response.label
        code = $response.code
        maxUses = $response.maxUses
        expiresAt = $response.expiresAt
    })
}

# A code is shown only here, immediately after it is issued. The server keeps
# only a one-way hash, so `-List` intentionally cannot recover lost codes.
$issued | Format-Table -AutoSize
