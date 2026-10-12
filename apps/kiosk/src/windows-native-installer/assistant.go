//go:build windows

// Bastiyan Doctor Quick Assistant — global hotkeys and a topmost Chromium app window.
// No credentials or patient data pass through native IPC. The web UI uses the existing
// authenticated physician session in the same browser profile as the main client.
package main

import (
    "crypto/sha256"
    "fmt"
    "net/url"
    "os"
    "os/exec"
    "path/filepath"
    "runtime"
    "strings"
    "syscall"
    "time"
    "unsafe"
)

var (
    hkUser32 = syscall.NewLazyDLL("user32.dll")
    hkKernel32 = syscall.NewLazyDLL("kernel32.dll")
    registerHotKeyProc = hkUser32.NewProc("RegisterHotKey")
    unregisterHotKeyProc = hkUser32.NewProc("UnregisterHotKey")
    getMessageProc = hkUser32.NewProc("GetMessageW")
    enumWindowsProc = hkUser32.NewProc("EnumWindows")
    getWindowTextProc = hkUser32.NewProc("GetWindowTextW")
    isWindowProc = hkUser32.NewProc("IsWindow")
    setWindowPosProc = hkUser32.NewProc("SetWindowPos")
    showWindowProc = hkUser32.NewProc("ShowWindow")
    isWindowVisibleProc = hkUser32.NewProc("IsWindowVisible")
    setForegroundWindowProc = hkUser32.NewProc("SetForegroundWindow")
    systemMetricsProc = hkUser32.NewProc("GetSystemMetrics")
    createMutexProc = hkKernel32.NewProc("CreateMutexW")
    closeHandleProc = hkKernel32.NewProc("CloseHandle")
)

const (
    wmHotkey = 0x0312
    modCtrl = 0x0002
    modNoRepeat = 0x4000
    keyF8 = 0x77
    swHide = 0
    swShow = 5
    swRestore = 9
    hwndTopmost = ^uintptr(0) // -1
    swpShowWindow = 0x0040
    swpNoActivate = 0x0010
)

type nativePoint struct { X int32; Y int32 }
type nativeMsg struct {
    Hwnd uintptr
    Message uint32
    Wparam uintptr
    Lparam uintptr
    Time uint32
    Pt nativePoint
    LPrivate uint32
}

