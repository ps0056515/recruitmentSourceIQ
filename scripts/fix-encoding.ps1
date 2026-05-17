$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$files = Get-ChildItem -Path $root -Recurse -Include package.json,tsconfig.json -File
foreach ($f in $files) {
  $bytes = [IO.File]::ReadAllBytes($f.FullName)
  if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
    $text = [Text.Encoding]::Unicode.GetString($bytes, 2, $bytes.Length - 2)
    [IO.File]::WriteAllText($f.FullName, $text, [Text.UTF8Encoding]::new($false))
    Write-Host "Fixed $($f.FullName)"
  }
}
