# Connect Salon I Squad — Firebase + Vercel CLI
# Run from project root:
#   powershell -ExecutionPolicy Bypass -File scripts/connect-cli.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "`n=== 1. Vercel CLI ===" -ForegroundColor Cyan
npx vercel whoami
if (-not (Test-Path ".vercel\project.json")) {
  Write-Host "Linking Vercel project..."
  npx vercel link --yes
} else {
  Write-Host "Vercel project already linked (.vercel\project.json)"
}

Write-Host "`n=== 2. Firebase CLI ===" -ForegroundColor Cyan
$firebaseLogin = npx firebase login:list 2>&1 | Out-String
Write-Host $firebaseLogin
if ($firebaseLogin -match "No authorized accounts") {
  Write-Host "Run this first (browser will open):" -ForegroundColor Yellow
  Write-Host "  npx firebase login" -ForegroundColor White
  exit 1
}

$projectId = "salon-i-squad"
if (Test-Path ".env.local") {
  $match = Select-String -Path ".env.local" -Pattern "^NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)$"
  if ($match) {
    $projectId = $match.Matches[0].Groups[1].Value.Trim()
  }
}

Write-Host "Using Firebase project: $projectId"
npx firebase use $projectId

Write-Host "`n=== 3. Sync .env.local -> Vercel (production) ===" -ForegroundColor Cyan
if (-not (Test-Path ".env.local")) {
  Write-Error ".env.local not found. Run: npm run connect:firebase"
}

Get-Content ".env.local" | ForEach-Object {
  if ($_ -match "^([^#=]+)=(.*)$") {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    if ($name -like "NEXT_PUBLIC_*" -and $name -ne "VERCEL_OIDC_TOKEN") {
      Write-Host "  -> $name"
      npx vercel env add $name production --value $value --yes --force --no-sensitive 2>&1 | Out-Null
    }
  }
}

Write-Host "`n=== 4. Deploy Firebase rules ===" -ForegroundColor Cyan
npx firebase deploy --only firestore:rules,storage --project $projectId

Write-Host "`n=== 5. Redeploy Vercel production ===" -ForegroundColor Cyan
npx vercel --prod --yes

Write-Host "`nDone. Live app: https://salon-management-system-lac-three.vercel.app" -ForegroundColor Green
