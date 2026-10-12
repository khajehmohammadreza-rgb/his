package main

import (
    "encoding/json"
    "crypto/sha256"
    "encoding/hex"
    "net/http"
    "net/url"
    "time"
    "errors"
    "fmt"
    "io"
    "os"
    "os/exec"
    "path/filepath"
    "strings"
    "syscall"
    "unsafe"
)

type Config struct {
    Product     string `json:"product"`
    Version     string `json:"version"`
    Role        string `json:"role"`
    RoleFa      string `json:"roleFa"`
    CenterID    string `json:"centerId"`
    CenterName  string `json:"centerName"`
    PackageKey  string `json:"packageKey"`
    DisplayName string `json:"displayName"`
    StartURL    string `json:"startUrl"`
    ServerURL   string `json:"serverUrl"`
}

var (
    modUser32  = syscall.NewLazyDLL("user32.dll")
    msgBoxW    = modUser32.NewProc("MessageBoxW")
    modOle32   = syscall.NewLazyDLL("ole32.dll")
    coInit     = modOle32.NewProc("CoInitializeEx")
    coUninit   = modOle32.NewProc("CoUninitialize")
    coCreate   = modOle32.NewProc("CoCreateInstance")
)

const (
    MB_OK              = 0x00000000
    MB_ICONINFORMATION = 0x00000040
    MB_ICONERROR       = 0x00000010
    CLSCTX_INPROC_SERVER = 0x1
    COINIT_APARTMENTTHREADED = 0x2
)

type GUID struct { Data1 uint32; Data2, Data3 uint16; Data4 [8]byte }
var CLSID_ShellLink = GUID{0x00021401,0x0000,0x0000,[8]byte{0xC0,0x00,0x00,0x00,0x00,0x00,0x00,0x46}}
var IID_IShellLinkW = GUID{0x000214F9,0x0000,0x0000,[8]byte{0xC0,0x00,0x00,0x00,0x00,0x00,0x00,0x46}}
var IID_IPersistFile = GUID{0x0000010b,0x0000,0x0000,[8]byte{0xC0,0x00,0x00,0x00,0x00,0x00,0x00,0x46}}

type iUnknownVtbl struct { QueryInterface, AddRef, Release uintptr }
type iShellLinkWVtbl struct {
    QueryInterface, AddRef, Release uintptr
    GetPath, GetIDList, SetIDList, GetDescription, SetDescription uintptr
    GetWorkingDirectory, SetWorkingDirectory, GetArguments, SetArguments uintptr
    GetHotkey, SetHotkey, GetShowCmd, SetShowCmd uintptr
    GetIconLocation, SetIconLocation, SetRelativePath, Resolve, SetPath uintptr
}
type iShellLinkW struct { Vtbl *iShellLinkWVtbl }
type iPersistFileVtbl struct { QueryInterface, AddRef, Release, GetClassID, IsDirty, Load, Save, SaveCompleted, GetCurFile uintptr }
type iPersistFile struct { Vtbl *iPersistFileVtbl }

func utf16ptr(s string) *uint16 { p,_:=syscall.UTF16PtrFromString(s); return p }
func message(title, text string, flags uintptr) { msgBoxW.Call(uintptr(0), uintptr(unsafe.Pointer(utf16ptr(text))), uintptr(unsafe.Pointer(utf16ptr(title))), flags) }

