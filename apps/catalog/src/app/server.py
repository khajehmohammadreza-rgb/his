#!/usr/bin/env python3
"""Bastiyan Collector v2: stdlib Python, LAN SQLite server. No external DB."""
from __future__ import annotations
import argparse, contextlib, csv, hashlib, hmac, io, ipaddress, json, mimetypes, os, secrets, shutil, socket, sqlite3, ssl, sys, threading, time, traceback, urllib.parse, zipfile, uuid
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# Windows default consoles often use cp1252 and cannot encode Persian messages.
for _out in (sys.stdout,sys.stderr):
    if _out is not None and hasattr(_out,'reconfigure'):
        _out.reconfigure(encoding='utf-8',errors='replace')

BASE = Path(__file__).resolve().parent
WEB = BASE / 'web'
PORT = 8765
DB_LOCK = threading.RLock()
LOGIN_ATTEMPTS = {}
DISCOVERY_MAGIC = b'BASTIYAN_CATALOG_DISCOVER_V2'
VERSION = '2.5.0'

def now(): return datetime.now(timezone.utc).isoformat(timespec='seconds')
def local_ips():
    found=set()
    try:
        for item in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip=item[4][0]
            if not ip.startswith('127.') and not ip.startswith('169.254.') : found.add(ip)
    except OSError: pass
    try:
        s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
        s.connect(('1.1.1.1',80))
        ip=s.getsockname()[0]
        if not ip.startswith('127.'):found.add(ip)
        s.close()
    except OSError:pass
    return sorted(found)

def normalize(s):
    d=dict(zip('۰۱۲۳۴۵۶۷۸۹','0123456789'))
    d.update(dict(zip('٠١٢٣٤٥٦٧٨٩','0123456789')))
    return ''.join(d.get(c,c) for c in str(s or '')).strip()

def code_norm(v):
    s=normalize(v)
    if not s.isascii() or not s.isdecimal() or int(s)<=0 or len(s)>12:
        raise ValueError('کد مرکز باید عددی مثبت و حداکثر ۱۲ رقم باشد.')
    return str(int(s))

def barcode_norm(s):
    value=normalize(s).replace(' ','').replace('\t','')
    if not value or len(value)>120 or any(ord(c)<32 for c in value):
        raise ValueError('بارکد معتبر وارد کنید (حداکثر ۱۲۰ نویسه).')
    return value

class SafeConnection(sqlite3.Connection):
    def __exit__(self,exc_type,exc_val,exc_tb):
        try:return super().__exit__(exc_type,exc_val,exc_tb)
        finally:self.close()

def db_connect(path):
    con=sqlite3.connect(path,timeout=20,isolation_level=None,check_same_thread=False,factory=SafeConnection)
    con.row_factory=sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    con.execute('PRAGMA busy_timeout=20000')
    con.execute('PRAGMA journal_mode=WAL')
    return con

