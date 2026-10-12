"""One-click Windows localhost HTTPS-to-LAN bridge, Python stdlib only.

The app UI is bound to 127.0.0.1 (browser secure context); upstream is TLS
verified against a pinned per-center local CA. First use is trust-on-first-use
on a *private* LAN; never use on untrusted Wi-Fi at initial pairing.
"""
from __future__ import annotations
import hashlib, http.client, ipaddress, json, os, socket, ssl, threading, time, urllib.request, urllib.error, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

MAGIC=b'BASTIYAN_CATALOG_DISCOVER_V2'
ROOT=Path(os.environ.get('LOCALAPPDATA') or (Path.home()/'.bastiyan'))/'Bastiyan Catalog'
ROOT.mkdir(parents=True,exist_ok=True)
CONFIG=ROOT/'trusted-center.json'
CA=ROOT/'trusted-center-ca.crt'
PORT=8765
LOCAL_PORT=8775


def is_lan(addr):
    try:
        ip=ipaddress.ip_address(addr)
        return ip.version==4 and (ip.is_private or ip.is_loopback)
    except ValueError:return False


def discover(timeout=1.6):
    found=[]
    with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET,socket.SO_BROADCAST,1)
        sock.settimeout(0.35)
        targets=['127.0.0.1','255.255.255.255']
        for target in targets:
            try:sock.sendto(MAGIC,(target,PORT+1))
            except OSError:pass
        until=time.monotonic()+timeout
        while time.monotonic()<until:
            try:raw,addr=sock.recvfrom(2048)
            except socket.timeout:continue
            try:obj=json.loads(raw)
            except (ValueError,UnicodeError):continue
            if (obj.get('service')=='bastiyan-catalog' and obj.get('https') is True
                and is_lan(addr[0]) and isinstance(obj.get('server_id'),str)
                and isinstance(obj.get('ca_sha256'),str) and len(obj['ca_sha256'])==64):
                found.append((addr[0],obj))
    return found


def fetch_ca_first_use(host):
    # Only public CA data is requested without certificate verification during initial TOFU.
    context=ssl._create_unverified_context()
    with urllib.request.urlopen('https://'+host+':8765/api/ca-cert', timeout=3,context=context) as r:
        raw=r.read(16384)
    if not (raw.startswith(b'-----BEGIN CERTIFICATE-----') and b'-----END CERTIFICATE-----' in raw):
        raise RuntimeError('Invalid public CA certificate')
    return raw


class Link:
    def __init__(self):
        self.lock=threading.RLock();self.host=None;self.config=None;self.ctx=None
        try:
            if CONFIG.exists() and CA.exists():
                c=json.loads(CONFIG.read_text(encoding='utf-8'))
                if hashlib.sha256(CA.read_bytes()).hexdigest()==c.get('ca_sha256'):
                    self.config=c;self.ctx=ssl.create_default_context(cafile=str(CA))
        except (OSError,ValueError,ssl.SSLError):pass
        self.last_ping=0;self.error='در حال جست‌وجوی سرور مرکز…';self.stop=threading.Event()

    def check(self,host,ctx,instance):
        if not is_lan(host):return False
        try:
            with urllib.request.urlopen('https://'+host+':8765/api/status',timeout=2.5,context=ctx) as r:
                x=json.loads(r.read(4096))
            return (x.get('ok') is True and x.get('https') is True and
                    x.get('server_id')==instance and x.get('database')=='ready')
        except (OSError,ValueError,ssl.SSLError):return False

    def connect(self):
        with self.lock:cached=dict(self.config or {});old_host=self.host;old_ctx=self.ctx
        if old_host and old_ctx and self.check(old_host,old_ctx,cached.get('server_id')):
            with self.lock:self.last_ping=time.monotonic();self.error='';return True
        if cached.get('host') and old_ctx and self.check(cached['host'],old_ctx,cached.get('server_id')):
            with self.lock:self.host=cached['host'];self.last_ping=time.monotonic();self.error='';return True
        for host,beacon in discover(timeout=1.0):
            if cached and (beacon['server_id']!=cached.get('server_id') or beacon['ca_sha256']!=cached.get('ca_sha256')):
                continue
            try:
                if cached:
                    ctx=old_ctx;root=None
                else:
                    root=fetch_ca_first_use(host)
                    if hashlib.sha256(root).hexdigest()!=beacon['ca_sha256']:continue
                    ctx=ssl.create_default_context(cadata=root.decode('ascii'))
                if not self.check(host,ctx,beacon['server_id']):continue
                if not cached:
                    # Keep trust anchor for reconnect after address/certificate rotation.
                    CA.write_bytes(root)
                    config={'server_id':beacon['server_id'],'ca_sha256':beacon['ca_sha256'],'host':host}
                    CONFIG.write_text(json.dumps(config),encoding='utf-8')
                    try:os.chmod(CONFIG,0o600);os.chmod(CA,0o600)
                    except OSError:pass
                else:
                    config={**cached,'host':host};CONFIG.write_text(json.dumps(config),encoding='utf-8')
                with self.lock:
                    self.host=host;self.ctx=ctx;self.config=config;self.last_ping=time.monotonic();self.error=''
                return True
            except (OSError,ValueError,ssl.SSLError):continue
        with self.lock:self.host=None;self.error='سرور پیدا نشد؛ برنامه خودکار دوباره تلاش می‌کند.'
        return False

    def keepalive(self):
        while not self.stop.is_set():
            self.connect()
            self.stop.wait(3.0)

