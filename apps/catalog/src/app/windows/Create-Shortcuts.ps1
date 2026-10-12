$base=Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
$desktop=[Environment]::GetFolderPath('Desktop')
$shell=New-Object -ComObject WScript.Shell
foreach($role in @(@('سرور باستیان','01-سرور-مرکز.bat'),@('کلاینت باستیان','02-کلاینت-ویندوز.bat'))) {
 $s=$shell.CreateShortcut((Join-Path $desktop ($role[0]+'.lnk')))
 $s.TargetPath=Join-Path $base $role[1];$s.WorkingDirectory=$base
 $s.IconLocation=Join-Path $base 'bastiyan.ico'
 $s.Save()
}
Write-Host 'Desktop shortcuts created.'
