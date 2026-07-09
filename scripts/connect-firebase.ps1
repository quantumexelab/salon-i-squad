$ErrorActionPreference = "Stop"

Write-Host "Checking Firebase login..."
$login = npx firebase login:list 2>&1 | Out-String
Write-Host $login

Write-Host "`nListing projects..."
npx firebase projects:list

$projectId = Read-Host "`nEnter your Firebase Project ID (e.g. salon-i-squad)"

if (-not $projectId) {
  Write-Error "Project ID is required."
}

Write-Host "Using project: $projectId"
npx firebase use $projectId

Write-Host "`nChecking web apps..."
$appsJson = npx firebase apps:list WEB --project $projectId --json 2>&1 | Out-String
Write-Host $appsJson

$appId = $null
try {
  $parsed = $appsJson | ConvertFrom-Json
  if ($parsed.result -and $parsed.result.Count -gt 0) {
    $appId = $parsed.result[0].appId
    Write-Host "Found existing web app: $appId"
  }
} catch {
  Write-Host "Could not parse apps list, will create a new web app."
}

if (-not $appId) {
  Write-Host "Creating web app..."
  $createJson = npx firebase apps:create WEB "Salon I Squad Web" --project $projectId --json 2>&1 | Out-String
  Write-Host $createJson
  $created = $createJson | ConvertFrom-Json
  $appId = $created.appId
}

Write-Host "`nFetching SDK config for app: $appId"
$sdkJson = npx firebase apps:sdkconfig WEB $appId --project $projectId --json 2>&1 | Out-String
$config = ($sdkJson | ConvertFrom-Json).result.sdkConfig

$envContent = @"
# Production Firebase — $projectId
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false

NEXT_PUBLIC_FIREBASE_API_KEY=$($config.apiKey)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$($config.authDomain)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$($config.projectId)
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$($config.storageBucket)
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$($config.messagingSenderId)
NEXT_PUBLIC_FIREBASE_APP_ID=$($config.appId)
"@

Set-Content -Path ".env.local" -Value $envContent -Encoding UTF8
Write-Host "`nWrote .env.local with production Firebase config."
Write-Host "Restart dev server: npm run dev"
