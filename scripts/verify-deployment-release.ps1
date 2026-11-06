[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$BaseUrl,

    [ValidatePattern('^[a-f0-9]{64}$')]
    [string]$ExpectedRelease = '',

    [ValidateRange(1, 60)]
    [int]$TimeoutSeconds = 15,

    [switch]$AllowInsecureLocalhost
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-Deployment([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

try { $uri = [Uri]$BaseUrl }
catch { throw 'BaseUrl must be an absolute application URL.' }

$isLocalHttp = $AllowInsecureLocalhost.IsPresent -and $uri.Scheme -eq 'http' -and
    $uri.Host -in @('localhost', '127.0.0.1', '[::1]')
if (-not $uri.IsAbsoluteUri -or $uri.UserInfo -or $uri.Query -or $uri.Fragment -or
    $uri.AbsolutePath -notin @('', '/')) {
    throw 'BaseUrl must be an application origin without credentials, path, query, or fragment.'
}
if ($uri.Scheme -ne 'https' -and -not $isLocalHttp) {
    throw 'Use HTTPS for a deployed application. HTTP is allowed only for localhost with -AllowInsecureLocalhost.'
}

$origin = $uri.GetLeftPart([UriPartial]::Authority)
function Get-DeploymentJson([string]$Path) {
    try {
        $response = Invoke-WebRequest -Uri "$origin$Path" -UseBasicParsing -TimeoutSec $TimeoutSeconds `
            -Headers @{ Accept = 'application/json' }
    } catch {
        throw "Could not read $Path from the deployment. Check the URL, deployment health, and network connection."
    }
    Assert-Deployment ($response.StatusCode -eq 200) "$Path did not return HTTP 200."
    try { $body = $response.Content | ConvertFrom-Json -ErrorAction Stop }
    catch { throw "$Path did not return valid JSON." }
    return [pscustomobject]@{ Response = $response; Body = $body }
}

$marker = Get-DeploymentJson '/assets/release.json'
$release = $marker.Body
Assert-Deployment ([string]$marker.Response.Headers['Cache-Control'] -match 'no-cache') 'Release marker must be served with Cache-Control: no-cache.'
Assert-Deployment ($release.release -match '^[a-f0-9]{64}$') 'Release marker has no valid opaque release identifier.'
Assert-Deployment ($release.frontendVersion -match '^[a-f0-9]{64}$') 'Release marker has no valid frontend identifier.'
if ($ExpectedRelease) {
    Assert-Deployment ($release.release -eq $ExpectedRelease) 'The deployed artifact does not match ExpectedRelease.'
}

$frontendMarker = Get-DeploymentJson '/assets/app-version.json'
Assert-Deployment ([string]$frontendMarker.Response.Headers['Cache-Control'] -match 'no-cache') 'Frontend version marker must be served with Cache-Control: no-cache.'
Assert-Deployment ($frontendMarker.Body.version -eq $release.frontendVersion) 'Release marker does not match the deployed frontend version.'

foreach ($path in @('/api/health', '/api/health/ready', '/api/health/live')) {
    $health = Get-DeploymentJson $path
    Assert-Deployment ($health.Body.status -eq 'UP') "$path is not UP."
    Assert-Deployment ($health.Body.release -eq $release.release) "$path does not identify the deployed release artifact."
}

[pscustomobject]@{
    BaseUrl = $origin
    Release = $release.release
    FrontendVersion = $release.frontendVersion
    VerifiedAt = [DateTimeOffset]::UtcNow.ToString('o')
    HealthEndpoints = 3
}
