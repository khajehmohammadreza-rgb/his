# Windows UAC prompt is mandatory to alter firewall; limit incoming ports to Private profile.
$ErrorActionPreference='Stop'
foreach($r in @(@('Bastiyan Catalog HTTPS','TCP',8765),@('Bastiyan Catalog Discovery','UDP',8766))){
  $rule=Get-NetFirewallRule -DisplayName $r[0] -ErrorAction SilentlyContinue
  if(!$rule) { New-NetFirewallRule -DisplayName $r[0] -Direction Inbound -Action Allow -Protocol $r[1] -LocalPort $r[2] -Profile Private | Out-Null }
}
