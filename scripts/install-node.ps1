$ErrorActionPreference = "Stop"
$nodeSecurityVersion = (Get-Content -LiteralPath (Join-Path $PSScriptRoot "..\.nvmrc") -Raw).Trim()
if ($nodeSecurityVersion -notmatch '^24\.\d+\.\d+$') { throw "Unexpected Node.js version in .nvmrc." }
$nodeSecurityRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.runtime"))
$nodeSecurityArchiveName = "node-v$nodeSecurityVersion-win-x64.zip"
$nodeSecurityArchive = Join-Path $env:TEMP $nodeSecurityArchiveName
$nodeSecurityChecksums = Join-Path $env:TEMP "node-v$nodeSecurityVersion-SHASUMS256.txt"
$nodeSecurityBaseUrl = "https://nodejs.org/dist/v$nodeSecurityVersion"

Invoke-WebRequest -Uri "$nodeSecurityBaseUrl/$nodeSecurityArchiveName" -OutFile $nodeSecurityArchive
Invoke-WebRequest -Uri "$nodeSecurityBaseUrl/SHASUMS256.txt" -OutFile $nodeSecurityChecksums
$nodeSecurityExpectedLine = Get-Content -LiteralPath $nodeSecurityChecksums | Where-Object { ($_ -split '\s+')[-1] -eq $nodeSecurityArchiveName }
if (-not $nodeSecurityExpectedLine) { throw "Archive missing from the official checksum manifest." }
$nodeSecurityExpected = ($nodeSecurityExpectedLine -split '\s+')[0]
$nodeSecurityActual = (Get-FileHash -LiteralPath $nodeSecurityArchive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($nodeSecurityActual -ne $nodeSecurityExpected) { throw "Node.js archive checksum mismatch." }

New-Item -ItemType Directory -Path $nodeSecurityRoot -Force | Out-Null
Expand-Archive -LiteralPath $nodeSecurityArchive -DestinationPath $nodeSecurityRoot -Force
$nodeSecurityExecutable = Join-Path $nodeSecurityRoot "node-v$nodeSecurityVersion-win-x64\node.exe"
$nodeSecuritySignature = Get-AuthenticodeSignature -LiteralPath $nodeSecurityExecutable
if ($nodeSecuritySignature.Status -ne "Valid" -or $nodeSecuritySignature.SignerCertificate.Subject -notmatch "OpenJS Foundation") {
  throw "Node.js executable signature verification failed."
}
& $nodeSecurityExecutable --version
Write-Output "Installed the verified SATP Node.js runtime. npm start and npm test will use this runtime."