def init_db(path):
    with DB_LOCK, db_connect(path) as con:
        con.executescript('''
        CREATE TABLE IF NOT EXISTS products(
          id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
          category TEXT DEFAULT '', unit TEXT DEFAULT 'عدد', min_stock REAL DEFAULT 0,
          notes TEXT DEFAULT '', active INTEGER DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS variants(
          id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
          name TEXT NOT NULL, brand TEXT DEFAULT '', company TEXT DEFAULT '', specification TEXT DEFAULT '',
          package_count REAL NOT NULL DEFAULT 1 CHECK(package_count>0),
          purchase_price REAL NOT NULL DEFAULT 0, sale_price REAL NOT NULL DEFAULT 0,
          notes TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS barcodes(
          id INTEGER PRIMARY KEY, variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE RESTRICT,
          code TEXT NOT NULL UNIQUE, kind TEXT NOT NULL CHECK(kind IN ('factory','internal')),
          created_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS ix_prod_name ON products(name);
        CREATE INDEX IF NOT EXISTS ix_var_prod ON variants(product_id);
        CREATE INDEX IF NOT EXISTS ix_bar_variant ON barcodes(variant_id);
        CREATE TABLE IF NOT EXISTS warehouses(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, location TEXT DEFAULT '');
        CREATE TABLE IF NOT EXISTS suppliers(id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT DEFAULT '', address TEXT DEFAULT '', notes TEXT DEFAULT '');
        CREATE TABLE IF NOT EXISTS services(id INTEGER PRIMARY KEY, code TEXT UNIQUE, title TEXT NOT NULL, category TEXT DEFAULT '', national_code TEXT DEFAULT '', tariff_price REAL DEFAULT 0, notes TEXT DEFAULT '');
        CREATE TABLE IF NOT EXISTS lots(
          id INTEGER PRIMARY KEY, variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE RESTRICT,
          warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
          qty REAL NOT NULL DEFAULT 0 CHECK(qty>=0), batch TEXT DEFAULT '', expiry TEXT DEFAULT '', shelf TEXT DEFAULT '',
          supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL, updated_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS ix_lots_variant ON lots(variant_id);
        CREATE TABLE IF NOT EXISTS stock_moves(
          id INTEGER PRIMARY KEY, lot_id INTEGER NOT NULL REFERENCES lots(id), variant_id INTEGER NOT NULL REFERENCES variants(id),
          kind TEXT NOT NULL, delta REAL NOT NULL, before_qty REAL NOT NULL, after_qty REAL NOT NULL,
          reference TEXT DEFAULT '', actor TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, pw_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','operator')), created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(id_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
        ''')
        con.execute("INSERT OR IGNORE INTO warehouses(id,name,location) VALUES(1,'انبار اصلی','')")
        count=con.execute('SELECT COUNT(*) FROM users').fetchone()[0]
        if count==0:
            password=secrets.token_urlsafe(12)
            con.execute('INSERT INTO users(username,pw_hash,role,created_at) VALUES(?,?,?,?)',('admin',pass_hash(password),'admin',now()))
            print('\n'+'='*65+'\n  ورود اولیه - نام کاربری: admin\n  رمز یک‌بار نمایش‌داده‌شده: '+password+'\n  پس از ورود، از بخش تنظیمات رمز را تغییر دهید.\n'+'='*65+'\n',flush=True)
            # On a Windows double-click launch the console may be missed. First run secret stays on server only.
            f=path.parent/'FIRST_RUN_PASSWORD.txt'
            try:
                fd=os.open(str(f),os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
                with os.fdopen(fd,'w',encoding='utf-8') as o:o.write('فقط نزد مدیر مرکز نگهداری شود؛ پس از ورود و تغییر رمز حذف کنید.\nadmin\n'+password+'\n')
            except FileExistsError: pass

def pass_hash(value):
    salt=secrets.token_bytes(16)
    d=hashlib.pbkdf2_hmac('sha256',str(value).encode(),salt,260000)
    return f'{salt.hex()}:{d.hex()}'

def check_pw(value,stored):
    try:
        salt,expected=stored.split(':',1)
        result=hashlib.pbkdf2_hmac('sha256',str(value).encode(),bytes.fromhex(salt),260000)
        return hmac.compare_digest(result,bytes.fromhex(expected))
    except Exception:return False

def row_dict(row):return dict(row) if row is not None else None

def product_detail(con,pid):
    p=row_dict(con.execute('SELECT * FROM products WHERE id=?',(pid,)).fetchone())
    if not p:return None
    variants=[dict(x) for x in con.execute('SELECT * FROM variants WHERE product_id=? ORDER BY id',(pid,)).fetchall()]
    for v in variants:
        v['barcodes']=[dict(x) for x in con.execute('SELECT id,code,kind FROM barcodes WHERE variant_id=? ORDER BY kind,id',(v['id'],))]
        v['stock']=con.execute('SELECT COALESCE(SUM(qty),0) FROM lots WHERE variant_id=?',(v['id'],)).fetchone()[0]
    p['variants']=variants
    # Different commercial packs may contain 1, 7 or 10 base units. Do not
    # describe the sum of packages as a meaningful total inventory quantity.
    p['stock']=sum(v['stock'] for v in variants)  # backward-compatible field
    p['stock_base_units']=sum(v['stock']*v['package_count'] for v in variants)
    return p

def ensure_unique_barcode(con,barcode,variant_id=None):
    row=con.execute('SELECT variant_id FROM barcodes WHERE code=?',(barcode,)).fetchone()
    if row and row[0]!=variant_id:raise ValueError('این بارکد قبلاً به نوع/شرکت دیگری اختصاص یافته است.')

def add_variant(con,pid,data):
    name=str(data.get('name') or '').strip()
    if not name:raise ValueError('نام تجاری/نام نوع کالا الزامی است.')
    pc=float(data.get('package_count') or 1)
    if not 0<pc<100000000:raise ValueError('تعداد داخل بسته باید مثبت باشد.')
    t=now()
    c=con.execute('''INSERT INTO variants(product_id,name,brand,company,specification,package_count,purchase_price,sale_price,notes,created_at,updated_at)
                     VALUES(?,?,?,?,?,?,?,?,?,?,?)''',(pid,name,str(data.get('brand') or '').strip(),str(data.get('company') or '').strip(),str(data.get('specification') or '').strip(),pc,
                     nonneg(data.get('purchase_price')),nonneg(data.get('sale_price')),str(data.get('notes') or '').strip(),t,t))
    vid=c.lastrowid
    root_code=con.execute('SELECT code FROM products WHERE id=?',(pid,)).fetchone()[0]
    internal='BHS-'+root_code+'-'+str(vid).zfill(6)
    con.execute("INSERT INTO barcodes(variant_id,code,kind,created_at) VALUES(?,?,'internal',?)",(vid,internal,t))
    for raw in data.get('barcodes',[]):
        code=barcode_norm(raw.get('code') if isinstance(raw,dict) else raw)
        if code==internal:continue
        ensure_unique_barcode(con,code,vid)
        con.execute("INSERT OR IGNORE INTO barcodes(variant_id,code,kind,created_at) VALUES(?,?,'factory',?)",(vid,code,t))
    return vid

def nonneg(value):
    n=float(value or 0)
    if not 0<=n<1e14:raise ValueError('مقدار باید عدد نامنفی و معتبر باشد.')
    return n

def write_audit(con,actor,action,data):
    con.execute('INSERT INTO audit_log(actor,action,detail,created_at) VALUES(?,?,?,?)',(actor,action,json.dumps(data,ensure_ascii=False)[:5000],now()))

def next_code(con):
    return str(max((int(x[0]) for x in con.execute('SELECT code FROM products') if str(x[0]).isdigit()),default=0)+1)

def search(con,q,limit=100):
    q=normalize(q).lower()[:100]
    if not q:
        rows=con.execute('SELECT id FROM products ORDER BY CAST(code AS INTEGER) DESC LIMIT ?',(limit,)).fetchall()
    else:
        pat='%'+q.replace('\\','\\\\').replace('%','\\%').replace('_','\\_')+'%'
        rows=con.execute('''SELECT DISTINCT p.id FROM products p LEFT JOIN variants v ON v.product_id=p.id
          LEFT JOIN barcodes b ON b.variant_id=v.id
          WHERE p.code=? OR p.name LIKE ? ESCAPE '\\' COLLATE NOCASE OR p.category LIKE ? ESCAPE '\\' COLLATE NOCASE
          OR v.name LIKE ? ESCAPE '\\' COLLATE NOCASE OR v.brand LIKE ? ESCAPE '\\' COLLATE NOCASE
          OR v.company LIKE ? ESCAPE '\\' COLLATE NOCASE OR b.code LIKE ? ESCAPE '\\' COLLATE NOCASE
          ORDER BY CAST(p.code AS INTEGER) DESC LIMIT ?''',(q,pat,pat,pat,pat,pat,pat,limit)).fetchall()
    return [product_detail(con,r[0]) for r in rows]

def exact_lookup(con,value):
    v=normalize(value).replace(' ','')
    row=con.execute('''SELECT v.id AS variant_id,v.product_id FROM barcodes b JOIN variants v ON v.id=b.variant_id WHERE b.code=?''',(v,)).fetchone()
    if row:return {'matched':'barcode','variant_id':row['variant_id'],'product':product_detail(con,row['product_id'])}
    if v.isdigit():
        row=con.execute('SELECT id FROM products WHERE code=?',(str(int(v)),)).fetchone()
        if row:return {'matched':'root_code','variant_id':None,'product':product_detail(con,row[0])}
    return {'matched':'none','barcode':v,'product':None}

def dump_data(con):
    tables=['products','variants','barcodes','warehouses','suppliers','services','lots','stock_moves']
    return {'schema':'bastiyan-collector/2','exported_at':now(),**{table:[dict(row) for row in con.execute('SELECT * FROM '+table)] for table in tables}}

class AppHandler(BaseHTTPRequestHandler):
    server_version='BastiyanCatalog/2'
    def log_message(self,fmt,*args): print('%s %s'%(self.log_date_time_string(),fmt%args))
    def send_data(self,status=200,data=None,ctype='application/json; charset=utf-8',headers=None):
        if isinstance(data,bytes):payload=data
        elif ctype.startswith('application/json'):
            payload=json.dumps(data,ensure_ascii=False,allow_nan=False).encode('utf-8')
        else:payload=data if isinstance(data,bytes) else str(data or '').encode()
        self.send_response(status)
        self.send_header('Content-Type',ctype)
        self.send_header('Content-Length',str(len(payload)))
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('X-Frame-Options','DENY')
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; connect-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        if headers:
            for k,v in headers.items():self.send_header(k,v)
        self.end_headers()
        self.wfile.write(payload)
    def fail(self,status,message):self.send_data(status,{'ok':False,'error':message})
    def path_parts(self):return urllib.parse.urlsplit(self.path)
    def auth(self):
        cookie=SimpleCookie()
        try:cookie.load(self.headers.get('Cookie',''))
        except Exception:return None
        m=cookie.get('bh_session')
        if m is None:return None
        token=m.value
        if len(token)!=64:return None
        with db_connect(self.server.dbpath) as con:
            r=con.execute('''SELECT u.id,u.username,u.role FROM sessions s JOIN users u ON u.id=s.user_id
               WHERE s.id_hash=? AND s.expires>?''',(hashlib.sha256(token.encode()).hexdigest(),int(time.time()))).fetchone()
            return dict(r) if r else None
    def protected(self,admin=False):
        user=self.auth()
        if not user:self.fail(401,'ابتدا وارد سامانه شوید.');return None
        if admin and user['role']!='admin':self.fail(403,'این عملیات فقط مخصوص مدیر است.');return None
        return user
    def payload(self,limit=2_000_000):
        if self.headers.get('Content-Type','').split(';')[0]!='application/json':raise ValueError('درخواست باید JSON باشد.')
        length=int(self.headers.get('Content-Length','0'))
        if length<=0 or length>limit:raise ValueError('حجم درخواست نامعتبر است.')
        result=json.loads(self.rfile.read(length))
        if not isinstance(result,dict):raise ValueError('ساختار درخواست نامعتبر است.')
        return result
    def guard_origin(self):
        origin=self.headers.get('Origin')
        host=self.headers.get('Host','')
        if origin:
            o=urllib.parse.urlsplit(origin)
            if o.netloc!=host or o.scheme != ('https' if self.server.https else 'http'):
                self.fail(403,'درخواست از مبدا مجاز نیست.');return False
        elif self.headers.get('Sec-Fetch-Site','same-origin') not in ('same-origin','none'):
            self.fail(403,'درخواست غیرهم‌مبدا رد شد.');return False
        return True
    def do_GET(self):
        target=self.path_parts()
        path=target.path
        if not path.startswith('/api/'):
            if path in ('/','/index.html'):path='/index.html'
            if path not in ('/index.html','/app.js','/barcodeDecoder.js','/style.css','/favicon.ico'):
                return self.fail(404,'فایل موجود نیست.')
            file=WEB/path[1:]
            if not file.is_file():return self.fail(404,'فایل موجود نیست.')
            return self.send_data(200,file.read_bytes(),mimetypes.guess_type(str(file))[0] or 'application/octet-stream')
        if path=='/api/status':
            return self.send_data(200,{'ok':True,'version':VERSION,'server':'Bastiyan Collector',
                'server_id':self.server.instance_id,'https':self.server.https,
                'database':'ready' if self.server.db_ok else 'needs_attention'})
        if path=='/api/ca-cert':
            if not self.server.https:return self.fail(404,'HTTPS فعال نیست.')
            return self.send_data(200,(self.server.dbpath.parent/'bastiyan-local-CA.crt').read_bytes(),'application/x-pem-file')
        user=self.protected()
        if not user:return
        q=urllib.parse.parse_qs(target.query)
        with db_connect(self.server.dbpath) as con:
            if path=='/api/me':return self.send_data(200,{'ok':True,'user':user,'https':self.server.https})
            if path=='/api/overview':
                data={t:con.execute('SELECT COUNT(*) FROM '+t).fetchone()[0] for t in ('products','variants','barcodes','lots','services','suppliers','warehouses')}
                data['next_code']=next_code(con)
                return self.send_data(200,{'ok':True,'data':data})
            if path=='/api/reference':
                return self.send_data(200,{'ok':True,'warehouses':[dict(r) for r in con.execute('SELECT * FROM warehouses ORDER BY name')],
                   'suppliers':[dict(r) for r in con.execute('SELECT * FROM suppliers ORDER BY name')],
                   'services':[dict(r) for r in con.execute('SELECT * FROM services ORDER BY title')]})
            if path=='/api/search':return self.send_data(200,{'ok':True,'products':search(con,q.get('q',[''])[0],max(1,min(int(q.get('limit',['100'])[0]),200)))})
            if path=='/api/product':
                pid=int(q.get('id',['0'])[0]);product=product_detail(con,pid)
                if not product:return self.fail(404,'کالای اصلی موردنظر پیدا نشد.')
                return self.send_data(200,{'ok':True,'product':product})
            if path=='/api/lookup':return self.send_data(200,{'ok':True,**exact_lookup(con,q.get('code',[''])[0])})
            if path=='/api/lots':
                vid=int(q.get('variant_id',['0'])[0])
                rows=con.execute('''SELECT l.*,w.name warehouse_name,s.name supplier_name FROM lots l JOIN warehouses w ON l.warehouse_id=w.id LEFT JOIN suppliers s ON l.supplier_id=s.id
                    WHERE (?=0 OR variant_id=?) ORDER BY l.id DESC LIMIT 500''',(vid,vid)).fetchall()
                return self.send_data(200,{'ok':True,'lots':[dict(x) for x in rows]})
            if path=='/api/moves':
                rows=con.execute('''SELECT m.*,v.name variant_name,p.code root_code,p.name root_name,w.name warehouse_name FROM stock_moves m JOIN variants v ON v.id=m.variant_id JOIN products p ON p.id=v.product_id JOIN lots l ON l.id=m.lot_id JOIN warehouses w ON w.id=l.warehouse_id ORDER BY m.id DESC LIMIT 200''').fetchall()
                return self.send_data(200,{'ok':True,'moves':[dict(x) for x in rows]})
            if path=='/api/export':
                if user['role']!='admin':return self.fail(403,'فقط مدیر می‌تواند خروجی کامل بگیرد.')
                dataset=dump_data(con)
                blob=json.dumps(dataset,ensure_ascii=False,indent=2).encode('utf-8')
                return self.send_data(200,blob,'application/json; charset=utf-8',{'Content-Disposition':'attachment; filename="bastiyan-catalog-full.json"'})
            if path=='/api/export-csv':
                if user['role']!='admin':return self.fail(403,'فقط مدیر می‌تواند خروجی بگیرد.')
                typ=q.get('type',['roots'])[0]
                o=io.StringIO();writer=csv.writer(o)
                if typ=='roots':
                    writer.writerow(['کد کالا','بارکد','نام کالا','گروه','واحد','حداقل موجودی','قیمت خرید','قیمت فروش','محل انبار','توضیحات'])
                    for p in con.execute('SELECT * FROM products ORDER BY CAST(code AS INTEGER)'):
                        v=con.execute('SELECT * FROM variants WHERE product_id=? ORDER BY id LIMIT 1',(p['id'],)).fetchone()
                        b=con.execute("SELECT code FROM barcodes WHERE variant_id=? ORDER BY kind='internal' ASC,id LIMIT 1",(v['id'],)).fetchone() if v else None
                        writer.writerow([p['code'],b[0] if b else '',p['name'],p['category'],p['unit'],p['min_stock'],v['purchase_price'] if v else 0,v['sale_price'] if v else 0,'',p['notes']])
                elif typ=='variants':
                    writer.writerow(['کد اصلی مرکز','نام اصلی','شناسه نوع','نام روی کالا','برند','شرکت','مشخصات','تعداد داخل بسته','بارکدهای سازنده','بارکد داخلی','قیمت خرید','قیمت فروش','موجودی بسته'])
                    for v in con.execute('''SELECT v.*,p.code root_code,p.name root_name FROM variants v JOIN products p ON p.id=v.product_id ORDER BY CAST(p.code AS INTEGER),v.id'''):
                        codes=con.execute('SELECT code,kind FROM barcodes WHERE variant_id=?',(v['id'],)).fetchall()
                        qty=con.execute('SELECT COALESCE(SUM(qty),0) FROM lots WHERE variant_id=?',(v['id'],)).fetchone()[0]
                        writer.writerow([v['root_code'],v['root_name'],v['id'],v['name'],v['brand'],v['company'],v['specification'],v['package_count'],' | '.join(x['code'] for x in codes if x['kind']=='factory'),next((x['code'] for x in codes if x['kind']=='internal'),''),v['purchase_price'],v['sale_price'],qty])
                elif typ=='lots':
                    writer.writerow(['کد اصلی','نام اصلی','شناسه نوع','نام نوع','انبار','تعداد بسته','سری ساخت','تاریخ انقضا','قفسه'])
                    for x in con.execute('''SELECT p.code root_code,p.name root_name,v.id variant_id,v.name variant_name,w.name warehouse,l.qty,l.batch,l.expiry,l.shelf FROM lots l JOIN variants v ON v.id=l.variant_id JOIN products p ON p.id=v.product_id JOIN warehouses w ON w.id=l.warehouse_id'''):
                        writer.writerow(list(x))
                elif typ=='services':
                    writer.writerow(['کد خدمت','عنوان خدمت','گروه','کد ملی خدمت','تعرفه','سهم پزشک (%)','K حرفه‌ای','K فنی','K بیهوشی','توضیحات'])
                    for x in con.execute('SELECT * FROM services'):
                        writer.writerow([x['code'],x['title'],x['category'],x['national_code'],x['tariff_price'],'','','','',x['notes']])
                else:return self.fail(400,'نوع خروجی ناشناخته است.')
                return self.send_data(200,('\ufeff'+o.getvalue()).encode('utf-8'),'text/csv; charset=utf-8',{'Content-Disposition':f'attachment; filename="bastiyan-{typ}.csv"'})
            if path=='/api/users':
                if user['role']!='admin':return self.fail(403,'فقط مدیر.')
                return self.send_data(200,{'ok':True,'users':[dict(x) for x in con.execute('SELECT id,username,role,created_at FROM users')]})
            if path=='/api/audit':
                if user['role']!='admin':return self.fail(403,'فقط مدیر.')
                return self.send_data(200,{'ok':True,'audit':[dict(x) for x in con.execute('SELECT * FROM audit_log ORDER BY id DESC LIMIT 100')]})
        return self.fail(404,'مسیر ناشناخته است.')
    def do_POST(self):
        if not self.guard_origin():return
        path=self.path_parts().path
        try:body=self.payload()
        except (ValueError,TypeError,json.JSONDecodeError) as exc:return self.fail(400,str(exc))
        if path=='/api/login':
            addr=self.client_address[0];attempt=LOGIN_ATTEMPTS.get(addr,[])
            attempt=[t for t in attempt if t>time.time()-300]
            if len(attempt)>=12:return self.fail(429,'ورود ناموفق زیاد؛ پنج دقیقه صبر کنید.')
            LOGIN_ATTEMPTS[addr]=attempt
            uname=str(body.get('username') or '').strip();pw=str(body.get('password') or '')
            with DB_LOCK,db_connect(self.server.dbpath) as con:
                user=con.execute('SELECT * FROM users WHERE username=?',(uname,)).fetchone()
                if not user or not check_pw(pw,user['pw_hash']):
                    attempt.append(time.time());return self.fail(401,'نام کاربری یا رمز عبور اشتباه است.')
                LOGIN_ATTEMPTS.pop(addr,None)
                token=secrets.token_hex(32)
                con.execute('INSERT INTO sessions(id_hash,user_id,expires) VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),user['id'],int(time.time())+12*3600))
            cookie=f'bh_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200'+('; Secure' if self.server.https else '')
            return self.send_data(200,{'ok':True,'user':{'username':uname,'role':user['role']}},headers={'Set-Cookie':cookie})
        user=self.protected()
        if not user:return
        actor=user['username']
        try:
            with DB_LOCK,db_connect(self.server.dbpath) as con:
                con.execute('BEGIN IMMEDIATE')
                if path=='/api/logout':
                    ck=SimpleCookie();ck.load(self.headers.get('Cookie',''));token=ck.get('bh_session')
                    if token:con.execute('DELETE FROM sessions WHERE id_hash=?',(hashlib.sha256(token.value.encode()).hexdigest(),))
                    con.execute('COMMIT')
                    # A successful password change invalidates the one-time bootstrap secret file.
                    if actor=='admin':
                        with contextlib.suppress(OSError): (self.server.dbpath.parent/'FIRST_RUN_PASSWORD.txt').unlink()
                    return self.send_data(200,{'ok':True},headers={'Set-Cookie':'bh_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'})
                if path=='/api/change-password':
                    usr=con.execute('SELECT pw_hash FROM users WHERE id=?',(user['id'],)).fetchone()
                    if not check_pw(body.get('old',''),usr[0]):raise ValueError('رمز فعلی نادرست است.')
                    if len(str(body.get('new') or ''))<12:raise ValueError('رمز جدید باید حداقل ۱۲ نویسه باشد.')
                    con.execute('UPDATE users SET pw_hash=? WHERE id=?',(pass_hash(body['new']),user['id']))
                    con.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))
                    write_audit(con,actor,'password_change',{'user':actor})
                    con.execute('COMMIT')
                    # A successful password change invalidates the one-time bootstrap secret file.
                    if actor=='admin':
                        with contextlib.suppress(OSError): (self.server.dbpath.parent/'FIRST_RUN_PASSWORD.txt').unlink()
                    return self.send_data(200,{'ok':True},headers={'Set-Cookie':'bh_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'})
                if path=='/api/create-user':
                    if user['role']!='admin':return self.fail(403,'فقط مدیر.')
                    username=str(body.get('username') or '').strip();pw=str(body.get('password') or '');role=body.get('role','operator')
                    if not username or len(username)>60 or len(pw)<12 or role not in ('admin','operator'):raise ValueError('نام یا نقش نامعتبر یا رمز کمتر از ۱۲ نویسه است.')
                    con.execute('INSERT INTO users(username,pw_hash,role,created_at) VALUES(?,?,?,?)',(username,pass_hash(pw),role,now()))
                    write_audit(con,actor,'user_create',{'user':username,'role':role})
                    con.execute('COMMIT');return self.send_data(200,{'ok':True})
                if path=='/api/catalog':
                    root_id=body.get('root_id');root=body.get('root') or {};variant=body.get('variant') or {}
                    if root_id:
                        pid=int(root_id)
                        if not con.execute('SELECT 1 FROM products WHERE id=?',(pid,)).fetchone():raise ValueError('کالای اصلی انتخاب‌شده وجود ندارد.')
                    else:
                        name=str(root.get('name') or '').strip()
                        if not name:raise ValueError('نام اصلی کالا الزامی است.')
                        code=code_norm(root.get('code') or next_code(con))
                        t=now();pid=con.execute('''INSERT INTO products(code,name,category,unit,min_stock,notes,created_at,updated_at)
                           VALUES(?,?,?,?,?,?,?,?)''',(code,name,str(root.get('category') or ''),str(root.get('unit') or 'عدد'),nonneg(root.get('min_stock')),str(root.get('notes') or ''),t,t)).lastrowid
                    vid=add_variant(con,pid,variant)
                    write_audit(con,actor,'variant_create',{'root_id':pid,'variant_id':vid})
                    con.execute('COMMIT')
                    return self.send_data(200,{'ok':True,'product':product_detail(con,pid),'variant_id':vid})
                if path=='/api/rename-root':
                    pid=int(body.get('id'))
                    name=str(body.get('name') or '').strip()
                    if not name:raise ValueError('نام اصلی کالا الزامی است.')
                    con.execute('UPDATE products SET name=?,category=?,unit=?,min_stock=?,notes=?,updated_at=? WHERE id=?',(name,str(body.get('category') or ''),str(body.get('unit') or 'عدد'),nonneg(body.get('min_stock')),str(body.get('notes') or ''),now(),pid))
                    if not con.execute('SELECT changes()').fetchone()[0]:raise ValueError('کالا یافت نشد.')
                    write_audit(con,actor,'root_edit',{'id':pid})
                    con.execute('COMMIT');return self.send_data(200,{'ok':True,'product':product_detail(con,pid)})
                if path=='/api/update-variant':
                    vid=int(body.get('id'));name=str(body.get('name') or '').strip()
                    if not name:raise ValueError('نام نوع کالا الزامی است.')
                    # Protect historic quantities: changing package size changes its meaning.
                    previous=con.execute('SELECT package_count FROM variants WHERE id=?',(vid,)).fetchone()
                    new_pack=nonneg(body.get('package_count') or 1)
                    if previous and abs(previous[0]-new_pack)>1e-8 and con.execute('SELECT 1 FROM stock_moves WHERE variant_id=? LIMIT 1',(vid,)).fetchone():
                        raise ValueError('تعداد واحد در بسته پس از ثبت گردش موجودی قابل تغییر نیست؛ یک نوع تجاری جدید تعریف کنید.')
                    con.execute('''UPDATE variants SET name=?,brand=?,company=?,specification=?,package_count=?,purchase_price=?,sale_price=?,notes=?,updated_at=? WHERE id=?''',(
                        name,str(body.get('brand') or ''),str(body.get('company') or ''),str(body.get('specification') or ''),nonneg(body.get('package_count') or 1) or 1,nonneg(body.get('purchase_price')),nonneg(body.get('sale_price')),str(body.get('notes') or ''),now(),vid))
                    row=con.execute('SELECT product_id FROM variants WHERE id=?',(vid,)).fetchone()
                    if not row:raise ValueError('این نوع کالا وجود ندارد.')
                    write_audit(con,actor,'variant_edit',{'id':vid})
                    con.execute('COMMIT');return self.send_data(200,{'ok':True,'product':product_detail(con,row[0])})
                if path=='/api/add-barcode':
                    vid=int(body.get('variant_id'));code=barcode_norm(body.get('code'))
                    row=con.execute('SELECT product_id FROM variants WHERE id=?',(vid,)).fetchone()
                    if not row:raise ValueError('نوع کالا یافت نشد.')
                    ensure_unique_barcode(con,code,vid)
                    con.execute("INSERT OR IGNORE INTO barcodes(variant_id,code,kind,created_at) VALUES(?,?,'factory',?)",(vid,code,now()))
                    write_audit(con,actor,'barcode_add',{'variant_id':vid,'barcode':code})
                    con.execute('COMMIT');return self.send_data(200,{'ok':True,'product':product_detail(con,row[0])})
                if path=='/api/remove-barcode':
                    bid=int(body.get('id'))
                    r=con.execute('SELECT kind,variant_id FROM barcodes WHERE id=?',(bid,)).fetchone()
                    if not r or r['kind']=='internal':raise ValueError('حذف بارکد داخلی مجاز نیست.')
                    con.execute('DELETE FROM barcodes WHERE id=?',(bid,));write_audit(con,actor,'barcode_remove',{'id':bid})
                    con.execute('COMMIT');return self.send_data(200,{'ok':True})
                if path=='/api/reference':
                    typ=str(body.get('type') or '')
                    if typ=='warehouse':
                        name=str(body.get('name') or '').strip()
                        if not name:raise ValueError('نام انبار را وارد کنید.')
                        con.execute('INSERT INTO warehouses(name,location) VALUES(?,?)',(name,str(body.get('location') or '')))
                    elif typ=='supplier':
                        name=str(body.get('name') or '').strip()
                        if not name:raise ValueError('نام تأمین‌کننده را وارد کنید.')
                        con.execute('INSERT INTO suppliers(name,phone,address,notes) VALUES(?,?,?,?)',(name,str(body.get('phone') or ''),str(body.get('address') or ''),str(body.get('notes') or '')))
                    elif typ=='service':
                        title=str(body.get('title') or '').strip()
                        if not title:raise ValueError('نام خدمت را وارد کنید.')
                        con.execute('INSERT INTO services(code,title,category,national_code,tariff_price,notes) VALUES(?,?,?,?,?,?)',(str(body.get('code') or '') or None,title,str(body.get('category') or ''),str(body.get('national_code') or ''),nonneg(body.get('tariff_price')),str(body.get('notes') or '')))
                    else:raise ValueError('نوع نامعتبر است.')
                    write_audit(con,actor,'reference_create',{'type':typ})
                    con.execute('COMMIT');return self.send_data(200,{'ok':True})
                if path=='/api/stock':
                    vid=int(body.get('variant_id'));wid=int(body.get('warehouse_id'));lid=body.get('lot_id')
                    kind=str(body.get('kind') or '')
                    if kind not in ('purchase','sale','use','count','adjust'):raise ValueError('نوع عملیات انبار نامعتبر است.')
                    qty=nonneg(body.get('quantity'))
                    if qty==0 and kind not in ('count',):raise ValueError('تعداد باید بیشتر از صفر باشد.')
                    if not con.execute('SELECT 1 FROM variants WHERE id=?',(vid,)).fetchone():raise ValueError('نوع کالا وجود ندارد.')
                    if not con.execute('SELECT 1 FROM warehouses WHERE id=?',(wid,)).fetchone():raise ValueError('انبار وجود ندارد.')
                    if lid:
                        r=con.execute('SELECT * FROM lots WHERE id=? AND variant_id=? AND warehouse_id=?',(int(lid),vid,wid)).fetchone()
                        if not r:raise ValueError('ردیف موجودی انتخابی برای این کالا و انبار نیست.')
                        lid=r['id'];before=r['qty']
                    else:
                        before=0
                        if kind in ('sale','use'):raise ValueError('برای خروج یا فروش، سری موجودی دقیق را انتخاب کنید.')
                        lid=con.execute('''INSERT INTO lots(variant_id,warehouse_id,qty,batch,expiry,shelf,supplier_id,updated_at)
                           VALUES(?,?,0,?,?,?,?,?)''',(vid,wid,str(body.get('batch') or ''),str(body.get('expiry') or ''),str(body.get('shelf') or ''),int(body['supplier_id']) if body.get('supplier_id') else None,now())).lastrowid
                    after=(qty if kind=='count' else before-qty if kind in ('sale','use') else before+(qty if kind=='purchase' else float(body.get('signed_delta') or 0)))
                    if kind=='adjust' and abs(float(body.get('signed_delta') or 0))<.00001:raise ValueError('مقدار اصلاح موجودی صفر است.')
                    if after < -1e-7:raise ValueError('موجودی این سری کافی نیست؛ خروج ثبت نشد.')
                    after=max(0,after)
                    con.execute('UPDATE lots SET qty=?,updated_at=? WHERE id=?',(after,now(),lid))
                    con.execute('INSERT INTO stock_moves(lot_id,variant_id,kind,delta,before_qty,after_qty,reference,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?)',(
                        lid,vid,kind,after-before,before,after,str(body.get('reference') or ''),actor,now()))
                    write_audit(con,actor,'stock_'+kind,{'variant_id':vid,'lot_id':lid,'before':before,'after':after})
                    con.execute('COMMIT');return self.send_data(200,{'ok':True,'lot_id':lid,'stock_before':before,'stock_after':after})
                self.fail(404,'مسیر ناشناخته است.');return
        except (ValueError,TypeError,OverflowError,sqlite3.IntegrityError) as exc:
            msg=str(exc)
            if isinstance(exc,sqlite3.IntegrityError):msg='کد یا بارکد تکراری است یا داده به رکورد نامعتبری اشاره می‌کند.'
            return self.fail(400,msg)
        except Exception as exc:
            traceback.print_exc();return self.fail(500,'خطای داخلی سرور؛ عملیات انجام نشد.')