LINK=Link()

OFFLINE='''<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>اتصال باستیان</title><style>body{background:#edf3fb;font-family:Tahoma,sans-serif;color:#193752;display:grid;place-items:center;min-height:90vh}.panel{padding:35px;max-width:540px;background:white;border-radius:24px;text-align:center;box-shadow:0 15px 40px #17314d19}h1{font-size:26px}small{color:#557}.dot{height:13px;width:13px;background:#ed9d28;border-radius:50%;display:inline-block;animation:a 1s infinite alternate}@keyframes a{to{opacity:.25}}</style><div class="panel"><h1>گردآورنده باستیان</h1><p><span class="dot"></span> در حال جست‌وجو و اتصال خودکار به سرور مرکز</p><p>برنامه فعال است؛ نیازی به واردکردن IP یا اجرای مجدد نیست.</p><small id="err"></small></div><script>setInterval(async()=>{try{const r=await fetch('/__agent/status',{cache:'no-store'});const d=await r.json();if(d.connected)location.replace('/');else document.getElementById('err').textContent=d.message||''}catch{}},2500)</script></html>'''.encode('utf-8')

class Proxy(BaseHTTPRequestHandler):
    protocol_version='HTTP/1.1'
    def log_message(self,*args):pass
    def reply(self,code,payload,mime='text/html; charset=utf-8'):
        self.send_response(code);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(payload)))
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.end_headers()
        self.wfile.write(payload)
    def handle_request(self):
        origin=self.headers.get('Origin','')
        host=self.headers.get('Host','')
        # Browser-local API only: reject cross-origin POST/CSRF against the loopback bridge.
        if host.split(':')[0] not in ('127.0.0.1','localhost') or (origin and origin not in (f'http://127.0.0.1:{LOCAL_PORT}',f'http://localhost:{LOCAL_PORT}')):
            return self.reply(403,b'Forbidden')
        if self.path=='/__agent/status':
            with LINK.lock:
                info={'connected':bool(LINK.host),'host':LINK.host or '', 'message':LINK.error}
            return self.reply(200,json.dumps(info).encode(),'application/json; charset=utf-8')
        if self.path=='/favicon.ico':return self.reply(404,b'')
        with LINK.lock:host=LINK.host;ctx=LINK.ctx
        if not host or not ctx:return self.reply(503,OFFLINE)
        try:
            url=f'https://{host}:{PORT}{self.path}'
            length=int(self.headers.get('Content-Length','0'))
            if length<0 or length>2_000_000:return self.reply(413,b'Too large')
            body=self.rfile.read(length) if length else None
            headers={}
            for k in ('Content-Type','Cookie','Accept','Accept-Language','Range'):
                if self.headers.get(k):headers[k]=self.headers[k]
            if self.command=='POST':headers['Origin']=f'https://{host}:{PORT}'
            req=urllib.request.Request(url,data=body,headers=headers,method=self.command)
            try:r=urllib.request.urlopen(req,timeout=12,context=ctx)
            except urllib.error.HTTPError as e:r=e
            with r:
                data=r.read(10_000_000+1)
                if len(data)>10_000_000:raise ValueError('Response too large')
                self.send_response(r.status)
                for header in ('Content-Type','Content-Disposition','Content-Security-Policy','X-Content-Type-Options','X-Frame-Options','Referrer-Policy'):
                    if r.headers.get(header):self.send_header(header,r.headers[header])
                for cookie in r.headers.get_all('Set-Cookie',[]):
                    # Cookies on HTTP loopback cannot reliably use the HTTPS-only Secure flag.
                    self.send_header('Set-Cookie',cookie.replace('; Secure','').replace('; secure',''))
                self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        except (OSError,ValueError,ssl.SSLError):
            with LINK.lock:LINK.host=None;LINK.error='ارتباط قطع شد؛ در حال تلاش مجدد…'
            return self.reply(503,OFFLINE)
    def do_GET(self):self.handle_request()
    def do_POST(self):self.handle_request()


def start(open_browser=True):
    threading.Thread(target=LINK.keepalive,daemon=True).start()
    httpd=ThreadingHTTPServer(('127.0.0.1',LOCAL_PORT),Proxy);httpd.daemon_threads=True
    if open_browser:webbrowser.open(f'http://127.0.0.1:{LOCAL_PORT}/')
    print(f'Windows client ready: http://127.0.0.1:{LOCAL_PORT}/',flush=True)
    try:httpd.serve_forever(poll_interval=.2)
    finally:LINK.stop.set();httpd.server_close()

if __name__=='__main__':
    start(open_browser='--no-browser' not in __import__('sys').argv)
