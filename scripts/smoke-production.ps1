param(
    [string]$Image = 'selfforge:release-check',
    [ValidateRange(0, 100)][int]$LoadUsers = 0,
    [ValidateRange(256, 8192)][int]$MemoryMb = 512,
    [ValidateRange(0.25, 8)][double]$CpuLimit = 1,
    [ValidateRange(60, 600)][int]$StartupTimeoutSeconds = 180,
    [ValidateLength(0, 256)][string]$BetaInviteCode = '',
    [ValidateLength(0, 256)][string]$BetaMetricsKey = '',
    [switch]$ManagedBetaInvites
)

# Runs only against disposable local containers; never connects to the deployed app.
$ErrorActionPreference = 'Stop'
$PSDefaultParameterValues = @{ 'Invoke-RestMethod:TimeoutSec' = 20; 'Invoke-WebRequest:TimeoutSec' = 20 }
$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 12)
$network = "sf-smoke-$suffix"
$database = "$network-db"
$app = "$network-app"
$password = [Guid]::NewGuid().ToString('N')
$loadTrustForwardedClientAddress = if ($LoadUsers -gt 0) { 'true' } else { 'false' }
# A load run represents separate devices. Keep the production global limit for
# normal smoke tests, but avoid its aggregate ceiling masking the workflow
# under test when $LoadUsers is explicitly requested. Per-email throttling is
# still exercised by the login-throttling assertion below.
$loadLoginGlobalLimit = if ($LoadUsers -gt 0) { [Math]::Max(500, $LoadUsers + 200) } else { 120 }
if ([string]::IsNullOrWhiteSpace($BetaMetricsKey)) {
    $BetaMetricsKey = [Guid]::NewGuid().ToString('N')
}

function Invoke-Docker {
    $Arguments = $args
    $output = & docker @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Docker command failed: $($Arguments[0])" }
    return $output
}

