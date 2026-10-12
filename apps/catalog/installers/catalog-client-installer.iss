[Setup]
AppId={{513296C4-9638-4C68-B140-D25B2D6CBE66}
AppName=Bastiyan Catalog Client
AppVersion=2.5.0
AppPublisher=Bastiyan
DefaultDirName={autopf}\Bastiyan Catalog Client
DefaultGroupName=Bastiyan Catalog
OutputDir=dist
OutputBaseFilename=Bastiyan-Catalog-Client-Setup-v2.5
SetupIconFile=catalog\app\bastiyan.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
DisableProgramGroupPage=yes

[Files]
Source: "dist\Bastiyan-Catalog-Client.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\کلاینت گردآورنده باستیان"; Filename: "{app}\Bastiyan-Catalog-Client.exe"; WorkingDir: "{app}"
Name: "{group}\کلاینت گردآورنده باستیان"; Filename: "{app}\Bastiyan-Catalog-Client.exe"

[Run]
Filename: "{app}\Bastiyan-Catalog-Client.exe"; Description: "اجرای کلاینت باستیان"; Flags: nowait postinstall skipifsilent
