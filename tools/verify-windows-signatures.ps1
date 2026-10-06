# Public-release artifact gate. Never installs or launches an artifact.
$ErrorActionPreference = 'Stop'
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseVersion = (Get-Content -LiteralPath (Join-Path $releaseRoot 'package.json') -Raw | ConvertFrom-Json).version
$releaseFiles = @(
  (Join-Path $releaseRoot "dist\Cardable-Setup-$releaseVersion.exe"),
  (Join-Path $releaseRoot 'dist\win-unpacked\Cardable.exe')
)
foreach ($releaseFile in $releaseFiles) {
  if (!(Test-Path -LiteralPath $releaseFile -PathType Leaf)) { throw "Missing release artifact: $([IO.Path]::GetFileName($releaseFile))" }
  $releaseSignature = Get-AuthenticodeSignature -LiteralPath $releaseFile
  if ($releaseSignature.Status -ne 'Valid' -or !$releaseSignature.SignerCertificate) {
    throw "Release signature is not trusted and valid: $([IO.Path]::GetFileName($releaseFile)) ($($releaseSignature.Status))"
  }
  if (!$releaseSignature.TimeStamperCertificate) { throw "Release signature has no timestamp: $([IO.Path]::GetFileName($releaseFile))" }
  $releasePublisher = $releaseSignature.SignerCertificate.GetNameInfo([Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false)
  if ($env:CARDABLE_SIGNING_PUBLISHER -and $releasePublisher -cne $env:CARDABLE_SIGNING_PUBLISHER) { throw 'Release signer does not match the configured publisher' }
  Write-Output "$([IO.Path]::GetFileName($releaseFile)): trusted, timestamped signature from $releasePublisher"
}
