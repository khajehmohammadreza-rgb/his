param([ValidateSet('server','client')][string]$Role='client')
$ErrorActionPreference='Stop'
$App = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
$State = Join-Path $env:LOCALAPPDATA 'Bastiyan Catalog'
New-Item -ItemType Directory -Force -Path $State | Out-Null
$Log = Join-Path $State 'startup.log'
function Log([string]$m) { ('[{0}] {1}' -f (Get-Date -Format s),$m) | Add-Content -Path $Log -Encoding UTF8 }
function Find-Python {
    $candidates=@()
    foreach($c in @('py','python')) {
        $cmd=Get-Command $c -ErrorAction SilentlyContinue
        if($cmd) { $candidates+=@($cmd.Source) }
    }
    $candidates+=@(Join-Path $State 'Python\python.exe')
    foreach($path in $candidates) {
        if(!$path){continue}
        try {
            $version=& $path -c 'import sys;print(sys.version_info.major*100+sys.version_info.minor)' 2>$null
            if([int]$version -ge 310){return $path}
        } catch{}
    }
    return $null
}
function Install-Python {
    Log 'Python missing: installing per-user official runtime'
    $installer=Join-Path $State 'python-install.exe'
    $url='https://www.python.org/ftp/python/3.13.9/python-3.13.9-amd64.exe'
    Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
    $sig=Get-AuthenticodeSignature -FilePath $installer
    if($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'Python Software Foundation') {
        throw 'Official Python installer signature verification failed.'
    }
    $target=Join-Path $State 'Python'
    $arguments=@('/quiet','InstallAllUsers=0','Include_pip=1','PrependPath=0',("TargetDir=$target"))
    $proc=Start-Process -FilePath $installer -ArgumentList $arguments -PassThru -Wait
    if($proc.ExitCode -ne 0){throw ('Python setup returned '+$proc.ExitCode)}
    Remove-Item $installer -Force -ErrorAction SilentlyContinue
}
try {
    $python=Find-Python
    if(!$python){Install-Python;$python=Find-Python}
    if(!$python){throw 'Automatic runtime installation was not completed. Internet required on first use.'}
    if($Role -eq 'server') {
        $firewallFlag=Join-Path $State 'firewall-prompted.txt'
        if(!(Test-Path $firewallFlag)) {
            try {
                $fwScript=Join-Path $App 'windows\Allow-LAN.ps1'
                Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$fwScript+'"')) -Wait -ErrorAction Stop
            }catch{Log 'Firewall configuration was declined/blocked; LAN clients may not connect.'}
            'Firewall permissions might require Windows administrator approval' | Set-Content -Path $firewallFlag
        }
        & $python -c 'import cryptography' 2>$null
        if($LASTEXITCODE -ne 0){
            Log 'Installing HTTPS runtime dependency'
            & $python -m pip install --disable-pip-version-check --user 'cryptography>=42' *> (Join-Path $State 'pip.log')
            if($LASTEXITCODE -ne 0){throw 'HTTPS dependency install failed; see pip.log'}
        }
        $target=Join-Path $App 'windows\supervisor.py'
    } else {
        $target=Join-Path $App 'windows\connection_agent.py'
    }
    Log ("Starting role=$Role using $python")
    & $python $target
} catch {
    Log ($_.Exception.Message)
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show("راه‌اندازی باستیان کامل نشد.`n"+$_.Exception.Message+"`nگزارش: "+$Log,'Bastiyan Catalog') | Out-Null
    exit 1
}
