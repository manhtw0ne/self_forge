[CmdletBinding(DefaultParameterSetName = 'List')]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^https://')]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true, ParameterSetName = 'List')]
    [switch]$List,

    [Parameter(Mandatory = $true, ParameterSetName = 'Review')]
    [switch]$Review,

    [Parameter(ParameterSetName = 'List')]
    [ValidateSet('NEW', 'REVIEWED', 'PLANNED', 'RESOLVED', 'NOT_ACTIONED')]
    [string]$Status,

    [Parameter(ParameterSetName = 'List')]
    [ValidateRange(1, [long]::MaxValue)]
    [long]$BeforeId,

    [Parameter(ParameterSetName = 'List')]
    [ValidateRange(1, 100)]
    [int]$Limit = 20,

    [Parameter(Mandatory = $true, ParameterSetName = 'Review')]
    [ValidateRange(1, [long]::MaxValue)]
    [long]$FeedbackId,

    [Parameter(Mandatory = $true, ParameterSetName = 'Review')]
    [ValidateSet('NEW', 'REVIEWED', 'PLANNED', 'RESOLVED', 'NOT_ACTIONED')]
    [string]$ReviewStatus,

    [Parameter(ParameterSetName = 'Review')]
    [ValidateLength(0, 500)]
    [string]$Note = '',

    [string]$OperatorKey = $env:SELF_FORGE_OPERATOR_KEY
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($OperatorKey)) {
    throw 'Set SELF_FORGE_OPERATOR_KEY or pass -OperatorKey. The key is never written by this script.'
}

$base = $BaseUrl.TrimEnd('/')
$headers = @{ 'X-SelfForge-Operator-Key' = $OperatorKey }
$endpoint = "$base/api/operator/beta-feedback"

if ($List) {
    $query = [System.Collections.Generic.List[string]]::new()
    if ($PSBoundParameters.ContainsKey('Status')) { $query.Add("status=$Status") }
    if ($PSBoundParameters.ContainsKey('BeforeId')) { $query.Add("beforeId=$BeforeId") }
    $query.Add("limit=$Limit")
    $uri = "$endpoint?$($query -join '&')"
    Invoke-RestMethod -Method Get -Uri $uri -Headers $headers |
        Select-Object id, status, type, language, createdAt, reviewedAt, summary, steps, expected, note |
        Format-List
    return
}

$body = @{ status = $ReviewStatus; note = $Note } | ConvertTo-Json -Compress
$result = Invoke-RestMethod -Method Patch -Uri "$endpoint/$FeedbackId" -Headers $headers `
    -ContentType 'application/json' -Body $body

# The returned report still intentionally has no email or account ID. Avoid
# printing the operator key; only the selected review state is confirmed.
Write-Output ("Feedback {0} is now {1}." -f $result.id, $result.status)
