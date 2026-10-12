"""Real TLS+UDP+HTTP reverse-proxy integration tests with isolated temp database."""
import contextlib,hashlib,http.cookiejar,json,os,socket,ssl,subprocess,sys,tempfile,threading,time,unittest,urllib.error,urllib.request
from pathlib import Path

APP=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(APP/'windows'))
BASE_CTX=ssl._create_unverified_context()

class OneClickIntegration(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
    cls.tmp=tempfile.TemporaryDirectory(prefix='bastiyan-v21-')
    os.environ['LOCALAPPDATA']=cls.tmp.name
    import importlib
    cls.agent=importlib.import_module('connection_agent')
    cls.data=Path(cls.tmp.name)/'database'
    cls.start_server()
    deadline=time.time()+12
    while time.time()<deadline:
        try:
            with urllib.request.urlopen('https://127.0.0.1:8765/api/status',context=BASE_CTX,timeout=.7) as r:
                if json.loads(r.read())['ok']:break
        except (OSError,ValueError):time.sleep(.15)
    else:
        cls.server.terminate()
        try:_,err=cls.server.communicate(timeout=4)
        except subprocess.TimeoutExpired:
            cls.server.kill();_,err=cls.server.communicate(timeout=4)
        raise RuntimeError('Unable to start server for real TLS integration test; exit='+str(cls.server.returncode)+' stderr='+(err or b'').decode('utf-8',errors='replace')[-3000:])

 @classmethod
 def start_server(cls):
    cls.server=subprocess.Popen([sys.executable,str(APP/'server.py'),'--https','--data',str(cls.data)],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)

 @classmethod
 def tearDownClass(cls):
    cls.server.terminate()
    try:cls.server.wait(timeout=5)
    except subprocess.TimeoutExpired:cls.server.kill();cls.server.wait()
    cls.tmp.cleanup()

 def test_01_tls_discovery_pin_and_health(self):
    a=self.agent
    hits=a.discover(timeout=2)
    self.assertTrue(hits, 'UDP discovery returned no LAN server')
    self.assertTrue(a.LINK.connect(),'Client cannot verify/pin HTTPS discovered server')
    self.assertTrue(a.CONFIG.exists())
    self.assertEqual(hashlib.sha256(a.CA.read_bytes()).hexdigest(),json.loads(a.CONFIG.read_text())['ca_sha256'])
    with a.LINK.lock:self.assertIsNotNone(a.LINK.ctx)

 def test_02_proxy_login_auth_and_origin(self):
    a=self.agent;a.LINK.connect()
    from http.server import ThreadingHTTPServer
    httpd=ThreadingHTTPServer(('127.0.0.1',a.LOCAL_PORT),a.Proxy)
    th=threading.Thread(target=httpd.serve_forever,daemon=True);th.start()
    try:
        cookies=http.cookiejar.CookieJar()
        opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))
        with opener.open('http://127.0.0.1:8775/') as r:
            self.assertIn('Bastiyan',r.read().decode('utf-8'))
        secret=(self.data/'FIRST_RUN_PASSWORD.txt').read_text(encoding='utf-8').splitlines()[-1]
        form=json.dumps({'username':'admin','password':secret}).encode()
        req=urllib.request.Request('http://127.0.0.1:8775/api/login',data=form,headers={'Content-Type':'application/json'},method='POST')
        with opener.open(req) as r:self.assertTrue(json.load(r)['ok'])
        with opener.open('http://127.0.0.1:8775/api/me') as r:self.assertEqual(json.load(r)['user']['username'],'admin')
        bad=urllib.request.Request('http://127.0.0.1:8775/api/logout',data=b'{}',headers={'Origin':'https://evil.example','Content-Type':'application/json'},method='POST')
        with self.assertRaises(urllib.error.HTTPError) as e:opener.open(bad)
        self.assertEqual(e.exception.code,403)
    finally:httpd.shutdown();httpd.server_close();th.join(timeout=3)

 def test_03_server_restart_keeps_ca_identity(self):
    a=self.agent;self.assertTrue(a.LINK.connect())
    pem=a.CA.read_bytes();ident=json.loads(a.CONFIG.read_text())['server_id']
    self.server.terminate();self.server.wait(timeout=5)
    self.assertFalse(a.LINK.check('127.0.0.1',a.LINK.ctx,ident))
    self.start_server()
    deadline=time.time()+12
    while time.time()<deadline:
        if a.LINK.connect():break
        time.sleep(.25)
    else:self.fail('Failed to reconnect automatically after real server restart')
    self.assertEqual(a.CA.read_bytes(),pem)
    self.assertEqual(json.loads(a.CONFIG.read_text())['server_id'],ident)
    with urllib.request.urlopen('https://127.0.0.1:8765/api/ca-cert',context=BASE_CTX) as r:
        self.assertEqual(r.read(),pem)


 def test_04_server_local_identity_repairs_outdated_saved_center(self):
    """An old local client's saved trust cannot trap the server PC on Searching."""
    a=self.agent
    genuine_id=(self.data/'server-identity.txt').read_text(encoding='ascii').strip()
    genuine_ca=(self.data/'bastiyan-local-CA.crt').read_bytes()
    target=a.LOCAL_DATA
    target.mkdir(parents=True,exist_ok=True)
    (target/'server-identity.txt').write_text(genuine_id,encoding='ascii')
    (target/'bastiyan-local-CA.crt').write_bytes(genuine_ca)
    bad={'server_id':'00000000-0000-4000-8000-000000000000','ca_sha256':hashlib.sha256(genuine_ca).hexdigest(),'host':'192.168.9.199'}
    a.CONFIG.write_text(json.dumps(bad),encoding='utf-8')
    a.CA.write_bytes(genuine_ca)
    with a.LINK.lock:
        a.LINK.host=None
        a.LINK.config=bad
        a.LINK.ctx=ssl.create_default_context(cadata=genuine_ca.decode('ascii'))
    try:
        self.assertTrue(a.LINK.connect(), 'Stale saved config must recover from authentic same-PC local identity')
        saved=json.loads(a.CONFIG.read_text(encoding='utf-8'))
        self.assertEqual(saved['server_id'],genuine_id)
        self.assertEqual(saved['host'],'127.0.0.1')
        self.assertEqual(saved['ca_sha256'],hashlib.sha256(genuine_ca).hexdigest())
        self.assertEqual(a.LINK.last_mode,'same-machine')
    finally:
        (target/'server-identity.txt').unlink(missing_ok=True)
        (target/'bastiyan-local-CA.crt').unlink(missing_ok=True)

 def test_05_invalid_untrusted_local_identity_is_not_auto_accepted(self):
    a=self.agent
    target=a.LOCAL_DATA
    target.mkdir(parents=True,exist_ok=True)
    (target/'server-identity.txt').write_text('00000000-0000-4000-8000-000000000000',encoding='ascii')
    (target/'bastiyan-local-CA.crt').write_bytes((self.data/'bastiyan-local-CA.crt').read_bytes())
    try:
        self.assertFalse(a.LINK._local_trusted_center(), 'Unexpected identity must not be auto-pinned')
    finally:
        (target/'server-identity.txt').unlink(missing_ok=True)
        (target/'bastiyan-local-CA.crt').unlink(missing_ok=True)

if __name__=='__main__':unittest.main()
