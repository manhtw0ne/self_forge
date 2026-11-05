param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$BaseUrl,
    [ValidatePattern('^\d{4}-\d{2}-\d{2}$')]
    [string]$From = '',
    [ValidatePattern('^\d{4}-\d{2}-\d{2}$')]
    [string]$Through = ''
)

# Read the access key only from the environment. This avoids placing a
# production secret in a command history, saved script, or process listing.
$ErrorActionPreference = 'Stop'
$key = [string]$env:BETA_METRICS_KEY
if ([string]::IsNullOrWhiteSpace($key)) {
    throw 'BETA_METRICS_KEY is required in the environment.'
}
if ($key.Length -gt 256) {
    throw 'BETA_METRICS_KEY is invalid.'
}

try { $uri = [Uri]$BaseUrl }
catch { throw 'BaseUrl must be an absolute application URL.' }
if (-not $uri.IsAbsoluteUri -or $uri.UserInfo -or $uri.Query -or $uri.Fragment) {
    throw 'BaseUrl must be an absolute application URL without credentials, query, or fragment.'
}
$localHttp = $uri.Scheme -eq 'http' -and $uri.Host -in @('localhost', '127.0.0.1', '[::1]')
if ($uri.Scheme -ne 'https' -and -not $localHttp) {
    throw 'Use HTTPS for a deployed application. HTTP is allowed only for localhost.'
}

$utcToday = [DateTime]::UtcNow.Date
if ([string]::IsNullOrWhiteSpace($Through)) { $Through = $utcToday.ToString('yyyy-MM-dd') }
if ([string]::IsNullOrWhiteSpace($From)) { $From = $utcToday.AddDays(-6).ToString('yyyy-MM-dd') }
try {
    $fromDate = [DateTime]::ParseExact($From, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None).Date
    $throughDate = [DateTime]::ParseExact($Through, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None).Date
} catch {
    throw 'Dates must be valid calendar dates in YYYY-MM-DD format.'
}
if ($throughDate -lt $fromDate -or ($throughDate - $fromDate).Days -ge 366) {
    throw 'The requested range must be ordered and no longer than 366 days.'
}

$origin = $uri.GetLeftPart([UriPartial]::Authority)
$endpoint = "$origin/api/operator/beta-metrics?from=$([Uri]::EscapeDataString($From))&through=$([Uri]::EscapeDataString($Through))"
try {
    $report = Invoke-RestMethod -Uri $endpoint -Headers @{'X-SelfForge-Operator-Key' = $key} -TimeoutSec 20
} catch {
    throw 'Could not read beta metrics. Check the app URL, BETA_METRICS_KEY, endpoint configuration, and network connection.'
}
$requiredFields = @(
    'from', 'through', 'timezone', 'generatedAt', 'registrations',
    'usersWhoCreatedHabit', 'usersWhoCompletedCheckIn', 'activatedUsers',
    'day1EligibleUsers', 'usersActivatedWithinDay1', 'day7EligibleUsers',
    'usersWithCheckInAfterDay7', 'feedbackReports', 'weeklyAiSuggestions',
    'weeklyAiRatings', 'weeklyAiWillTry'
)
$missingFields = @($requiredFields | Where-Object { -not $report.PSObject.Properties[$_] })
if ($missingFields.Count -gt 0) {
    throw 'The beta metrics response did not match the expected aggregate-only contract.'
}

# Return only the server's aggregate contract so callers can pipe it to
# Format-List, ConvertTo-Json, or a private reporting workflow.
[PSCustomObject]@{
    from = $report.from
    through = $report.through
    timezone = $report.timezone
    generatedAt = $report.generatedAt
    registrations = $report.registrations
    usersWhoCreatedHabit = $report.usersWhoCreatedHabit
    usersWhoCompletedCheckIn = $report.usersWhoCompletedCheckIn
    activatedUsers = $report.activatedUsers
    day1EligibleUsers = $report.day1EligibleUsers
    usersActivatedWithinDay1 = $report.usersActivatedWithinDay1
    day7EligibleUsers = $report.day7EligibleUsers
    usersWithCheckInAfterDay7 = $report.usersWithCheckInAfterDay7
    feedbackReports = $report.feedbackReports
    weeklyAiSuggestions = $report.weeklyAiSuggestions
    weeklyAiRatings = $report.weeklyAiRatings
    weeklyAiWillTry = $report.weeklyAiWillTry
}