func hresultFailed(hr uintptr) bool { return int32(hr) < 0 }
func createShortcut(linkPath, target, args, workDir, description, iconPath string) error {
    hr,_,_ := coInit.Call(0, COINIT_APARTMENTTHREADED)
    if hresultFailed(hr) && uint32(hr) != 0x80010106 { return fmt.Errorf("CoInitializeEx: 0x%x", hr) }
    defer coUninit.Call()
    var sl *iShellLinkW
    hr,_,_ = coCreate.Call(uintptr(unsafe.Pointer(&CLSID_ShellLink)), 0, CLSCTX_INPROC_SERVER, uintptr(unsafe.Pointer(&IID_IShellLinkW)), uintptr(unsafe.Pointer(&sl)))
    if hresultFailed(hr) || sl==nil { return fmt.Errorf("CoCreateInstance: 0x%x", hr) }
    defer syscall.SyscallN(sl.Vtbl.Release, uintptr(unsafe.Pointer(sl)))
    call := func(fn uintptr, vals ...uintptr) error { argv:=append([]uintptr{uintptr(unsafe.Pointer(sl))}, vals...); r,_,_:=syscall.SyscallN(fn, argv...); if hresultFailed(r){return fmt.Errorf("HRESULT 0x%x",r)}; return nil }
    if err:=call(sl.Vtbl.SetPath, uintptr(unsafe.Pointer(utf16ptr(target)))); err!=nil{return err}
    if args!="" { if err:=call(sl.Vtbl.SetArguments, uintptr(unsafe.Pointer(utf16ptr(args)))); err!=nil{return err} }
    if workDir!="" { if err:=call(sl.Vtbl.SetWorkingDirectory, uintptr(unsafe.Pointer(utf16ptr(workDir)))); err!=nil{return err} }
    if description!="" { _=call(sl.Vtbl.SetDescription, uintptr(unsafe.Pointer(utf16ptr(description)))) }
    if iconPath!="" { _=call(sl.Vtbl.SetIconLocation, uintptr(unsafe.Pointer(utf16ptr(iconPath))), 0) }
    var pf *iPersistFile
    r,_,_:=syscall.SyscallN(sl.Vtbl.QueryInterface, uintptr(unsafe.Pointer(sl)), uintptr(unsafe.Pointer(&IID_IPersistFile)), uintptr(unsafe.Pointer(&pf)))
    if hresultFailed(r) || pf==nil { return fmt.Errorf("QueryInterface IPersistFile: 0x%x",r) }
    defer syscall.SyscallN(pf.Vtbl.Release, uintptr(unsafe.Pointer(pf)))
    r,_,_ = syscall.SyscallN(pf.Vtbl.Save, uintptr(unsafe.Pointer(pf)), uintptr(unsafe.Pointer(utf16ptr(linkPath))), 1)
    if hresultFailed(r) { return fmt.Errorf("Save shortcut: 0x%x",r) }
    return nil
}

func copyFile(src,dst string) error {
    in,err:=os.Open(src); if err!=nil{return err}; defer in.Close()
    if err=os.MkdirAll(filepath.Dir(dst),0755); err!=nil{return err}
    out,err:=os.Create(dst); if err!=nil{return err}
    _,cpy:=io.Copy(out,in); cerr:=out.Close(); if cpy!=nil{return cpy}; return cerr
}
func readConfig(dir string)(Config,error){
    var c Config
    b,err:=os.ReadFile(filepath.Join(dir,"client.json")); if err!=nil{return c,err}
    if err=json.Unmarshal(b,&c); err!=nil{return c,err}
    if c.StartURL==""||c.PackageKey==""||c.DisplayName=="" {return c,errors.New("client.json ناقص است")}
    return c,nil
}
func sanitize(s string) string {
    s=strings.TrimSpace(s); if s==""{return "BastiyanClient"}
    repl:=strings.NewReplacer("/","-","\\","-",":","-","*","-","?","-","\"","-","<","-",">","-","|","-")
    return repl.Replace(s)
}
func desktopDir() string { if p:=os.Getenv("USERPROFILE"); p!="" { return filepath.Join(p,"Desktop") }; return filepath.Join(os.Getenv("HOMEDRIVE")+os.Getenv("HOMEPATH"),"Desktop") }
func startMenuDir() string { return filepath.Join(os.Getenv("APPDATA"),"Microsoft","Windows","Start Menu","Programs","Bastiyan") }
const launcherVersion = "3.3.20"