function Assert-Smoke([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

function Assert-Unauthorized([hashtable]$Headers) {
    $status = 0
    try { $null = Invoke-WebRequest "$base/api/profile/data" -Headers $Headers -UseBasicParsing }
    catch { $status = [int]$_.Exception.Response.StatusCode }
    Assert-Smoke ($status -eq 401) 'A revoked session can still access private data.'
}

function Wait-Healthy {
    $deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
    $healthClock = [Diagnostics.Stopwatch]::StartNew()
    $lastHealthFailure = 'No response yet.'
    do {
        $runtimeState = Invoke-Docker inspect --format '{{.State.Status}} {{.State.OOMKilled}}' $app
        if ($runtimeState -match '^(exited|dead) ') { throw "Production container stopped before readiness (state / OOM: $runtimeState)." }
        try {
            $health = Invoke-RestMethod "$base/api/health" -TimeoutSec 10
            if ($health.status -eq 'UP') { Write-Output ("Health check ready after {0}s." -f [Math]::Round($healthClock.Elapsed.TotalSeconds,2)); return }
            $lastHealthFailure = "Health status: $($health.status)"
        } catch { $lastHealthFailure = $_.Exception.Message }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw "Production container did not become healthy within $StartupTimeoutSeconds seconds. Last response: $lastHealthFailure"
}

try {
    $null = Invoke-Docker info --format '{{.ServerVersion}}'
    $null = Invoke-Docker network create $network
    $null = Invoke-Docker run -d --name $database --network $network `
        --tmpfs /var/lib/postgresql/data -e POSTGRES_DB=selfforge `
        -e POSTGRES_USER=smoke -e "POSTGRES_PASSWORD=$password" postgres:16-alpine
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        & docker exec $database pg_isready -U smoke -d selfforge *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 2
    }
    Assert-Smoke $ready 'PostgreSQL did not become ready.'
    $null = Invoke-Docker run -d --name $app --network $network --memory "${MemoryMb}m" --memory-swap "${MemoryMb}m" --cpus $CpuLimit.ToString([System.Globalization.CultureInfo]::InvariantCulture) -p '127.0.0.1::8080' `
        -e "DATABASE_URL=jdbc:postgresql://${database}:5432/selfforge" `
        -e DATABASE_USERNAME=smoke -e "DATABASE_PASSWORD=$password" `
        -e "BETA_INVITE_CODE=$BetaInviteCode" -e "BETA_METRICS_KEY=$BetaMetricsKey" `
        -e "BETA_MANAGED_INVITES_ENABLED=$($ManagedBetaInvites.IsPresent.ToString().ToLowerInvariant())" `
        -e "TRUST_FORWARDED_CLIENT_ADDRESS=$loadTrustForwardedClientAddress" `
        -e "LOGIN_ATTEMPT_GLOBAL_LIMIT=$loadLoginGlobalLimit" $Image
    $binding = Invoke-Docker port $app 8080
    $base = "http://$($binding.Trim())"
    Write-Output "Checking production readiness with ${MemoryMb}MiB memory and $CpuLimit CPU."
    Wait-Healthy
    Write-Output 'Production ready; checking frontend assets.'
    $runtime = (Invoke-Docker inspect $app | ConvertFrom-Json)[0]
    Assert-Smoke ($runtime.Config.User -eq 'selfforge') 'Runtime must use the non-root user.'
    Assert-Smoke ($runtime.Config.Env -contains 'SPRING_PROFILES_ACTIVE=prod') 'Runtime must default to prod.'
    $page = Invoke-WebRequest "$base/login" -UseBasicParsing
    Assert-Smoke ($page.Content -match 'assets/index-') 'Frontend was not included in the image.'
    foreach ($route in @('/', '/login', '/privacy', '/terms', '/email-change-recovery', '/habits', '/journal', '/check-in-history', '/stats', '/challenges', '/rewards', '/pomodoro', '/review', '/goals', '/reminders', '/companion', '/coach', '/help', '/profile', '/premium')) {
        $deepLink = Invoke-WebRequest "$base$route" -UseBasicParsing
        Assert-Smoke ($deepLink.StatusCode -eq 200 -and $deepLink.Content -eq $page.Content) "Direct application route failed: $route"
    }
    $assets = [regex]::Matches($page.Content, '(?:src|href)="(/assets/[^" ]+)"')
    Assert-Smoke ($assets.Count -ge 2) 'Frontend entry assets are missing.'
    foreach ($asset in $assets) {
        $response = Invoke-WebRequest "$base$($asset.Groups[1].Value)" -UseBasicParsing
        Assert-Smoke ($response.StatusCode -eq 200 -and $response.Headers['Content-Type'] -notmatch 'text/html') 'An asset resolved to an HTML fallback.'
    }
    $manifestResponse = Invoke-WebRequest "$base/manifest.webmanifest" -UseBasicParsing
    $manifestText = if ($manifestResponse.Content -is [byte[]]) {
        [System.Text.Encoding]::UTF8.GetString($manifestResponse.Content)
    } else { [string]$manifestResponse.Content }
    $manifest = $manifestText | ConvertFrom-Json
    Assert-Smoke ($manifest.display -eq 'standalone' -and $manifest.start_url -eq '/') "Install manifest is invalid: display=$($manifest.display), start_url=$($manifest.start_url), content type=$($manifestResponse.Headers['Content-Type'])."
    Assert-Smoke ([string]$manifestResponse.Headers['Cache-Control'] -match 'no-cache') 'Install manifest must be revalidated.'
    foreach ($icon in $manifest.icons) {
        $iconResponse = Invoke-WebRequest "$base$($icon.src)" -UseBasicParsing
        Assert-Smoke ($iconResponse.StatusCode -eq 200 -and $iconResponse.Headers['Content-Type'] -match 'image/png') 'Install icon is missing or has the wrong content type.'
    }
    $worker = Invoke-WebRequest "$base/sw.js" -UseBasicParsing
    Assert-Smoke ($worker.Headers['Content-Type'] -match 'javascript' -and $worker.Headers['Cache-Control'] -match 'no-cache') 'Offline worker must be served as revalidated JavaScript.'
    $offline = Invoke-WebRequest "$base/offline.html" -UseBasicParsing
    Assert-Smoke ($offline.StatusCode -eq 200 -and $offline.Content -match 'SelfForge') 'Offline fallback is missing.'
    $inviteRequired = -not [string]::IsNullOrWhiteSpace($BetaInviteCode) -or $ManagedBetaInvites.IsPresent
    $activeInviteCode = $BetaInviteCode
    $registrationAvailability = Invoke-RestMethod "$base/api/auth/registration/availability"
    Assert-Smoke ([bool]$registrationAvailability.inviteRequired -eq $inviteRequired) 'Registration did not expose the expected beta invitation policy.'
    if ($inviteRequired) {
        $missingInviteStatus = 0
        try {
            $null = Invoke-WebRequest "$base/api/auth/register" -Method Post -ContentType 'application/json' -UseBasicParsing `
                -Body (@{email="blocked-$suffix@example.com"; displayName='Blocked beta'; password=$password; termsAccepted=$true} | ConvertTo-Json)
        } catch { if ($_.Exception.Response) { $missingInviteStatus = [int]$_.Exception.Response.StatusCode } }
        Assert-Smoke ($missingInviteStatus -eq 403) 'Closed beta accepted a registration without an invitation code.'
        if ($ManagedBetaInvites.IsPresent) {
            $operatorHeaders = @{'X-SelfForge-Operator-Key'=$BetaMetricsKey}
            $managedInvite = Invoke-RestMethod "$base/api/operator/beta-invites" -Method Post -Headers $operatorHeaders -ContentType 'application/json' `
                -Body (@{label='Smoke managed invite'; maxUses=1} | ConvertTo-Json)
            Assert-Smoke ($managedInvite.code -is [string] -and $managedInvite.code.Length -ge 16) 'Managed invite was not issued with a usable code.'
            $managedInviteList = @(Invoke-RestMethod "$base/api/operator/beta-invites" -Headers $operatorHeaders)
            Assert-Smoke ($managedInviteList.Count -eq 1 -and $managedInviteList[0].id -eq $managedInvite.id) 'Managed invite was not listed for the operator.'
            $managedInviteFields = @($managedInviteList[0].PSObject.Properties.Name)
            Assert-Smoke ($managedInviteFields -notcontains 'code' -and $managedInviteFields -notcontains 'codeHash') 'Managed invite list leaked a usable secret.'
            $activeInviteCode = $managedInvite.code
        }
    }
    $registrationBody = @{email="smoke-$suffix@example.com"; displayName='Release smoke'; password=$password; termsAccepted=$true}
    if ($inviteRequired) { $registrationBody.inviteCode = $activeInviteCode }
    $registration = $registrationBody | ConvertTo-Json
    Write-Output 'Checking registration and data writes.'
    $auth = Invoke-RestMethod "$base/api/auth/register" -Method Post -ContentType 'application/json' -Body $registration
    $headers = @{Authorization="Bearer $($auth.token)"}
    if ($ManagedBetaInvites.IsPresent) {
        $reusedInviteStatus = 0
        try {
            $null = Invoke-WebRequest "$base/api/auth/register" -Method Post -ContentType 'application/json' -UseBasicParsing `
                -Body (@{email="managed-reuse-$suffix@example.com"; displayName='Blocked reuse'; password=$password; termsAccepted=$true; inviteCode=$activeInviteCode} | ConvertTo-Json)
        } catch { if ($_.Exception.Response) { $reusedInviteStatus = [int]$_.Exception.Response.StatusCode } }
        Assert-Smoke ($reusedInviteStatus -eq 403) 'A single-use managed beta invitation was reused.'
    }
    Write-Output 'Checking private beta feedback lifecycle.'
    $feedback = Invoke-RestMethod "$base/api/feedback" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{type='BUG';summary='Smoke feedback report';steps='Open Help then submit';expected='A saved private report';language='en'} | ConvertTo-Json)
    Assert-Smoke ($feedback.type -eq 'BUG' -and $feedback.summary -eq 'Smoke feedback report') 'Beta feedback did not save the user-approved report.'
    $operatorHeaders = @{'X-SelfForge-Operator-Key'=$BetaMetricsKey}
    $feedbackInboxDeniedStatus = 0
    try { $null = Invoke-WebRequest "$base/api/operator/beta-feedback" -Headers @{'X-SelfForge-Operator-Key'='wrong-key'} -UseBasicParsing }
    catch { if ($_.Exception.Response) { $feedbackInboxDeniedStatus = [int]$_.Exception.Response.StatusCode } }
    Assert-Smoke ($feedbackInboxDeniedStatus -eq 404) 'Beta feedback inbox was exposed without the configured operator key.'
    $feedbackInbox = @(Invoke-RestMethod "$base/api/operator/beta-feedback?limit=20" -Headers $operatorHeaders)
    Assert-Smoke ($feedbackInbox.Count -eq 1 -and $feedbackInbox[0].id -eq $feedback.id -and $feedbackInbox[0].status -eq 'NEW') 'Operator feedback inbox did not return the submitted report.'
    $feedbackInboxFields = @($feedbackInbox[0].PSObject.Properties.Name)
    Assert-Smoke ($feedbackInboxFields -notcontains 'userId' -and $feedbackInboxFields -notcontains 'email') 'Operator feedback inbox exposed account identity.'
    $triagedFeedback = Invoke-RestMethod "$base/api/operator/beta-feedback/$($feedback.id)" -Method Patch -Headers $operatorHeaders -ContentType 'application/json' -Body (@{status='PLANNED';note='Smoke triage'} | ConvertTo-Json)
    Assert-Smoke ($triagedFeedback.status -eq 'PLANNED' -and $triagedFeedback.note -eq 'Smoke triage' -and $null -ne $triagedFeedback.reviewedAt) 'Operator feedback triage was not saved.'
    Write-Output 'Checking access-restricted aggregate beta metrics.'
    $metricDate = ([DateTimeOffset]::Parse($feedback.createdAt)).UtcDateTime.ToString('yyyy-MM-dd')
    $metricsUrl = "$base/api/operator/beta-metrics?from=$metricDate&through=$metricDate"
    $metricsDeniedStatus = 0
    try { $null = Invoke-WebRequest $metricsUrl -Headers @{'X-SelfForge-Operator-Key'='wrong-key'} -UseBasicParsing }
    catch { if ($_.Exception.Response) { $metricsDeniedStatus = [int]$_.Exception.Response.StatusCode } }
    Assert-Smoke ($metricsDeniedStatus -eq 404) 'Beta metrics were exposed without the configured operator key.'
    $metrics = Invoke-RestMethod $metricsUrl -Headers $operatorHeaders
    $metricProperties = @($metrics.PSObject.Properties.Name)
    Assert-Smoke ($metrics.registrations -ge 1 -and $metrics.feedbackReports -ge 1) 'Beta metrics did not include aggregate registration and feedback counts.'
    Assert-Smoke ($metricProperties -notcontains 'users' -and $metricProperties -notcontains 'email' -and $metricProperties -notcontains 'journal') 'Beta metrics exposed a private data field.'
    $feedbackList = @(Invoke-RestMethod "$base/api/feedback" -Headers $headers)
    Assert-Smoke ($feedbackList.Count -eq 1 -and $feedbackList[0].id -eq $feedback.id) 'Beta feedback was not scoped to its account.'
    $feedbackUserFields = @($feedbackList[0].PSObject.Properties.Name)
    Assert-Smoke ($feedbackUserFields -notcontains 'status' -and $feedbackUserFields -notcontains 'note' -and $feedbackUserFields -notcontains 'reviewedAt') 'User feedback response leaked internal operator triage.'
    Invoke-RestMethod "$base/api/feedback/$($feedback.id)" -Method Delete -Headers $headers
    # Invoke-RestMethod represents a JSON [] response as $null; do not turn that
    # into a one-item array before asserting the server-side delete result.
    $feedbackAfterDelete = Invoke-RestMethod "$base/api/feedback" -Headers $headers
    Assert-Smoke ($null -eq $feedbackAfterDelete -or @($feedbackAfterDelete).Count -eq 0) 'Beta feedback was not deleted for its owner.'
    $zones = Invoke-RestMethod "$base/api/profile/timezones" -Headers $headers
    Assert-Smoke ($zones -contains 'Europe/Paris') 'International timezone catalog is missing.'
    $profileBase = Invoke-RestMethod "$base/api/profile" -Headers $headers
    $profile = Invoke-RestMethod "$base/api/profile" -Method Patch -Headers $headers -ContentType 'application/json' -Body (@{timezone='Europe/Paris'; displayName='Release smoke updated'; language='en'; expected=$profileBase} | ConvertTo-Json)
    Assert-Smoke ($profile.timezone -eq 'Europe/Paris' -and $profile.language -eq 'en') 'Profile timezone or language did not update.'
    Write-Output 'Checking stale profile changes cannot overwrite a newer profile.'
    $profileConflict = 0
    try { $null = Invoke-WebRequest "$base/api/profile" -Method Patch -Headers $headers -ContentType 'application/json' -UseBasicParsing -Body (@{displayName='Stale profile'; expected=$profileBase} | ConvertTo-Json -Depth 4) }
    catch { if ($_.Exception.Response) { $profileConflict = [int]$_.Exception.Response.StatusCode } }
    Assert-Smoke ($profileConflict -eq 409) 'A stale profile update was not rejected.'
    $profileAfterConflict = Invoke-RestMethod "$base/api/profile" -Headers $headers
    Assert-Smoke ($profileAfterConflict.displayName -eq 'Release smoke updated') 'A stale profile update changed saved data.'
    $habitRequest = @{requestId=[Guid]::NewGuid().ToString(); habits=@(@{name='Read for five minutes'; difficulty='EASY'; targetPerWeek=7})} | ConvertTo-Json -Depth 4
    $habitBatch = @(Invoke-RestMethod "$base/api/habits/batch" -Method Post -Headers $headers -ContentType 'application/json' -Body $habitRequest)
    $habitRetry = @(Invoke-RestMethod "$base/api/habits/batch" -Method Post -Headers $headers -ContentType 'application/json' -Body $habitRequest)
    Assert-Smoke ($habitBatch.Count -eq 1 -and $habitRetry.Count -eq 1 -and $habitBatch[0].id -eq $habitRetry[0].id) 'Single habit retry created a duplicate.'
    $habit = $habitBatch[0]
    Write-Output 'Checking recorded habit schedule history.'
    $initialHistory = Invoke-RestMethod "$base/api/habits/$($habit.id)/state-history" -Headers $headers
    $initialHistoryItems = @($initialHistory.items)
    Assert-Smoke ($initialHistoryItems.Count -eq 1 -and $initialHistoryItems[0].kind -eq 'CREATED' -and $initialHistoryItems[0].targetPerWeek -eq 7 -and $initialHistoryItems[0].active -eq $true) 'Creating a habit did not record its initial schedule state.'
    $habitExpected = @{name=$habit.name;description=$habit.description;difficulty=$habit.difficulty;targetPerWeek=$habit.targetPerWeek;points=$habit.points;active=$habit.active;categoryId=$habit.categoryId;tags=$habit.tags}
    $updatedHabit = Invoke-RestMethod "$base/api/habits/$($habit.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body (@{targetPerWeek=5;expected=$habitExpected} | ConvertTo-Json -Depth 4)
    $updatedHistory = Invoke-RestMethod "$base/api/habits/$($habit.id)/state-history" -Headers $headers
    $updatedHistoryItems = @($updatedHistory.items)
    Assert-Smoke ($updatedHabit.targetPerWeek -eq 5 -and $updatedHistoryItems.Count -eq 2 -and $updatedHistoryItems[0].kind -eq 'CHANGED' -and $updatedHistoryItems[0].targetPerWeek -eq 5 -and $updatedHistoryItems[0].active -eq $true -and $updatedHistoryItems[1].id -eq $initialHistoryItems[0].id) 'Changing a habit target did not preserve an ordered schedule history.'
    # A saved focus plan is only for habits due today. Pick the following
    # calendar day as a deterministic scheduled-rest fixture and prove the
    # production API rejects a stale client trying to save it.
    $todayDate = [DateTime]::ParseExact($updatedHistoryItems[0].calendarDate, 'yyyy-MM-dd', [System.Globalization.CultureInfo]::InvariantCulture)
    $restSchedule = $todayDate.AddDays(1).ToString('ddd', [System.Globalization.CultureInfo]::InvariantCulture).Substring(0, 3).ToUpperInvariant()
    $restHabit = Invoke-RestMethod "$base/api/habits" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{name='Scheduled rest fixture'; difficulty='EASY'; targetPerWeek=1; scheduledDays=$restSchedule} | ConvertTo-Json)
    $restFocusStatus = 0
    try {
        $null = Invoke-WebRequest "$base/api/daily-focus-plans" -Method Put -Headers $headers -ContentType 'application/json' -UseBasicParsing -Body (@{budget=60; energy='MEDIUM'; habitIds=@($restHabit.id); expectedVersion=0} | ConvertTo-Json)
    } catch { if ($_.Exception.Response) { $restFocusStatus = [int]$_.Exception.Response.StatusCode } }
    Assert-Smoke ($restFocusStatus -eq 409) 'A scheduled-rest habit was accepted into today''s focus plan.'
    $checkInBody = @{habitId=$habit.id; status='COMPLETED'} | ConvertTo-Json
    $first = Invoke-RestMethod "$base/api/check-ins" -Method Post -Headers $headers -ContentType 'application/json' -Body $checkInBody
    $repeated = Invoke-RestMethod "$base/api/check-ins" -Method Post -Headers $headers -ContentType 'application/json' -Body $checkInBody
    Assert-Smoke ($first.id -eq $repeated.id) 'Repeated check-in created a duplicate.'
    $challenge = Invoke-RestMethod "$base/api/challenges" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{habitId=$habit.id; name='Complete one reading day'; startDate=$first.date; targetDays=1; requestId=[Guid]::NewGuid().ToString()} | ConvertTo-Json)
    Assert-Smoke ($challenge.status -eq 'COMPLETED' -and $challenge.completedDays -eq 1) 'Challenge did not include an existing completion.'
    Write-Output 'Checking companion weekly sources, scheduled challenges and filtered focus totals.'
    $companionWeek = Invoke-RestMethod "$base/api/companion/weekly" -Headers $headers
    Assert-Smoke ($companionWeek.counted -eq 1 -and $companionWeek.xp -eq $habit.points -and $companionWeek.sources[0].id -eq $first.id) 'Companion week did not match its recorded check-in source.'
    $plannedStart = ([DateTime]::ParseExact($first.date, 'yyyy-MM-dd', [System.Globalization.CultureInfo]::InvariantCulture)).AddDays(7)
    $plannedBody = @{habitId=$habit.id; name='Start next week'; startDate=$plannedStart.ToString('yyyy-MM-dd'); targetDays=3; windowDays=7; requestId=[Guid]::NewGuid().ToString()} | ConvertTo-Json
    $plannedChallenge = Invoke-RestMethod "$base/api/challenges" -Method Post -Headers $headers -ContentType 'application/json' -Body $plannedBody
    $plannedRetry = Invoke-RestMethod "$base/api/challenges" -Method Post -Headers $headers -ContentType 'application/json' -Body $plannedBody
    Assert-Smoke ($plannedChallenge.id -eq $plannedRetry.id -and $plannedChallenge.completedDays -eq 0 -and $plannedChallenge.endDate -eq $plannedStart.AddDays(6).ToString('yyyy-MM-dd')) 'Scheduled challenge lost its window or repeated creation.'
    $focusTotals = Invoke-RestMethod "$base/api/pomodoro/history?q=smoke&fromDate=$($first.date)&toDate=$($first.date)" -Headers $headers
    Assert-Smoke ($focusTotals.summary.total -eq 0 -and $focusTotals.summary.minutes -eq 0 -and @($focusTotals.items).Count -eq 0) 'Empty filtered focus history returned incorrect totals.'
    Write-Output 'Checking check-in corrections, challenge status and XP accounting.'
    $xpBefore = (Invoke-RestMethod "$base/api/rewards/progress" -Headers $headers).totalXp
    $noteBody = @{habitId=$habit.id; date=$first.date; status='COMPLETED'; note='Corrected note'; expected=@{id=$first.id; status=$first.status; note=$first.note}} | ConvertTo-Json -Depth 4
    $noted = Invoke-RestMethod "$base/api/check-ins" -Method Post -Headers $headers -ContentType 'application/json' -Body $noteBody
    $xpAfterNote = (Invoke-RestMethod "$base/api/rewards/progress" -Headers $headers).totalXp
    Assert-Smoke ($noted.note -eq 'Corrected note' -and $xpAfterNote -eq $xpBefore) 'Editing a check-in note changed XP.'
    $staleCheckInStatus = 0
    try { $null = Invoke-WebRequest "$base/api/check-ins" -Method Post -Headers $headers -ContentType 'application/json' -UseBasicParsing -Body $noteBody }
    catch { if ($_.Exception.Response) { $staleCheckInStatus = [int]$_.Exception.Response.StatusCode } }
    Assert-Smoke ($staleCheckInStatus -eq 409) 'A stale check-in edit was not rejected.'
    $skipBody = @{habitId=$habit.id; date=$first.date; status='SKIPPED'; note='Corrected note'; expected=@{id=$noted.id; status=$noted.status; note=$noted.note}} | ConvertTo-Json -Depth 4
    $null = Invoke-RestMethod "$base/api/check-ins" -Method Post -Headers $headers -ContentType 'application/json' -Body $skipBody
    $challengeAfterSkip = @(Invoke-RestMethod "$base/api/challenges" -Headers $headers) | ForEach-Object { $_ } | Where-Object { $_.id -eq $challenge.id }
    Assert-Smoke ($challengeAfterSkip.status -eq 'ACTIVE' -and $challengeAfterSkip.completedDays -eq 0) 'Challenge did not reopen after a corrected check-in.'
    $xpAfterSkip = (Invoke-RestMethod "$base/api/rewards/progress" -Headers $headers).totalXp
    Assert-Smoke ($xpAfterSkip -eq ($xpBefore - $first.scoreImpact)) 'Undoing completion did not reverse its XP.'
    $restoreBody = @{habitId=$habit.id; date=$first.date; status='COMPLETED'; note='Corrected note'} | ConvertTo-Json
    $null = Invoke-RestMethod "$base/api/check-ins" -Method Post -Headers $headers -ContentType 'application/json' -Body $restoreBody
    $challengeAfterRestore = @(Invoke-RestMethod "$base/api/challenges" -Headers $headers) | ForEach-Object { $_ } | Where-Object { $_.id -eq $challenge.id }
    Assert-Smoke ($challengeAfterRestore.status -eq 'COMPLETED' -and $challengeAfterRestore.remainingDays -eq 0) 'Challenge did not complete after the check-in was restored.'
    $xpRestored = (Invoke-RestMethod "$base/api/rewards/progress" -Headers $headers).totalXp
    Assert-Smoke ($xpRestored -eq $xpBefore) 'Check-in correction created extra XP.'
    $journalText = 'x' * 5000
    $null = Invoke-RestMethod "$base/api/journal" -Method Post -Headers $headers -ContentType 'application/json' `
        -Body (@{win=$journalText; expected=@{id=$null}} | ConvertTo-Json)
    Write-Output 'Checking stale journal writes cannot overwrite saved content.'
    $journalConflict = 0
    try { $null = Invoke-WebRequest "$base/api/journal" -Method Post -Headers $headers -ContentType 'application/json' -UseBasicParsing -Body (@{win='Stale overwrite'; expected=@{id=$null}} | ConvertTo-Json) }
    catch { if ($_.Exception.Response) { $journalConflict = [int]$_.Exception.Response.StatusCode } }
    Assert-Smoke ($journalConflict -eq 409) 'A stale journal write was not rejected.'
    $goal = Invoke-RestMethod "$base/api/goals" -Method Post -Headers $headers -ContentType 'application/json' `
        -Body (@{name='Read twelve books'; targetValue=12; deadline='2027-12-31'} | ConvertTo-Json)
    $progressBody = @{amount=3; requestId=[Guid]::NewGuid().ToString()} | ConvertTo-Json
    $progressed = Invoke-RestMethod "$base/api/goals/$($goal.id)/progress" -Method Post -Headers $headers -ContentType 'application/json' -Body $progressBody
    $abandoned = Invoke-RestMethod "$base/api/goals/$($goal.id)/abandon" -Method Post -Headers $headers -ContentType 'application/json' -Body ($progressed | ConvertTo-Json)
    $restored = Invoke-RestMethod "$base/api/goals/$($goal.id)/restore" -Method Post -Headers $headers -ContentType 'application/json' -Body ($abandoned | ConvertTo-Json)
    Assert-Smoke ($restored.status -eq 'ACTIVE' -and $restored.currentValue -eq 3) 'Goal restore lost progress.'
    $edited = Invoke-RestMethod "$base/api/goals/$($goal.id)" -Method Patch -Headers $headers -ContentType 'application/json' `
        -Body (@{name='Read at my own pace'; clearDeadline=$true; expected=$restored} | ConvertTo-Json -Depth 4)
    Assert-Smoke ($null -eq $edited.deadline -and $edited.currentValue -eq 3) 'Goal edit did not preserve progress or clear the deadline.'
    $replayed = Invoke-RestMethod "$base/api/goals/$($goal.id)/progress" -Method Post -Headers $headers -ContentType 'application/json' -Body $progressBody
    Assert-Smoke ($replayed.currentValue -eq 3) 'Restoring a goal allowed progress to be counted twice.'
    $null = Invoke-Docker restart $app
    # Docker may assign a new ephemeral host port when the container restarts.
    $binding = Invoke-Docker port $app 8080
    $base = "http://$($binding.Trim())"
    Write-Output 'Checking readiness after restart.'
    Wait-Healthy
    $export = Invoke-RestMethod "$base/api/profile/data" -Headers $headers
    Assert-Smoke ($export.profile.timezone -eq 'Europe/Paris' -and $export.profile.displayName -eq 'Release smoke updated' -and $export.profile.language -eq 'en') 'Profile changes did not survive restart.'
    Assert-Smoke (@($export.habit).Count -eq 2) 'Habits did not survive restart.'
    Assert-Smoke (@($export.habit_state_history).Count -eq 3) 'Habit schedule history did not survive restart or personal export.'
    Assert-Smoke (@($export.check_ins).Count -eq 1) 'Check-in did not survive restart or was duplicated.'
    Assert-Smoke ($export.check_ins[0].note -eq 'Corrected note' -and $export.check_ins[0].status -eq 'COMPLETED') 'Check-in corrections did not survive restart.'
    Assert-Smoke ($export.journal_entry[0].win.Length -eq 5000) 'Long journal did not survive restart.'
    Assert-Smoke ($export.goal[0].name -eq 'Read at my own pace' -and $export.goal[0].current_value -eq 3) 'Goal changes did not survive restart.'
    Write-Output 'Checking reminder pause and restore for inactive habits.'
    $reminderRequestId = [Guid]::NewGuid().ToString()
    # The habit now runs five days per week. A reminder must use that exact
    # saved schedule; the API intentionally rejects reminder days that are
    # rest days for the habit.
    $reminderDays = $updatedHabit.scheduledDays
    $reminder = Invoke-RestMethod "$base/api/reminders" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{habitId=$habit.id; reminderTime='07:00'; daysOfWeek=$reminderDays; message='Keep the schedule'; requestId=$reminderRequestId} | ConvertTo-Json)
    $repeatedReminder = Invoke-RestMethod "$base/api/reminders" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{habitId=$habit.id; reminderTime='07:00'; daysOfWeek=$reminderDays; message='Keep the schedule'; requestId=$reminderRequestId} | ConvertTo-Json)
    Assert-Smoke ($repeatedReminder.id -eq $reminder.id) 'Reminder retry created a duplicate.'
    Assert-Smoke ($reminder.habitActive -eq $true) 'Active habit reminder was not marked active.'
    $null = Invoke-RestMethod "$base/api/habits/$($habit.id)" -Method Delete -Headers $headers
    $pausedReminder = @(Invoke-RestMethod "$base/api/reminders" -Headers $headers) | Where-Object { $_.id -eq $reminder.id }
    Assert-Smoke ($pausedReminder.enabled -eq $true -and $pausedReminder.habitActive -eq $false) 'Inactive habit reminder lost its setting or remained active.'
    $null = Invoke-RestMethod "$base/api/habits/$($habit.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body '{"active":true}'
    $restoredReminder = @(Invoke-RestMethod "$base/api/reminders" -Headers $headers) | Where-Object { $_.id -eq $reminder.id }
    Assert-Smoke ($restoredReminder.habitActive -eq $true -and $restoredReminder.message -eq 'Keep the schedule') 'Restored habit lost its reminder schedule.'
    Write-Output 'Checking account isolation and password-change session revocation.'
    $otherRegistration = @{email="other-$suffix@example.com"; displayName='Other user'; password=$password; termsAccepted=$true}
    if ($ManagedBetaInvites.IsPresent) {
        # The first managed code was deliberately consumed by the primary
        # fixture above. Issue a separate single-use code so this account
        # isolation fixture remains valid under a closed managed beta.
        $otherInvite = Invoke-RestMethod "$base/api/operator/beta-invites" -Method Post -Headers $operatorHeaders -ContentType 'application/json' `
            -Body (@{label='Smoke isolation invite'; maxUses=1} | ConvertTo-Json)
        Assert-Smoke ($otherInvite.code -is [string] -and $otherInvite.code.Length -ge 16) 'Managed invite for the isolation fixture was not issued.'
        $otherRegistration.inviteCode = $otherInvite.code
    } elseif ($inviteRequired) {
        $otherRegistration.inviteCode = $BetaInviteCode
    }
    $otherAuth = Invoke-RestMethod "$base/api/auth/register" -Method Post -ContentType 'application/json' `
        -Body ($otherRegistration | ConvertTo-Json)
    $otherHeaders = @{Authorization="Bearer $($otherAuth.token)"}
    $otherExport = Invoke-RestMethod "$base/api/profile/data" -Headers $otherHeaders
    Assert-Smoke (@($otherExport.habit).Count -eq 0 -and @($otherExport.goal).Count -eq 0 -and @($otherExport.journal_entry).Count -eq 0) 'Export contains another account data.'
    $status = 0
    try {
        $null = Invoke-WebRequest "$base/api/goals/$($goal.id)" -Method Patch -Headers $otherHeaders -ContentType 'application/json' `
            -Body '{"name":"Unauthorized edit"}' -UseBasicParsing
    } catch { $status = [int]$_.Exception.Response.StatusCode }
    Assert-Smoke ($status -eq 404) 'Another account can access the goal.'
    $secondAuth = Invoke-RestMethod "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body $registration
    $secondHeaders = @{Authorization="Bearer $($secondAuth.token)"}
    $newPassword = [Guid]::NewGuid().ToString('N')
    $null = Invoke-RestMethod "$base/api/profile/password" -Method Patch -Headers $headers -ContentType 'application/json' `
        -Body (@{oldPassword=$password; newPassword=$newPassword; confirmPassword=$newPassword} | ConvertTo-Json)
    Assert-Unauthorized $headers
    Assert-Unauthorized $secondHeaders
    $newAuth = Invoke-RestMethod "$base/api/auth/login" -Method Post -ContentType 'application/json' `
        -Body (@{email="smoke-$suffix@example.com"; password=$newPassword} | ConvertTo-Json)
    $headers = @{Authorization="Bearer $($newAuth.token)"}
    $profile = Invoke-RestMethod "$base/api/profile" -Headers $headers
    Assert-Smoke ($profile.email -eq "smoke-$suffix@example.com") 'New password did not restore access to the same account.'
    # Use a fresh address: registration and login intentionally share a durable
    # anti-abuse budget, so the account-isolation fixture has already consumed one.
    $wrongLogin = @{email="throttle-$suffix@example.com"; password='incorrect-password'} | ConvertTo-Json
    Write-Output 'Checking login throttling, logout and permanent account deletion.'
    for ($attempt = 1; $attempt -le 11; $attempt++) {
        $status = 0
        try { $null = Invoke-WebRequest "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body $wrongLogin -UseBasicParsing }
        catch { $status = [int]$_.Exception.Response.StatusCode }
        $expected = if ($attempt -le 10) { 401 } else { 429 }
        Assert-Smoke ($status -eq $expected) "Login attempt $attempt returned $status instead of $expected."
    }
    $null = Invoke-RestMethod "$base/api/auth/logout" -Method Post -Headers $headers
    Assert-Unauthorized $headers
    Write-Output 'Checking permanent deletion on the disposable test account.'
    $deletionLogin = @{email="smoke-$suffix@example.com"; password=$newPassword} | ConvertTo-Json
    $deletionAuth = Invoke-RestMethod "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body $deletionLogin
    $deletionSecondAuth = Invoke-RestMethod "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body $deletionLogin
    $deletionHeaders = @{Authorization="Bearer $($deletionAuth.token)"}
    $deletionSecondHeaders = @{Authorization="Bearer $($deletionSecondAuth.token)"}
    $deletedUserId = [long]$deletionAuth.user.id
    $deleted = Invoke-WebRequest "$base/api/profile/account" -Method Delete -Headers $deletionHeaders -ContentType 'application/json' -UseBasicParsing         -Body (@{currentPassword=$newPassword; confirmationEmail="smoke-$suffix@example.com"} | ConvertTo-Json)
    Assert-Smoke ($deleted.StatusCode -eq 204) 'Account deletion did not complete.'
    Assert-Unauthorized $deletionHeaders
    Assert-Unauthorized $deletionSecondHeaders
    foreach ($table in @('habit','challenge','reminder','reminder_create_receipt','goal','journal_entry','mood_entry','auth_session','user_level','penalty','challenge_create_receipt','habit_batch_receipt')) {
        $remaining = Invoke-Docker exec $database psql -U smoke -d selfforge -Atc "select count(*) from $table where user_id=$deletedUserId"
        Assert-Smoke ([int]$remaining -eq 0) "Account data remained in $table."
    }
    $remainingHabitHistory = Invoke-Docker exec $database psql -U smoke -d selfforge -Atc "select count(*) from habit_state_history s join habit h on h.id=s.habit_id where h.user_id=$deletedUserId"
    Assert-Smoke ([int]$remainingHabitHistory -eq 0) 'Account habit schedule history remained after deletion.'
    $remainingAccount = Invoke-Docker exec $database psql -U smoke -d selfforge -Atc "select count(*) from app_user where id=$deletedUserId"
    Assert-Smoke ([int]$remainingAccount -eq 0) 'Deleted account remains in the database.'
    $otherProfile = Invoke-RestMethod "$base/api/profile" -Headers $otherHeaders
    Assert-Smoke ($otherProfile.email -eq "other-$suffix@example.com") 'Account deletion affected another account.'
    if ($LoadUsers -gt 0) {
        Write-Output "Checking $LoadUsers disposable accounts with 10 concurrent workflows."
        # Clone only the disposable fixture's hash; never read or alter production accounts.
        $seedSql = "insert into app_user(email,display_name,password_hash,premium_tier,timezone,created_at) select 'load-$suffix-' || n || '@example.com','Load ' || n,password_hash,'FREE','UTC',now() from app_user cross join generate_series(1,$LoadUsers) as n where email='other-$suffix@example.com'"
        $null = Invoke-Docker exec $database psql -v ON_ERROR_STOP=1 -U smoke -d selfforge -c $seedSql
        $loadClock = [Diagnostics.Stopwatch]::StartNew()
        # Start-Job is available in both Windows PowerShell 5.1 and PowerShell
        # 7.  Do not use ForEach-Object -Parallel here: it would make the
        # release check silently depend on PowerShell 7 on a typical Windows
        # machine.  Ten simultaneous jobs remains intentionally bounded.
        $loadWorker = {
            param($taskBase, $taskSuffix, $taskPassword, $taskIndex)
            $ErrorActionPreference = 'Stop'
            $times = [Collections.Generic.List[double]]::new()
            function Request-Load([string]$method, [string]$path, $body, [hashtable]$auth) {
                $requestClock = [Diagnostics.Stopwatch]::StartNew()
                $parameters = @{Uri=$taskBase+$path; Method=$method; Headers=$auth; TimeoutSec=20}
                if ($null -ne $body) { $parameters.ContentType='application/json'; $parameters.Body=$body | ConvertTo-Json -Depth 6 }
                try { return Invoke-RestMethod @parameters }
                finally { $times.Add($requestClock.Elapsed.TotalMilliseconds) }
            }
            try {
                # The test container trusts this header only for a requested
                # load run. Each disposable account is therefore a distinct
                # simulated device instead of one localhost spray attempt.
                $clientHeaders = @{'X-Forwarded-For'="198.18.0.$taskIndex"}
                $login = Request-Load 'Post' '/api/auth/login' @{email="load-$taskSuffix-$taskIndex@example.com"; password=$taskPassword} $clientHeaders
                $auth = @{Authorization="Bearer $($login.token)"}
                $created = @(Request-Load 'Post' '/api/habits/batch' @{requestId=[Guid]::NewGuid().ToString(); habits=@(@{name='Load fixture habit'; difficulty='EASY'; targetPerWeek=7})} $auth)
                if ($created.Count -ne 1) { throw 'Habit count mismatch' }
                $habitId = $created[0].id
                $body = @{habitId=$habitId; status='COMPLETED'}
                $first = Request-Load 'Post' '/api/check-ins' $body $auth
                $xpBefore = (Request-Load 'Get' '/api/rewards/progress' $null $auth).totalXp
                $repeated = Request-Load 'Post' '/api/check-ins' $body $auth
                $xpAfter = (Request-Load 'Get' '/api/rewards/progress' $null $auth).totalXp
                $dashboard = Request-Load 'Get' '/api/dashboard/today' $null $auth
                $stats = Request-Load 'Get' '/api/stats/weekly' $null $auth
                if ($first.id -ne $repeated.id -or $xpBefore -ne $xpAfter) { throw 'Retry duplicated check-in or XP' }
                if (@($dashboard.habits).Count -ne 1 -or $dashboard.habits[0].habitId -ne $habitId -or $dashboard.todayScore -ne $first.scoreImpact -or $stats.completedCount -ne 1) { throw 'Dashboard isolation or accounting mismatch' }
                [pscustomobject]@{ok=$true; index=$taskIndex; times=$times.ToArray(); failure=$null}
            } catch {
                [pscustomobject]@{ok=$false; index=$taskIndex; times=$times.ToArray(); failure=$_.Exception.Message}
            }
        }
        $loadResults = [Collections.Generic.List[object]]::new()
        $loadJobs = [Collections.ArrayList]::new()
        function Receive-CompletedLoadJobs {
            $completed = @($loadJobs | Where-Object { @('Completed', 'Failed', 'Stopped', 'Disconnected') -contains $_.State })
            foreach ($job in $completed) {
                $result = @(Receive-Job -Job $job -ErrorAction SilentlyContinue)
                if ($result.Count -eq 1) {
                    $loadResults.Add($result[0])
                } else {
                    $reason = if ($job.ChildJobs.Count -gt 0 -and $job.ChildJobs[0].JobStateInfo.Reason) { $job.ChildJobs[0].JobStateInfo.Reason.Message } else { "Worker stopped with state $($job.State)" }
                    $loadResults.Add([pscustomobject]@{ok=$false; index=$job.Name; times=@(); failure=$reason})
                }
                Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
                [void]$loadJobs.Remove($job)
            }
            return $completed.Count
        }
        foreach ($index in 1..$LoadUsers) {
            while ($loadJobs.Count -ge 10) {
                if ((Receive-CompletedLoadJobs) -eq 0) { Start-Sleep -Milliseconds 100 }
            }
            [void]$loadJobs.Add((Start-Job -ScriptBlock $loadWorker -ArgumentList $base, $suffix, $password, $index))
        }
        while ($loadJobs.Count -gt 0) {
            if ((Receive-CompletedLoadJobs) -eq 0) { Start-Sleep -Milliseconds 100 }
        }
        $loadClock.Stop()
        $failures = @($loadResults | Where-Object { -not $_.ok })
        if ($failures.Count -gt 0) {
            $failures | Select-Object index, failure | Format-Table -AutoSize | Out-String | Write-Output
            throw "$($failures.Count) load workflows failed."
        }
        $latencies = @($loadResults | ForEach-Object { $_.times } | Sort-Object)
        Assert-Smoke ($latencies.Count -eq $LoadUsers * 8) 'Load request count mismatch.'
        $p95 = $latencies[[Math]::Ceiling($latencies.Count * 0.95)-1]
        $stored = Invoke-Docker exec $database psql -U smoke -d selfforge -Atc "select count(*) from daily_check_in c join habit h on h.id=c.habit_id join app_user u on u.id=h.user_id where u.email like 'load-$suffix-%'"
        Assert-Smoke ([int]$stored -eq $LoadUsers) 'Load workflows left duplicate or missing check-ins.'
        Write-Output ("LOAD PASS: accounts={0}; concurrency=10; requests={1}; totalSeconds={2}; p95Ms={3}; maxMs={4}" -f $LoadUsers,$latencies.Count,[Math]::Round($loadClock.Elapsed.TotalSeconds,2),[Math]::Round($p95,2),[Math]::Round($latencies[-1],2))
        $memory = Invoke-Docker stats --no-stream --format '{{.MemUsage}}' $app
        Write-Output "Container memory after workload: $memory"
    }
    Write-Output 'PASS: production startup, migrations, frontend assets, registration, private feedback and aggregate beta metrics, habit schedule history and scheduled-rest focus protection, check-in retry, long journal, goal edit/restore/retry, restart persistence, private export, account isolation, password change, session revocation, login throttling, logout, challenge completion/correction, reminder pause/restore and permanent account deletion.'
} catch {
    # Keep enough runtime evidence to distinguish an application regression from
    # a constrained local Docker host.  This runs before the disposable
    # containers are removed in finally, and never inspects any named/user
    # container outside this script's unique test names.
    Write-Output 'Smoke failure diagnostics:'
    & docker inspect --format 'app state={{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}} error={{.State.Error}}' $app 2>&1 | Write-Output
    & docker inspect --format 'db state={{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}} error={{.State.Error}}' $database 2>&1 | Write-Output
    & docker stats --no-stream --format 'app memory={{.MemUsage}} cpu={{.CPUPerc}}' $app 2>&1 | Write-Output
    & docker logs --tail 40 $app 2>&1 | Write-Output
    throw
} finally {
    # Exact, unique names created by this script only. No host files or real volumes are removed.
    & {
        $ErrorActionPreference = 'Continue'
        & docker rm -f $app $database 2>$null | Out-Null
        & docker network rm $network 2>$null | Out-Null
    }
}
