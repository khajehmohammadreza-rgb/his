"""Watchdog and entrypoint for both source and self-contained PyInstaller Windows builds."""
import os,sys,subprocess,time,threading,sqlite3,shutil,socket,webbrowser,json,ssl,urllib.request,ctypes,traceback
from pathlib import Path
from connection_agent import start
HERE=Path(sys._MEIPASS) if getattr(sys,'frozen',False) else Path(__file__).resolve().parent.parent
sys.path.insert(0,str(HERE))
import server as server_app
ROOT=Path(os.environ.get('LOCALAPPDATA') or (Path.home()/'.bastiyan'))/'Bastiyan Catalog'
DATA=ROOT/'data';DATA.mkdir(parents=True,exist_ok=True)
LOG=ROOT/'server.log'
if sys.stdout is not None and hasattr(sys.stdout,'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8',errors='replace')
if sys.stderr is not None and hasattr(sys.stderr,'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8',errors='replace')

def local_status():
    """Verify actual live HTTPS service, not merely a successful self-check."""
    ca=DATA/'bastiyan-local-CA.crt'
    if not ca.is_file():
        return None
    try:
        ctx=ssl.create_default_context(cafile=str(ca))
        with urllib.request.urlopen('https://127.0.0.1:8765/api/status',timeout=1.5,context=ctx) as response:
            result=json.loads(response.read(4096))
        if result.get('ok') and result.get('https') and result.get('database')=='ready' and result.get('version')==server_app.VERSION:
            return result
    except (OSError,ValueError,ssl.SSLError):
        pass
    return None

def explain_failure(reason):
    try:
        tail=LOG.read_text(encoding='utf-8',errors='replace')[-5000:] if LOG.is_file() else ''
    except OSError:
        tail=''
    text=reason+'\n\nLog: '+str(LOG)+'\n'+tail[-1200:]
    print(text,flush=True)
    try:
        ctypes.windll.user32.MessageBoxW(None,text,'Bastiyan Catalog - Server Startup Failed',0x10)
    except (AttributeError,OSError):
        pass

def local_proxy_already_running():
    try:
        with urllib.request.urlopen('http://127.0.0.1:8775/__agent/status',timeout=1.5) as response:
            return isinstance(json.load(response),dict)
    except (OSError,ValueError):
        return False


def import_legacy_data():
    # Never discard an existing server-side v2 catalog when switching launchers.
    target=DATA/'catalog.sqlite3'
    legacy=HERE/'data'
    old=legacy/'catalog.sqlite3'
    if target.exists() or not old.exists():return
    with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as probe:
        probe.settimeout(.5)
        if probe.connect_ex(('127.0.0.1',8765))==0:
            raise RuntimeError('Stop the previous server before safely importing its SQLite data')
    DATA.mkdir(exist_ok=True,parents=True)
    temp=DATA/'catalog.sqlite3.migrating'
    try:
        with sqlite3.connect(f'file:{old.as_posix()}?mode=ro',uri=True) as source,sqlite3.connect(temp) as dest:
            source.backup(dest)
            if dest.execute('PRAGMA quick_check').fetchone()[0]!='ok':
                raise RuntimeError('Source catalog failed integrity check')
        temp.replace(target)
        for name in ('bastiyan-local-CA.crt','bastiyan-local-CA-private.key','bastiyan-server.crt','bastiyan-server.key','server-identity.txt'):
            if (legacy/name).is_file() and not (DATA/name).exists():shutil.copy2(legacy/name,DATA/name)
        print('Legacy v2 data copied using SQLite online-backup API; original remains intact.',flush=True)
    finally:
        if temp.exists():temp.unlink()


def python_cmd(*args):
    if getattr(sys,'frozen',False):
        if '--self-check' in args:return [sys.executable,'--bastiyan-self-check']
        return [sys.executable,'--bastiyan-server']
    return [sys.executable,str(HERE/'server.py'),*args]

def launch_server():
    args=python_cmd('--https','--data',str(DATA))
    if LOG.exists() and LOG.stat().st_size>5_000_000:LOG.replace(ROOT/'server-previous.log')
    with LOG.open('ab',buffering=0) as log:
        return subprocess.Popen(args,stdout=log,stderr=subprocess.STDOUT,cwd=str(HERE))

def guard_server():
    retry=1
    while True:
        child=launch_server();started=time.monotonic();current=set(server_app.local_ips())
        while child.poll() is None:
            time.sleep(10)
            new=set(server_app.local_ips())
            if new!=current:
                print('LAN IP changed; restarting server to refresh TLS IP certificate.',flush=True)
                child.terminate()
                try:child.wait(timeout=6)
                except subprocess.TimeoutExpired:child.kill();child.wait()
                break
        if time.monotonic()-started>60:retry=1
        print('Server exited; retry in',retry,'seconds; see',LOG,flush=True)
        time.sleep(retry);retry=min(retry*2,30)

def serve_in_process():
    """No second persistent frozen EXE: closing the server launcher releases port 8765."""
    delay=1
    while True:
        try:
            server_app.main(['--https','--data',str(DATA)])
            msg='HTTPS service returned unexpectedly.'
        except BaseException:
            msg=traceback.format_exc()
        try:
            with LOG.open('a',encoding='utf-8',errors='replace') as log:
                log.write(msg+'\n')
        except OSError:
            pass
        print('HTTPS server stopped; retry in',delay,'seconds.',flush=True)
        time.sleep(delay)
        delay=min(delay*2,30)

def main():
    try:
        import_legacy_data()
        if not local_status():
            # Do not hide the real server error behind the generic client searching page.
            with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as sock:
                sock.settimeout(.5)
                if sock.connect_ex(('127.0.0.1',8765))==0:
                    explain_failure('Port 8765 is occupied by another process or by a server with a different certificate. Existing data was not modified.')
                    raise SystemExit(2)
            check=subprocess.run(python_cmd('--https','--data',str(DATA),'--self-check'),
                                 capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=45)
            if check.returncode:
                explain_failure('Preflight failed: '+(check.stderr or check.stdout or 'unknown error')[-1000:])
                raise SystemExit(1)
            threading.Thread(target=serve_in_process,daemon=True).start()
            for _ in range(60):
                if local_status():
                    break
                time.sleep(.5)
            else:
                explain_failure('The HTTPS server did not start within 30 seconds. It is not safe to continue with a searching screen.')
                raise SystemExit(1)
        print('Bastiyan Catalog SERVER READY: https://127.0.0.1:8765  |  data: '+str(DATA),flush=True)
        if local_proxy_already_running():
            webbrowser.open('http://127.0.0.1:8775/')
            while True:
                time.sleep(10)
        # The local client will discover this already-verified server directly without UDP.
        start(open_browser='--no-browser' not in sys.argv)
    except KeyboardInterrupt:
        return

if __name__=='__main__':
    if getattr(sys,'frozen',False) and '--bastiyan-server' in sys.argv:
        sys.argv=[sys.argv[0],'--https','--data',str(DATA)]
        server_app.main()
    elif getattr(sys,'frozen',False) and '--bastiyan-self-check' in sys.argv:
        sys.argv=[sys.argv[0],'--https','--data',str(DATA),'--self-check']
        server_app.main()
    else:main()