type RuntimeManifest struct {
    Version string `json:"version"`
    SHA256 string `json:"sha256"`
    URL string `json:"url"`
}
func findBrowser() (string,string) {
    bases:=[]string{os.Getenv("ProgramFiles(x86)"),os.Getenv("ProgramFiles"),os.Getenv("LOCALAPPDATA")}
    names:=[]struct{kind,sub string}{
        {"chromium",filepath.Join("Microsoft","Edge","Application","msedge.exe")},
        {"chromium",filepath.Join("Google","Chrome","Application","chrome.exe")},
        {"firefox",filepath.Join("Mozilla Firefox","firefox.exe")},
        {"chromium",filepath.Join("Chromium","Application","chrome.exe")},
    }
    for _,b:=range bases {if b=="" {continue};for _,x:=range names {p:=filepath.Join(b,x.sub);if st,e:=os.Stat(p);e==nil&&!st.IsDir(){return p,x.kind}}}
    return "",""
}
func httpGet(u string) (*http.Response,error) {
    c:=http.Client{Timeout:4*time.Second}
    return c.Get(u)
}
func newerVersion(a,b string) bool { // a is offered, b current
    var ax,bx [3]int
    fmt.Sscanf(a,"%d.%d.%d",&ax[0],&ax[1],&ax[2]);fmt.Sscanf(b,"%d.%d.%d",&bx[0],&bx[1],&bx[2])
    for k:=0;k<3;k++ {if ax[k]!=bx[k] {return ax[k]>bx[k]}}
    return false
}
// On a first connection check for a validated new runtime without touching client.json,
// login profiles or clinical data. A detached new binary performs the swap after exit.
func tryUpdate(c Config) bool {
    base,err:=url.Parse(c.ServerURL);if err!=nil||base.Scheme!="https"||base.Host=="" {return false}
    u:=base.ResolveReference(&url.URL{Path:"/windows-runtime/version.json"}).String()
    r,e:=httpGet(u);if e!=nil{return false};defer r.Body.Close();if r.StatusCode!=200{return false}
    var m RuntimeManifest
    if json.NewDecoder(io.LimitReader(r.Body,8192)).Decode(&m)!=nil||!newerVersion(m.Version,launcherVersion)||len(m.SHA256)!=64{return false}
    // Prevent redirects to untrusted origins. The binary URL is a fixed same-origin path.
    binURL:=base.ResolveReference(&url.URL{Path:"/windows-runtime/Bastiyan-Windows-Installer-x64.exe"}).String()
    resp,e:=httpGet(binURL);if e!=nil{return false};defer resp.Body.Close();if resp.StatusCode!=200||resp.ContentLength>30*1024*1024{return false}
    self,e:=os.Executable();if e!=nil{return false}
    pending:=filepath.Join(filepath.Dir(self),"BastiyanClient.update.exe")
    f,e:=os.OpenFile(pending,os.O_CREATE|os.O_TRUNC|os.O_WRONLY,0700);if e!=nil{return false}
    h:=sha256.New();n,e:=io.Copy(io.MultiWriter(f,h),io.LimitReader(resp.Body,30*1024*1024+1));closeErr:=f.Close()
    if e!=nil||closeErr!=nil||n<500000||n>30*1024*1024||!strings.EqualFold(hex.EncodeToString(h.Sum(nil)),m.SHA256){os.Remove(pending);return false}
    // Do not modify a running executable. Child waits for this process to exit.
    cmd:=exec.Command(pending,"--apply-update",self)
    if cmd.Start()!=nil {os.Remove(pending);return false};return true
}
func applyUpdate(target string){
    self,e:=os.Executable();if e!=nil{return}
    backup:=target+".bak"
    for tries:=0;tries<25;tries++{
        time.Sleep(350*time.Millisecond)
        _=os.Remove(backup)
        if os.Rename(target,backup)!=nil {continue}
        if e=os.Rename(self,target);e!=nil {_=os.Rename(backup,target);continue}
        if e=exec.Command(target,"--launch").Start();e!=nil {
            // Roll back if the new launcher cannot be executed.
            _=os.Rename(target,self);_ = os.Rename(backup,target)
            _=exec.Command(target,"--launch").Start()
        }
        return
    }
    _=exec.Command(target,"--launch").Start() // keep last working version
}
func launch(c Config) error {
    browser,kind:=findBrowser()
    if browser=="" {return errors.New("مرورگر سازگار پیدا نشد. برای نصب تنها یکی از Chrome، Edge یا Firefox نیاز است. برنامه و اطلاعات حذف نشده‌اند.")}
    profile:=filepath.Join(os.Getenv("LOCALAPPDATA"),"Bastiyan","Profiles",sanitize(c.PackageKey))
    _=os.MkdirAll(profile,0755)
    var cmd *exec.Cmd
    if kind=="firefox" {cmd=exec.Command(browser,"-no-remote","-profile",profile,"--new-window",c.StartURL)} else {
        args:=[]string{"--app="+c.StartURL,"--user-data-dir="+profile,"--no-first-run","--disable-features=Translate,MediaRouter"}
        if c.Role=="secretary" {args=append(args,"--kiosk-printing")}
        cmd=exec.Command(browser,args...)
    }
    if err:=cmd.Start(); err!=nil {return err}
    if c.Role=="doctor" {
        if self,e:=os.Executable();e==nil { _=exec.Command(self,"--assistant").Start() }
    }
    return nil
}
func install(exeDir string,c Config) error {
    root:=filepath.Join(os.Getenv("LOCALAPPDATA"),"Programs","Bastiyan",sanitize(c.PackageKey))
    if err:=os.MkdirAll(root,0755); err!=nil{return err}
    self,err:=os.Executable(); if err!=nil{return err}
    target:=filepath.Join(root,"BastiyanClient.exe")
    if err:=copyFile(self,target); err!=nil{return err}
    if err:=copyFile(filepath.Join(exeDir,"client.json"),filepath.Join(root,"client.json")); err!=nil{return err}
    iconSrc:=filepath.Join(exeDir,"bastiyan.ico"); iconDst:=filepath.Join(root,"bastiyan.ico")
    if _,e:=os.Stat(iconSrc); e==nil { _=copyFile(iconSrc,iconDst) }
    shortcutName:=sanitize(c.DisplayName)+".lnk"
    desc:=c.DisplayName+" - "+c.CenterName
    _=os.MkdirAll(desktopDir(),0755)
    if err:=createShortcut(filepath.Join(desktopDir(),shortcutName),target,"--launch",root,desc,iconDst); err!=nil{return err}
    sm:=startMenuDir(); _=os.MkdirAll(sm,0755)
    _=createShortcut(filepath.Join(sm,shortcutName),target,"--launch",root,desc,iconDst)
    message("نصب باستیان","نصب با موفقیت انجام شد.\r\n\r\n"+c.DisplayName+"\r\n"+c.CenterName+"\r\n\r\nآیکن برنامه روی Desktop و Start Menu ایجاد شد.",MB_OK|MB_ICONINFORMATION)
    // Start the installed copy, not the temporary installer extracted from ZIP.
    return exec.Command(target,"--launch").Start()
}
func main(){
    exe,err:=os.Executable(); if err!=nil {message("Bastiyan",err.Error(),MB_OK|MB_ICONERROR); return}
    dir:=filepath.Dir(exe)
    c,err:=readConfig(dir); if err!=nil { message("بسته نصب باستیان","فایل client.json کنار برنامه پیدا نشد یا معتبر نیست.\r\n"+err.Error(),MB_OK|MB_ICONERROR); return }
    if len(os.Args)>=3 && os.Args[1]=="--apply-update" {applyUpdate(os.Args[2]);return}
    if len(os.Args)>=2 && os.Args[1]=="--assistant" {
        if c.Role=="doctor" {runDoctorAssistant(c)}
        return
    }
    launchOnly:=false; for _,a:=range os.Args[1:] {if a=="--launch"{launchOnly=true}}
    if launchOnly {
        if tryUpdate(c) {return}
        if err:=launch(c); err!=nil {message("اجرای باستیان",err.Error(),MB_OK|MB_ICONERROR)}; return
    }
    if err:=install(dir,c); err!=nil { message("نصب باستیان","نصب انجام نشد:\r\n"+err.Error(),MB_OK|MB_ICONERROR); return }
}
