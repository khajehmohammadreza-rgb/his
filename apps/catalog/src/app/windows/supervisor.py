"""Watchdog and entrypoint for both source and self-contained PyInstaller Windows builds."""
import os,sys,subprocess,time,threading,sqlite3,shutil,socket,webbrowser
from pathlib import Path
from connection_agent import start
HERE=Path(sys._MEIPASS) if getattr(sys,'frozen',False) else Path(__file__).resolve().parent.parent
sys.path.insert(0,str(HERE))
import server as server_app
ROOT=Path(os.environ.get('LOCALAPPDATA') or (Path.home()/'.bastiyan'))/'Bastiyan Catalog'
DATA=ROOT/'data';DATA.mkdir(parents=True,exist_ok=True)
LOG=ROOT/'server.log'

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

def main():
    import_legacy_data()
    # A startup failure (damaged DB / TLS) must not trigger an unsafe reset.
    check=subprocess.run(python_cmd('--https','--data',str(DATA),'--self-check'),
                         capture_output=True,text=True,timeout=35)
    if check.returncode:
        print('Startup check failed; database untouched:',check.stderr,flush=True)
        raise SystemExit(1)
    threading.Thread(target=guard_server,daemon=True).start()
    start()

if __name__=='__main__':
    if getattr(sys,'frozen',False) and '--bastiyan-server' in sys.argv:
        sys.argv=[sys.argv[0],'--https','--data',str(DATA)]
        server_app.main()
    elif getattr(sys,'frozen',False) and '--bastiyan-self-check' in sys.argv:
        sys.argv=[sys.argv[0],'--https','--data',str(DATA),'--self-check']
        server_app.main()
    else:main()
