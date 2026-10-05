param(
  [Parameter(Mandatory=$true)][ValidateSet('Run','Inspect','Guard','Remove','Shortcut')][string]$Action,
  [string]$NodePath,
  [string]$PayloadPath
)
$ErrorActionPreference='Stop'
$repoPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if($Action -eq 'Run') {
  # A kernel mutex has atomic ownership and is released even after a crash.
  $sha=[Security.Cryptography.SHA256]::Create()
  $key=[BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($repoPath.ToLowerInvariant()))).Replace('-','')
  $mutex=New-Object Threading.Mutex($false,('Local\CardableDelivery-'+$key))
  $held=$false
  $fileLock=$null
  try {
    try {$held=$mutex.WaitOne(0)} catch [Threading.AbandonedMutexException] {$held=$true}
    if(!$held){throw 'Another desktop delivery is running. Wait for it to finish.'}
    $lockDirectory=Join-Path $repoPath 'dist\delivery'
    $lockPath=Join-Path $lockDirectory '.exclusive.lock'
    $cursor=$lockPath
    while($cursor){if((Test-Path -LiteralPath $cursor) -and ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Lock path contains a reparse point'};$parent=[IO.Directory]::GetParent($cursor);if(!$parent){break};$cursor=$parent.FullName}
    [IO.Directory]::CreateDirectory($lockDirectory)|Out-Null
    # FileShare.None also excludes other Windows logon sessions. A dead process
    # releases its handle; an empty persistent lock file is not a stale owner.
    $fileLock=[IO.File]::Open($lockPath,[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
    & $NodePath (Join-Path $PSScriptRoot 'deliver-desktop.cjs') '--locked'
    $result=$LASTEXITCODE
  } finally {if($fileLock){$fileLock.Dispose()};if($held){$mutex.ReleaseMutex()};$mutex.Dispose();$sha.Dispose()}
  exit $result
}
if($Action -eq 'Inspect') {
  $desktopPath=[Environment]::GetFolderPath('DesktopDirectory')
  $shell=New-Object -ComObject WScript.Shell
  $links=@(Get-ChildItem -LiteralPath $desktopPath -Filter '*Cardable*.lnk' -File | ForEach-Object {
    $link=$shell.CreateShortcut($_.FullName)
    @{path=$_.FullName;target=$link.TargetPath;arguments=$link.Arguments;workingDirectory=$link.WorkingDirectory;icon=$link.IconLocation;reparse=[bool]($_.Attributes -band [IO.FileAttributes]::ReparsePoint)}
  })
  $processes=@(Get-CimInstance Win32_Process -Filter "Name='Cardable.exe'" | ForEach-Object {@{pid=$_.ProcessId;path=$_.ExecutablePath}})
  $buildProcesses=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains($repoPath) -and $_.CommandLine -match 'electron-builder.*cli'} | ForEach-Object {@{pid=$_.ProcessId}})
  @{desktop=$desktopPath;links=$links;processes=$processes;buildProcesses=$buildProcesses}|ConvertTo-Json -Depth 5 -Compress
  exit 0
}
$payload=Get-Content -LiteralPath $PayloadPath -Raw | ConvertFrom-Json
if($Action -in @('Guard','Remove')) {
  foreach($target in $payload.paths) {
    $resolved=[IO.Path]::GetFullPath($target)
    $distPath=[IO.Path]::GetFullPath((Join-Path $repoPath 'dist'))
    if(!$resolved.StartsWith($distPath+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw "Path is outside owned dist: $resolved"}
    $cursor=$resolved
    while($cursor) {
      if(Test-Path -LiteralPath $cursor){if((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Refusing reparse point: $cursor"}}
      $parent=[IO.Directory]::GetParent($cursor)
      if(!$parent){break};$cursor=$parent.FullName
    }
    if(Test-Path -LiteralPath $resolved) {
      Get-ChildItem -LiteralPath $resolved -Force -Recurse | ForEach-Object {if($_.Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Refusing nested reparse point: $($_.FullName)"}}
    }
  }
  if($Action -eq 'Remove') {
    $target=[IO.Path]::GetFullPath($payload.target)
    if($payload.paths.Count -ne 1 -or $target -ne [IO.Path]::GetFullPath($payload.paths[0])){throw 'Removal guard target mismatch'}
    $actual=@(Get-ChildItem -LiteralPath $target -File -Force -Recurse)
    if($actual.Count -ne $payload.expected.Count){throw 'Owned file count changed'}
    $streams=New-Object Collections.Generic.List[IO.FileStream]
    try {
      foreach($entry in $payload.expected) {
        $file=[IO.Path]::GetFullPath((Join-Path $target $entry.path))
        if(!$file.StartsWith($target+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Owned file path escaped removal target'}
        # Claim every file before removing anything. A running/locked image or
        # another reader/writer makes the whole cleanup defer, with no force kill.
        $stream=[IO.File]::Open($file,[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::Delete)
        $streams.Add($stream)
        $algorithm=[Security.Cryptography.SHA256]::Create()
        try {$digest=[BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-','').ToLowerInvariant()}finally{$algorithm.Dispose()}
        if($stream.Length -ne $entry.size -or $digest -ne $entry.sha256){throw 'Owned file hash changed'}
      }
      for($index=0;$index -lt $payload.expected.Count;$index++) {
        $file=[IO.Path]::GetFullPath((Join-Path $target $payload.expected[$index].path))
        Remove-Item -LiteralPath $file -Force
        $streams[$index].Dispose()
      }
      Remove-Item -LiteralPath $target -Recurse -Force
    } finally {foreach($stream in $streams){$stream.Dispose()}}
  }
  'OK'
  exit 0
}
if($Action -eq 'Shortcut') {
  $shell=New-Object -ComObject WScript.Shell
  $link=$shell.CreateShortcut($payload.path)
  $link.TargetPath=$payload.target
  $link.WorkingDirectory=[IO.Path]::GetDirectoryName($payload.target)
  $link.Arguments=''
  $link.IconLocation=$payload.target+',0'
  $link.Description='Cardable local preview — stable entry location'
  $link.Save()
  $read=$shell.CreateShortcut($payload.path)
  @{target=$read.TargetPath;arguments=$read.Arguments;workingDirectory=$read.WorkingDirectory;icon=$read.IconLocation}|ConvertTo-Json -Compress
}
