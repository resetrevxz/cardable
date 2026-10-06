$ErrorActionPreference = 'Stop'
$labels = Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\.github\labels.json') -Raw | ConvertFrom-Json
foreach ($label in $labels.PSObject.Properties) {
  gh label create $label.Name --color $label.Value --repo resetrevxz/cardable --force
  if ($LASTEXITCODE -ne 0) { throw "Could not apply label: $($label.Name)" }
}
