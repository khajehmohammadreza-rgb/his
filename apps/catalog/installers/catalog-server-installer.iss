[Setup]
AppId={{AA2D17B2-A587-42EF-80AF-52D30BE851C0}
AppName=Bastiyan Catalog Server
AppVersion=2.4.0
AppPublisher=Bastiyan
DefaultDirName={autopf}\Bastiyan Catalog Server
DefaultGroupName=Bastiyan Catalog
OutputDir=dist
OutputBaseFilename=Bastiyan-Catalog-Server-Setup-v2.4
SetupIconFile=catalog\app\bastiyan.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
DisableProgramGroupPage=yes

[Files]
Source: "dist\Bastiyan-Catalog-Server.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\سرور گردآورنده باستیان"; Filename: "{app}\Bastiyan-Catalog-Server.exe"; WorkingDir: "{app}"
Name: "{group}\سرور گردآورنده باستیان"; Filename: "{app}\Bastiyan-Catalog-Server.exe"

[Run]
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall add rule name=""Bastiyan Catalog HTTPS 8765"" dir=in action=allow protocol=TCP localport=8765"; Flags: runhidden waituntilterminated
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall add rule name=""Bastiyan Catalog Discovery 8766"" dir=in action=allow protocol=UDP localport=8766"; Flags: runhidden waituntilterminated
Filename: "{app}\Bastiyan-Catalog-Server.exe"; Description: "اجرای سرور باستیان"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""Bastiyan Catalog HTTPS 8765"""; Flags: runhidden
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""Bastiyan Catalog Discovery 8766"""; Flags: runhidden
