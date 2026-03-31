# monitor-cron-health.ps1
# Comprehensive cron job health monitoring script
# Run this after deploying cron fixes to production

[CmdletBinding()]
param(
    [Parameter()]
    [int]$IntervalMinutes = 60,
    
    [Parameter()]
    [int]$DurationHours = 48,
    
    [Parameter()]
    [switch]$Once,
    
    [Parameter()]
    [switch]$Verbose
)

$ErrorActionPreference = 'Continue'

# Configuration
$REPO = "Ai-Whisperers/Vete"
$WORKFLOW = "cron.yml"
$ALERT_THRESHOLD = 3  # Alert after 3 consecutive failures

# State tracking
$consecutiveFailures = @{}
$startTime = Get-Date

# Colors for output
function Write-Status {
    param([string]$Message, [string]$Status = "INFO")
    
    $color = switch ($Status) {
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        "INFO" { "Cyan" }
        default { "White" }
    }
    
    $emoji = switch ($Status) {
        "SUCCESS" { "✅" }
        "WARNING" { "⚠️" }
        "ERROR" { "❌" }
        "INFO" { "ℹ️" }
        default { "•" }
    }
    
    Write-Host "$emoji $Message" -ForegroundColor $color
}

function Get-CronJobStatus {
    Write-Status "Fetching recent cron job runs..." "INFO"
    
    # Get last 10 cron workflow runs
    $runs = gh run list --workflow=$WORKFLOW --limit 10 --json conclusion,displayTitle,createdAt,databaseId | ConvertFrom-Json
    
    if ($runs.Count -eq 0) {
        Write-Status "No recent cron runs found" "WARNING"
        return $null
    }
    
    # Analyze runs
    $summary = @{
        Total = $runs.Count
        Success = ($runs | Where-Object { $_.conclusion -eq "success" }).Count
        Failure = ($runs | Where-Object { $_.conclusion -eq "failure" }).Count
        Cancelled = ($runs | Where-Object { $_.conclusion -eq "cancelled" }).Count
        InProgress = ($runs | Where-Object { $_.conclusion -eq "" }).Count
        SuccessRate = 0
        RecentRuns = @()
    }
    
    if ($summary.Total -gt 0) {
        $summary.SuccessRate = [math]::Round(($summary.Success / $summary.Total) * 100, 1)
    }
    
    # Get details of recent runs
    foreach ($run in $runs | Select-Object -First 5) {
        $runInfo = @{
            Title = $run.displayTitle
            Status = if ($run.conclusion) { $run.conclusion } else { "in_progress" }
            Time = $run.createdAt
            Id = $run.databaseId
        }
        $summary.RecentRuns += $runInfo
    }
    
    return $summary
}

function Get-VercelLogs {
    param([int]$SinceMinutes = 60)
    
    Write-Status "Checking Vercel production logs (last $SinceMinutes minutes)..." "INFO"
    
    # Get logs with cron filter
    $logs = vercel logs --app=vetepy --since="${SinceMinutes}m" --filter="cron" 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Unable to fetch Vercel logs (may need authentication)" "WARNING"
        return $null
    }
    
    # Parse for errors
    $errorLines = $logs | Select-String -Pattern "ERROR|500|permission denied|unauthorized" -CaseSensitive:$false
    
    return @{
        TotalLines = ($logs | Measure-Object -Line).Lines
        ErrorLines = $errorLines.Count
        Errors = $errorLines | Select-Object -First 10
    }
}