class Service(ThreadingHTTPServer):
    daemon_threads=True
    allow_reuse_address=True

def beacon(port,stop,instance_id,ca_hash):
    """Native desktop clients can discover server using UDP broadcast (browsers cannot use UDP)."""
    sock=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
    try:
        sock.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
        sock.bind(('',port+1));sock.settimeout(1)
        while not stop.is_set():
            try:message,addr=sock.recvfrom(1000)
            except socket.timeout:continue
            if message==DISCOVERY_MAGIC:
                try:sock.sendto(json.dumps({'service':'bastiyan-catalog','version':VERSION,'port':port,'server_id':instance_id,'ca_sha256':ca_hash,'https':True}).encode(),addr)
                except OSError:pass
    except OSError as exc:print('کشف سرور در این شبکه غیرفعال است:',exc)
    finally:sock.close()

def backup_db(path,output):
    output.mkdir(exist_ok=True,parents=True)
    dest=output/('bastiyan-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.sqlite3')
    with DB_LOCK,db_connect(path) as con,sqlite3.connect(dest) as copy:con.backup(copy)
    files=sorted(output.glob('bastiyan-*.sqlite3'))
    for old in files[:-14]:old.unlink()
    return dest

def backup_loop(path,stop):
    day=''
    while not stop.wait(90):
        curr=datetime.now().strftime('%Y%m%d')
        if day!=curr:
            try:
                backup_db(path,path.parent/'backups');day=curr
            except Exception:traceback.print_exc()

