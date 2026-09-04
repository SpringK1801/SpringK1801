param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$logoDirectory = Join-Path $Root "assets\logos"

function Test-LogoPixel {
  param(
    [System.Drawing.Color]$Pixel,
    [ValidateSet("proporto", "caravel", "curseforge")]
    [string]$Mode
  )

  if ($Pixel.A -lt 20) { return $false }
  switch ($Mode) {
    "proporto" { return $Pixel.R -gt 120 -and $Pixel.G -gt 95 -and $Pixel.B -lt 100 }
    "caravel" { return $Pixel.R -gt 110 -and $Pixel.G -lt 120 -and $Pixel.B -lt 140 }
    "curseforge" { return $Pixel.R -gt 140 -and $Pixel.G -lt 150 -and $Pixel.B -lt 90 }
  }
}

function Convert-LogoMask {
  param(
    [string]$Source,
    [string]$Destination,
    [string]$Mode,
    [string]$StartColor,
    [string]$EndColor
  )

  $bitmap = [System.Drawing.Bitmap]::FromFile($Source)
  try {
    $segments = [System.Collections.Generic.List[string]]::new()
    for ($y = 0; $y -lt $bitmap.Height; $y++) {
      $x = 0
      while ($x -lt $bitmap.Width) {
        while ($x -lt $bitmap.Width -and -not (Test-LogoPixel -Pixel $bitmap.GetPixel($x, $y) -Mode $Mode)) { $x++ }
        $start = $x
        while ($x -lt $bitmap.Width -and (Test-LogoPixel -Pixel $bitmap.GetPixel($x, $y) -Mode $Mode)) { $x++ }
        if ($x -gt $start) {
          $segments.Add("M$start $y`H$x`V$($y + 1)`H$start`Z")
        }
      }
    }

    $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 $($bitmap.Width) $($bitmap.Height)">
  <defs>
    <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="$StartColor"/>
      <stop offset="1" stop-color="$EndColor"/>
    </linearGradient>
  </defs>
  <path fill="url(#logo-gradient)" d="$([string]::Join('', $segments))"/>
</svg>
"@
    [IO.File]::WriteAllText($Destination, $svg, [Text.UTF8Encoding]::new($false))
  }
  finally {
    $bitmap.Dispose()
  }
}

$daily = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="108" fill="#F7F5EF"/>
  <path fill="#DD713E" d="M256 64 291 145 370 106 357 193 443 208 384 272 443 338 357 351 369 438 290 400 256 447 221 367 143 406 155 319 68 304 128 240 68 176 155 161 143 74 222 113Z"/>
  <circle cx="256" cy="256" r="62" fill="#F7F5EF"/>
</svg>
"@
[IO.File]::WriteAllText((Join-Path $logoDirectory "playdailygame.svg"), $daily, [Text.UTF8Encoding]::new($false))

Convert-LogoMask -Source (Join-Path $logoDirectory "proporto.png") -Destination (Join-Path $logoDirectory "proporto.svg") -Mode "proporto" -StartColor "#FFE500" -EndColor "#F4C900"
Convert-LogoMask -Source (Join-Path $logoDirectory "caravel-racing.png") -Destination (Join-Path $logoDirectory "caravel-racing.svg") -Mode "caravel" -StartColor "#D90016" -EndColor "#EC2651"
Convert-LogoMask -Source (Join-Path $logoDirectory "curseforge.png") -Destination (Join-Path $logoDirectory "curseforge.svg") -Mode "curseforge" -StartColor "#FF5A00" -EndColor "#FF3D00"

Write-Host "Created vector project logos in $logoDirectory"