func assistantKey(c Config) string {
    h:=sha256.Sum256([]byte(c.PackageKey))
    return fmt.Sprintf("%x",h[:6])
}
func assistantURL(c Config) (string,error) {
    u,err:=url.Parse(c.StartURL)
    if err!=nil || (u.Scheme!="http"&&u.Scheme!="https") || u.Host=="" {return "",fmt.Errorf("آدرس برنامه معتبر نیست")}
    u.Path="/doctor-assistant.html";u.RawPath="";u.RawQuery="aid="+assistantKey(c);u.Fragment=""
    return u.String(),nil
}
func visibleAssistantWindow(marker string) uintptr {
    var found uintptr
    callback:=syscall.NewCallback(func(hwnd uintptr, extra uintptr) uintptr {
        buffer:=make([]uint16,512)
        n,_,_:=getWindowTextProc.Call(hwnd,uintptr(unsafe.Pointer(&buffer[0])),uintptr(len(buffer)))
        if n==0 {return 1}
        title:=syscall.UTF16ToString(buffer)
        if strings.Contains(title,marker) {found=hwnd;return 0}
        return 1
    })
    enumWindowsProc.Call(callback,0)
    return found
}
func assistantBounds() (int,int,int,int) {
    width,height:=368,488
    w,_,_:=systemMetricsProc.Call(0);h,_,_:=systemMetricsProc.Call(1)
    x,y:=int(w)-width-26,int(h)-height-90
    if x<0{x=0};if y<0{y=0}
    return x,y,width,height
}
func openAssistantBrowser(c Config) error {
    u,err:=assistantURL(c);if err!=nil{return err}
    browser,kind:=findBrowser();if browser=="" {return fmt.Errorf("Edge، Chrome یا Firefox نصب نیست")}
    x,y,w,h:=assistantBounds()
    profile:=filepath.Join(os.Getenv("LOCALAPPDATA"),"Bastiyan","Profiles",sanitize(c.PackageKey))
    _=os.MkdirAll(profile,0755)
    var cmd *exec.Cmd
    if kind=="firefox" {
        cmd=exec.Command(browser,"-no-remote","-profile",profile,"--new-window",u)
    } else {
        cmd=exec.Command(browser,"--app="+u,"--user-data-dir="+profile,"--no-first-run",fmt.Sprintf("--window-size=%d,%d",w,h),fmt.Sprintf("--window-position=%d,%d",x,y))
    }
    return cmd.Start()
}
func showAssistant(hwnd uintptr) {
    x,y,w,h:=assistantBounds()
    showWindowProc.Call(hwnd,swRestore)
    setWindowPosProc.Call(hwnd,hwndTopmost,uintptr(x),uintptr(y),uintptr(w),uintptr(h),swpShowWindow)
    setForegroundWindowProc.Call(hwnd)
}
func toggleAssistant(c Config, marker string, hidden *bool) {
    hwnd:=visibleAssistantWindow(marker)
    if hwnd!=0 {
        if !*hidden {
            showWindowProc.Call(hwnd,swHide)
            *hidden=true
            return
        }
        showAssistant(hwnd)
        *hidden=false
        return
    }
    *hidden=true
    if err:=openAssistantBrowser(c);err!=nil {
        message("دستیار پزشک باستیان",err.Error(),MB_OK|MB_ICONERROR)
        return
    }
    // Edge/Chrome may reuse an existing process; detect its newly created native window.
    for i:=0;i<48;i++ {
        time.Sleep(150*time.Millisecond)
        hwnd=visibleAssistantWindow(marker)
        if hwnd!=0 {showAssistant(hwnd);*hidden=false;return}
    }
    message("دستیار پزشک باستیان","پنجره دستیار شناسایی نشد؛ اجرای مرورگر و دسترسی به سرور را بررسی کنید.",MB_OK|MB_ICONERROR)
}
func runDoctorAssistant(c Config) {
    if c.Role!="doctor" {return}
    runtime.LockOSThread()
    defer runtime.UnlockOSThread()
    // A helper per installed doctor profile; prevent duplicate hotkey registrations.
    mutexName:="Local\\BastiyanDoctorQuick-"+assistantKey(c)
    p:=utf16ptr(mutexName)
    mutex,_,err:=createMutexProc.Call(0,0,uintptr(unsafe.Pointer(p)))
    if mutex==0{return}
    defer closeHandleProc.Call(mutex)
    if eno,ok:=err.(syscall.Errno);ok&&eno==183{return} // ERROR_ALREADY_EXISTS

    // Both simple alternatives toggle the SAME panel. Neither hotkey calls a patient.
    single,_,_:=registerHotKeyProc.Call(0,901,modNoRepeat,keyF8)
    dual,_,_:=registerHotKeyProc.Call(0,902,modNoRepeat|modCtrl,keyF8)
    if single!=0 {defer unregisterHotKeyProc.Call(0,901)}
    if dual!=0 {defer unregisterHotKeyProc.Call(0,902)}
    if single==0&&dual==0 {
        message("میانبر باستیان","کلیدهای F8 و Ctrl+F8 توسط برنامه دیگری رزرو شده‌اند. دستیار نمی‌تواند میانبر سراسری ثبت کند.",MB_OK|MB_ICONERROR)
        return
    }
    if single==0||dual==0 {
        available:="F8";if single==0 {available="Ctrl+F8"}
        message("میانبر باستیان","یکی از میانبرها قبلاً توسط برنامه دیگری استفاده شده است. میانبر فعال: "+available,MB_OK|MB_ICONINFORMATION)
    }
    marker:="BastiyanDoctorQuick-"+assistantKey(c)
    hidden:=true
    // GetMessageW is a Windows message loop on the SAME OS thread as RegisterHotKey.
    for {
        var msg nativeMsg
        r,_,_:=getMessageProc.Call(uintptr(unsafe.Pointer(&msg)),0,0,0)
        if int32(r)<=0 {return}
        if msg.Message==wmHotkey && (msg.Wparam==901||msg.Wparam==902) {
            toggleAssistant(c,marker,&hidden)
        }
    }
}