def main(argv=None):
    p=argparse.ArgumentParser(description='Bastiyan Catalog LAN Server')
    p.add_argument('--port',type=int,default=PORT)
    p.add_argument('--bind',default='0.0.0.0')
    p.add_argument('--data',default=str(BASE/'data'))
    p.add_argument('--https',action='store_true',help='Requires cryptography; see generate_tls.py')
    p.add_argument('--self-check', action='store_true', help='Validate database and TLS without starting server')
    args=p.parse_args(argv)
    data=Path(args.data).resolve();data.mkdir(parents=True,exist_ok=True)
    try:os.chmod(data,0o700)
    except OSError:pass
    dbpath=data/'catalog.sqlite3'
    init_db(dbpath)
    # SQLite startup checks must not repair or overwrite suspect databases silently.
    with db_connect(dbpath) as con:
        integrity=con.execute('PRAGMA quick_check').fetchone()[0]
        schema_count=con.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('products','variants','barcodes','users','lots')").fetchone()[0]
    if integrity!='ok' or schema_count!=5:
        raise RuntimeError('Database integrity/schema check failed; source database untouched: '+str(integrity))
    marker=data/'server-identity.txt'
    if marker.exists():instance_id=marker.read_text(encoding='ascii').strip()
    else:
        instance_id=str(uuid.uuid4())
        # Fail closed rather than silently creating a different identity on race.
        with marker.open('x',encoding='ascii') as f:f.write(instance_id)
    if args.https:
        try:
            from generate_tls import ensure_tls
            crt,key=ensure_tls(data,local_ips())
        except Exception as exc:
            print('خطا: HTTPS آماده نیست:',exc,'\n  python -m pip install cryptography');sys.exit(2)
    if args.self_check:
        print(json.dumps({'ok':True,'version':VERSION,'database':'ok','https':args.https,'identity':instance_id}))
        return
    if not args.https and args.bind not in ('127.0.0.1','localhost','::1'):
        raise RuntimeError('HTTP is only permitted on loopback for diagnosis; use --https on LAN.')
    server=Service((args.bind,args.port),AppHandler)
    server.dbpath=dbpath;server.https=args.https;server.instance_id=instance_id;server.db_ok=True
    if args.https:
        ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);ctx.minimum_version=ssl.TLSVersion.TLSv1_2;ctx.load_cert_chain(str(crt),str(key));server.socket=ctx.wrap_socket(server.socket,server_side=True)
    stop=threading.Event()
    ca_hash=hashlib.sha256((data/'bastiyan-local-CA.crt').read_bytes()).hexdigest() if args.https else ''
    if args.https:threading.Thread(target=beacon,args=(args.port,stop,instance_id,ca_hash),daemon=True).start()
    threading.Thread(target=backup_loop,args=(dbpath,stop),daemon=True).start()
    scheme='https' if args.https else 'http'
    print('\n'+'='*65+'\n   گردآورنده مرکزی باستیان | نسخه '+VERSION+'\n'+'='*65)
    print('رایانه سرور: '+f'{scheme}://localhost:{args.port}')
    for ip in local_ips(): print('گوشی/رایانه دیگر: '+f'{scheme}://{ip}:{args.port}')
    print('شناسه ثابت سرور: '+instance_id)
    print('دیتابیس: '+str(dbpath))
    print('نسخه‌های پشتیبان: '+str(data/'backups'))
    if not args.https:print('توجه: HTTP برای دوربین زنده گوشی و امنیت رمز در شبکه مناسب نیست؛ راهنمای HTTPS را بخوانید.')
    else:print('برای دوربین گوشی باید گواهی CA محلی را روی گوشی نصب و به آن اعتماد کنید؛ راهنما را ببینید.')
    print('برای توقف Ctrl+C بزنید.\n',flush=True)
    try:server.serve_forever(poll_interval=.25)
    except KeyboardInterrupt:pass
    finally:stop.set();server.server_close();backup_db(dbpath,data/'backups')

if __name__=='__main__':main()
