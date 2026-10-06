param([string]$AppFolder, [string]$OutputFolder)
$ErrorActionPreference = 'Stop'
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseVersion = (Get-Content -LiteralPath (Join-Path $releaseRoot 'package.json') -Raw | ConvertFrom-Json).version
if (!$AppFolder) { $AppFolder = Join-Path $releaseRoot 'dist\win-unpacked' }
if (!$OutputFolder) { $OutputFolder = Join-Path $releaseRoot 'dist' }
$releaseFolder = [IO.Path]::GetFullPath($AppFolder)
$releaseOutput = [IO.Path]::GetFullPath($OutputFolder)
$ownedRoot = Join-Path $releaseRoot 'dist'
foreach ($checked in @($releaseFolder, $releaseOutput)) {
  if (!$checked.StartsWith($ownedRoot + '\', [StringComparison]::OrdinalIgnoreCase) -and $checked -ne $ownedRoot) { throw 'Release folders must be inside this repository dist.' }
  $ancestor = $checked
  while ($ancestor) {
    if ((Test-Path -LiteralPath $ancestor) -and ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Release path contains a junction.' }
    $ancestor = Split-Path $ancestor -Parent
  }
}
foreach ($required in @('Cardable.exe','resources\app.asar','chrome_100_percent.pak','icudtl.dat','locales')) {
  if (!(Test-Path -LiteralPath (Join-Path $releaseFolder $required))) { throw "Incomplete Electron folder: $required" }
}
if (@(Get-ChildItem -LiteralPath $releaseFolder -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) { throw 'Release folder contains linked resources.' }
New-Item -ItemType Directory -Path $releaseOutput -Force | Out-Null
$releaseZip = Join-Path $releaseOutput "Cardable-$releaseVersion-Windows-x64.zip"
if (Test-Path -LiteralPath $releaseZip) { throw 'Release ZIP already exists; preserve it and use a fresh output folder.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($releaseFolder, $releaseZip, [IO.Compression.CompressionLevel]::Optimal, $false)
$zip = [IO.Compression.ZipFile]::OpenRead($releaseZip)
try {
  $sourceFiles = @(Get-ChildItem -LiteralPath $releaseFolder -File -Recurse -Force)
  if ($sourceFiles.Count -ne @($zip.Entries | Where-Object { $_.Name }).Count) { throw 'ZIP is missing files.' }
  foreach ($sourceFile in $sourceFiles) {
    $relative = $sourceFile.FullName.Substring($releaseFolder.Length + 1).Replace('\','/')
    $entry = $zip.GetEntry($relative)
    if (!$entry -or $entry.Length -ne $sourceFile.Length) { throw "Incomplete ZIP entry: $relative" }
    $stream = $entry.Open(); $sha = [Security.Cryptography.SHA256]::Create()
    try { $entryHash = ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','') } finally { $stream.Dispose(); $sha.Dispose() }
    if ($entryHash -ne (Get-FileHash -LiteralPath $sourceFile.FullName -Algorithm SHA256).Hash) { throw "ZIP checksum mismatch: $relative" }
  }
} finally { $zip.Dispose() }
Write-Output "Complete Electron folder packaged and verified: $releaseZip"
