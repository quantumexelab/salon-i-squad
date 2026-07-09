$java21 = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Filter "jdk-21*" -Directory -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($java21) {
  $env:JAVA_HOME = $java21.FullName
  $env:Path = "$($java21.FullName)\bin;$env:Path"
  Write-Host "Using JAVA_HOME=$($java21.FullName)"
} else {
  Write-Host "Java 21 not found. Install Eclipse Temurin JDK 21, then rerun this script."
  Write-Host "Download: https://adoptium.net/temurin/releases/?version=21"
}

npx firebase emulators:start --only auth,firestore,storage