function Test-CronEndpoint {
    param([string]$Endpoint)
    
    # Note: This requires CRON_SECRET to be set in environment
    if (-not $env:CRON_SECRET) {
        Write-Status "CRON_SECRET not set, skipping endpoint test" "WARNING"
        return $null
    }
    
    $url = "https://vetic.ai-whisperers.org/api/cron/$Endpoint"
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method Get -Headers @{
            "Authorization" = "Bearer $env:CRON_SECRET"
        } -TimeoutSec 30 -UseBasicParsing
        
        return @{
            Endpoint = $Endpoint
            Status = $response.StatusCode
            Success = $response.StatusCode -eq 200
        }
    } catch {
        return @{
            Endpoint = $Endpoint
            Status = $_.Exception.Response.StatusCode.value__
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Show-HealthReport {
    param($CronStatus, $VercelLogs)
    
    Write-Host "`n" + ("=" * 60)
    Write-Host "  CRON JOB HEALTH REPORT" -ForegroundColor Cyan
    Write-Host ("=" * 60)
    Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
    
    # GitHub Actions Status
    Write-Host "📊 GitHub Actions Status:" -ForegroundColor Yellow
    if ($CronStatus) {
        Write-Host "   Total Runs: $($CronStatus.Total)"
        Write-Host "   Success: $($CronStatus.Success) | Failure: $($CronStatus.Failure) | Cancelled: $($CronStatus.Cancelled)"
        
        $statusColor = if ($CronStatus.SuccessRate -ge 95) { "Green" } 
                      elseif ($CronStatus.SuccessRate -ge 80) { "Yellow" }
                      else { "Red" }
        Write-Host "   Success Rate: $($CronStatus.SuccessRate)%" -ForegroundColor $statusColor
        
        Write-Host "`n   Recent Runs:"
        foreach ($run in $CronStatus.RecentRuns) {
            $statusSymbol = switch ($run.Status) {
                "success" { "✅" }
                "failure" { "❌" }
                "cancelled" { "⏭️" }
                "in_progress" { "⏳" }
                default { "❓" }
            }
            Write-Host "   $statusSymbol $($run.Time) - $($run.Title)"
        }
    } else {
        Write-Host "   No data available" -ForegroundColor Gray
    }
    
    # Vercel Logs
    Write-Host "`n📝 Vercel Production Logs:" -ForegroundColor Yellow
    if ($VercelLogs) {
        Write-Host "   Total Log Lines: $($VercelLogs.TotalLines)"
        Write-Host "   Error Lines: $($VercelLogs.ErrorLines)"
        
        if ($VercelLogs.ErrorLines -gt 0) {
            Write-Host "`n   Recent Errors:" -ForegroundColor Red
            foreach ($error in $VercelLogs.Errors) {
                Write-Host "   • $($error.Line)" -ForegroundColor Gray
            }
        } else {
            Write-Status "   No errors found in recent logs" "SUCCESS"
        }
    } else {
        Write-Host "   Unable to fetch logs" -ForegroundColor Gray
    }
    
    # Assessment
    Write-Host "`n🎯 Assessment:" -ForegroundColor Yellow
    
    $issues = @()
    $warnings = @()
    
    if ($CronStatus -and $CronStatus.SuccessRate -lt 80) {
        $issues += "Low success rate ($($CronStatus.SuccessRate)%) - investigate failures"
    } elseif ($CronStatus -and $CronStatus.SuccessRate -lt 95) {
        $warnings += "Success rate below target ($($CronStatus.SuccessRate)% vs 95% target)"
    }
    
    if ($VercelLogs -and $VercelLogs.ErrorLines -gt 10) {
        $issues += "High error count in logs ($($VercelLogs.ErrorLines) errors)"
    } elseif ($VercelLogs -and $VercelLogs.ErrorLines -gt 0) {
        $warnings += "Some errors in logs ($($VercelLogs.ErrorLines) errors) - review"
    }
    
    if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
        Write-Status "   All systems healthy!" "SUCCESS"
    } else {
        if ($issues.Count -gt 0) {
            Write-Host "   Critical Issues:" -ForegroundColor Red
            foreach ($issue in $issues) {
                Write-Host "   ❌ $issue" -ForegroundColor Red
            }
        }
        
        if ($warnings.Count -gt 0) {
            Write-Host "   Warnings:" -ForegroundColor Yellow
            foreach ($warning in $warnings) {
                Write-Host "   ⚠️  $warning" -ForegroundColor Yellow
            }
        }
    }
    
    Write-Host "`n" + ("=" * 60) + "`n"
}

function Send-AlertNotification {
    param([string]$Message)
    
    # TODO: Integrate with notification system (Slack, email, etc.)
    Write-Status "ALERT: $Message" "ERROR"
}

# Main monitoring loop
function Start-Monitoring {
    $iterations = 0
    $maxIterations = if ($Once) { 1 } else { ($DurationHours * 60) / $IntervalMinutes }
    
    Write-Status "Starting cron job health monitoring..." "INFO"
    Write-Status "Duration: $(if ($Once) { 'Single check' } else { "$DurationHours hours" })" "INFO"
    Write-Status "Interval: $IntervalMinutes minutes" "INFO"
    Write-Host ""
    
    while ($iterations -lt $maxIterations) {
        $iterations++
        
        # Fetch status
        $cronStatus = Get-CronJobStatus
        $vercelLogs = Get-VercelLogs -SinceMinutes $IntervalMinutes
        
        # Show report
        Show-HealthReport -CronStatus $cronStatus -VercelLogs $vercelLogs
        
        # Check for alerts
        if ($cronStatus -and $cronStatus.SuccessRate -lt 50) {
            Send-AlertNotification "Cron job success rate critically low: $($cronStatus.SuccessRate)%"
        }
        
        # Export to log file
        $logFile = "cron-health-$(Get-Date -Format 'yyyyMMdd').log"
        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Add-Content -Path $logFile -Value "$timestamp - Success Rate: $($cronStatus.SuccessRate)% | Errors: $($vercelLogs.ErrorLines)"
        
        # Wait for next iteration
        if (-not $Once -and $iterations -lt $maxIterations) {
            $remainingHours = [math]::Round((($maxIterations - $iterations) * $IntervalMinutes) / 60, 1)
            Write-Status "Next check in $IntervalMinutes minutes ($remainingHours hours remaining)..." "INFO"
            Write-Host ""
            
            Start-Sleep -Seconds ($IntervalMinutes * 60)
        }
    }
    
    Write-Status "Monitoring completed after $iterations checks" "SUCCESS"
    Write-Status "See cron-health-*.log for full history" "INFO"
}

# Help message
function Show-Help {
    @"

CRON JOB HEALTH MONITORING SCRIPT

Usage:
  .\monitor-cron-health.ps1 [OPTIONS]

Options:
  -Once                  Run a single health check and exit
  -IntervalMinutes <N>   Check every N minutes (default: 60)
  -DurationHours <H>     Monitor for H hours (default: 48)
  -Verbose               Show detailed output
  -Help                  Show this help message

Examples:
  # Single health check
  .\monitor-cron-health.ps1 -Once

  # Monitor for 48 hours, checking every hour (default)
  .\monitor-cron-health.ps1

  # Monitor for 24 hours, checking every 30 minutes
  .\monitor-cron-health.ps1 -DurationHours 24 -IntervalMinutes 30

Requirements:
  - GitHub CLI (gh) installed and authenticated
  - Vercel CLI installed and authenticated (optional)
  - CRON_SECRET environment variable set (optional, for endpoint testing)

Output:
  - Console: Real-time health reports
  - File: cron-health-YYYYMMDD.log (daily logs)

"@
}

# Main entry point
if ($args -contains "-Help" -or $args -contains "--help" -or $args -contains "-h") {
    Show-Help
    exit 0
}

# Check prerequisites
$hasGh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $hasGh) {
    Write-Status "GitHub CLI (gh) not found. Please install: https://cli.github.com/" "ERROR"
    exit 1
}

$hasVercel = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $hasVercel) {
    Write-Status "Vercel CLI not found (optional). Install for full monitoring: npm i -g vercel" "WARNING"
}

# Start monitoring
Start-Monitoring
