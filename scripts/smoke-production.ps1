param([string]$Image = 'selfforge:release-check')

# Runs only against disposable local containers; never connects to the deployed app.
$ErrorActionPreference = 'Stop'
$PSDefaultParameterValues = @{ 'Invoke-RestMethod:TimeoutSec' = 20; 'Invoke-WebRequest:TimeoutSec' = 20 }
$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 12)
$network = "sf-smoke-$suffix"
$database = "$network-db"
$app = "$network-app"
$password = [Guid]::NewGuid().ToString('N')

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
    $deadline = (Get-Date).AddSeconds(120)
    do {
        try {
            $health = Invoke-RestMethod "$base/api/health" -TimeoutSec 3
            if ($health.status -eq 'UP') { return }
        } catch { }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw 'Production container did not become healthy within 120 seconds.'
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
    $null = Invoke-Docker run -d --name $app --network $network -p '127.0.0.1::8080' `
        -e "DATABASE_URL=jdbc:postgresql://${database}:5432/selfforge" `
        -e DATABASE_USERNAME=smoke -e "DATABASE_PASSWORD=$password" $Image
    $binding = Invoke-Docker port $app 8080
    $base = "http://$($binding.Trim())"
    Write-Output 'Checking production readiness.'
    Wait-Healthy
    Write-Output 'Production ready; checking frontend assets.'
    $runtime = (Invoke-Docker inspect $app | ConvertFrom-Json)[0]
    Assert-Smoke ($runtime.Config.User -eq 'selfforge') 'Runtime must use the non-root user.'
    Assert-Smoke ($runtime.Config.Env -contains 'SPRING_PROFILES_ACTIVE=prod') 'Runtime must default to prod.'
    $page = Invoke-WebRequest "$base/login" -UseBasicParsing
    Assert-Smoke ($page.Content -match 'assets/index-') 'Frontend was not included in the image.'
    $assets = [regex]::Matches($page.Content, '(?:src|href)="(/assets/[^" ]+)"')
    Assert-Smoke ($assets.Count -ge 2) 'Frontend entry assets are missing.'
    foreach ($asset in $assets) {
        $response = Invoke-WebRequest "$base$($asset.Groups[1].Value)" -UseBasicParsing
        Assert-Smoke ($response.StatusCode -eq 200 -and $response.Headers['Content-Type'] -notmatch 'text/html') 'An asset resolved to an HTML fallback.'
    }
    $registration = @{email="smoke-$suffix@example.com"; displayName='Release smoke'; password=$password} | ConvertTo-Json
    Write-Output 'Checking registration and data writes.'
    $auth = Invoke-RestMethod "$base/api/auth/register" -Method Post -ContentType 'application/json' -Body $registration
    $headers = @{Authorization="Bearer $($auth.token)"}
    $habit = Invoke-RestMethod "$base/api/habits" -Method Post -Headers $headers -ContentType 'application/json' `
        -Body (@{name='Read for five minutes'; difficulty='EASY'; targetPerWeek=7} | ConvertTo-Json)
    $checkInBody = @{habitId=$habit.id; status='COMPLETED'} | ConvertTo-Json
    $first = Invoke-RestMethod "$base/api/check-ins" -Method Post -Headers $headers -ContentType 'application/json' -Body $checkInBody
    $repeated = Invoke-RestMethod "$base/api/check-ins" -Method Post -Headers $headers -ContentType 'application/json' -Body $checkInBody
    Assert-Smoke ($first.id -eq $repeated.id) 'Repeated check-in created a duplicate.'
    $journalText = 'x' * 5000
    $null = Invoke-RestMethod "$base/api/journal" -Method Post -Headers $headers -ContentType 'application/json' `
        -Body (@{win=$journalText} | ConvertTo-Json)
    $goal = Invoke-RestMethod "$base/api/goals" -Method Post -Headers $headers -ContentType 'application/json' `
        -Body (@{name='Read twelve books'; targetValue=12; deadline='2027-12-31'} | ConvertTo-Json)
    $progressBody = @{amount=3; requestId=[Guid]::NewGuid().ToString()} | ConvertTo-Json
    $null = Invoke-RestMethod "$base/api/goals/$($goal.id)/progress" -Method Post -Headers $headers -ContentType 'application/json' -Body $progressBody
    $null = Invoke-RestMethod "$base/api/goals/$($goal.id)/abandon" -Method Post -Headers $headers
    $restored = Invoke-RestMethod "$base/api/goals/$($goal.id)/restore" -Method Post -Headers $headers
    Assert-Smoke ($restored.status -eq 'ACTIVE' -and $restored.currentValue -eq 3) 'Goal restore lost progress.'
    $edited = Invoke-RestMethod "$base/api/goals/$($goal.id)" -Method Patch -Headers $headers -ContentType 'application/json' `
        -Body (@{name='Read at my own pace'; clearDeadline=$true} | ConvertTo-Json)
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
    Assert-Smoke (@($export.habit).Count -eq 1) 'Habit did not survive restart.'
    Assert-Smoke (@($export.check_ins).Count -eq 1) 'Check-in did not survive restart or was duplicated.'
    Assert-Smoke ($export.journal_entry[0].win.Length -eq 5000) 'Long journal did not survive restart.'
    Assert-Smoke ($export.goal[0].name -eq 'Read at my own pace' -and $export.goal[0].current_value -eq 3) 'Goal changes did not survive restart.'
    Write-Output 'Checking account isolation and password-change session revocation.'
    $otherAuth = Invoke-RestMethod "$base/api/auth/register" -Method Post -ContentType 'application/json' `
        -Body (@{email="other-$suffix@example.com"; displayName='Other user'; password=$password} | ConvertTo-Json)
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
    $wrongLogin = @{email="other-$suffix@example.com"; password='incorrect-password'} | ConvertTo-Json
    Write-Output 'Checking login throttling and logout.'
    for ($attempt = 1; $attempt -le 11; $attempt++) {
        $status = 0
        try { $null = Invoke-WebRequest "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body $wrongLogin -UseBasicParsing }
        catch { $status = [int]$_.Exception.Response.StatusCode }
        $expected = if ($attempt -le 10) { 401 } else { 429 }
        Assert-Smoke ($status -eq $expected) "Login attempt $attempt returned $status instead of $expected."
    }
    $null = Invoke-RestMethod "$base/api/auth/logout" -Method Post -Headers $headers
    Assert-Unauthorized $headers
    Write-Output 'PASS: production startup, migrations, frontend assets, registration, habit, check-in retry, long journal, goal edit/restore/retry, restart persistence, private export, account isolation, password change, session revocation, login throttling and logout.'
} catch {
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
