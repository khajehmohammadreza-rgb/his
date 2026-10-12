import concurrent.futures, http.cookiejar, io, json, os, sqlite3, sys, tempfile, threading, unittest, urllib.error, urllib.request
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
class ApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.folder=tempfile.TemporaryDirectory()
        cls.db=Path(cls.folder.name)/'db.sqlite3'
        server.init_db(cls.db)
        cls.passwd=(cls.db.parent/'FIRST_RUN_PASSWORD.txt').read_text().splitlines()[-1]
        cls.http=server.Service(('127.0.0.1',0),server.AppHandler)
        cls.http.dbpath=cls.db;cls.http.https=False
        cls.port=cls.http.server_port
        cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls):cls.http.shutdown();cls.http.server_close();cls.folder.cleanup()
    def setUp(self):
        self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.request('/api/login',{'username':'admin','password':self.passwd})
    def request(self,path,body=None,opener=None,method=None):
        data=json.dumps(body,ensure_ascii=False).encode() if body is not None else None
        r=urllib.request.Request(f'http://127.0.0.1:{self.port}'+path,data=data,headers={'Content-Type':'application/json'} if data else {},method=method)
        return json.loads((opener or self.opener).open(r).read())
    def test_01_root_variants_multiple_barcodes(self):
        x=self.request('/api/catalog',{'root':{'code':'۱۲','name':'آمپول بی‌حسی','category':'دارویی','unit':'عدد'},'variant':{'name':'ویال لیدوکائین ۱ سی‌سی بسته ۱۰','brand':'الف','package_count':10,'barcodes':['6261234500001']}})
        self.__class__.root=x['product']['id'];self.__class__.vid1=x['variant_id']
        assert x['product']['code']=='12'
        x2=self.request('/api/catalog',{'root_id':self.root,'variant':{'name':'ویال بی‌حسی بسته ۷','brand':'ب','package_count':7,'barcodes':['6269999000008']}})
        self.__class__.vid2=x2['variant_id']
        self.assertEqual(len(x2['product']['variants']),2)
        for q in ('12','آمپول بی‌حسی','لیدوکائین','6269999000008','BHS-12-'):
            if q.endswith('-'): d=self.request('/api/search?q='+q)
            else:d=self.request('/api/search?q='+urllib.parse.quote(q))
            self.assertTrue(d['products'])
        one=self.request('/api/lookup?code=6261234500001');self.assertEqual(one['variant_id'],self.vid1)
        two=self.request('/api/lookup?code=6269999000008');self.assertEqual(two['variant_id'],self.vid2)
        internal=x2['product']['variants'][1]['barcodes'][0]['code'];self.assertEqual(self.request('/api/lookup?code='+internal)['variant_id'],self.vid2)
    def test_02_duplicate_rejected_atomic(self):
        d={'root':{'code':'23','name':'بارکد تکراری'},'variant':{'name':'نوع تکراری','barcodes':['6261234500001']}}
        with self.assertRaises(urllib.error.HTTPError):self.request('/api/catalog',d)
        with server.db_connect(self.db) as con:self.assertEqual(con.execute('SELECT COUNT(*) FROM products WHERE code=?',('23',)).fetchone()[0],0)
    def test_03_stock_purchase_sale_and_no_negative(self):
        x=self.request('/api/stock',{'variant_id':self.vid1,'warehouse_id':1,'kind':'purchase','quantity':12,'batch':'AB-1','expiry':'2027-12-01'})
        lid=x['lot_id'];self.__class__.lid=lid
        x=self.request('/api/stock',{'variant_id':self.vid1,'warehouse_id':1,'lot_id':lid,'kind':'sale','quantity':5});self.assertEqual(x['stock_after'],7)
        with self.assertRaises(urllib.error.HTTPError):self.request('/api/stock',{'variant_id':self.vid1,'warehouse_id':1,'lot_id':lid,'kind':'sale','quantity':8})
        self.assertEqual(self.request('/api/lots?variant_id='+str(self.vid1))['lots'][0]['qty'],7)
        self.assertEqual(self.request('/api/search?q='+urllib.parse.quote('آمپول'))['products'][0]['variants'][0]['stock'],7)
    def test_04_csv_and_json(self):
        x=self.request('/api/export');self.assertEqual(x['schema'],'bastiyan-collector/2');self.assertEqual(len(x['products']),1)
        with self.opener.open(f'http://127.0.0.1:{self.port}/api/export-csv?type=variants') as r:
            csvtext=r.read().decode('utf-8-sig');self.assertIn('ویال لیدوکائین',csvtext)
        with self.opener.open(f'http://127.0.0.1:{self.port}/api/export-csv?type=roots') as r:
            csvtext=r.read().decode('utf-8-sig');self.assertEqual(csvtext.count('آمپول بی‌حسی'),1)
    def test_05_roles_and_backup(self):
        self.request('/api/create-user',{'username':'tester','password':'VeryLong!234567','role':'operator'})
        op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.request('/api/login',{'username':'tester','password':'VeryLong!234567'},op)
        with self.assertRaises(urllib.error.HTTPError):self.request('/api/export',opener=op)
        result=server.backup_db(self.db,self.db.parent/'backups')
        self.assertTrue(result.exists())
        with sqlite3.connect(result) as con:self.assertEqual(con.execute('PRAGMA integrity_check').fetchone()[0],'ok')
    def test_06_concurrent_code_conflict(self):
        def write(i):
            # Each worker logs in separately to avoid cookiejar thread safety issues.
            op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
            self.request('/api/login',{'username':'admin','password':self.passwd},op)
            try:
                self.request('/api/catalog',{'root':{'code':'91','name':'تست همزمان'},'variant':{'name':'نوع '+str(i)}},op)
                return True
            except urllib.error.HTTPError:return False
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rs=list(pool.map(write,range(3)))
        self.assertEqual(sum(rs),1)
    def test_07_origin_check(self):
        r=urllib.request.Request(f'http://127.0.0.1:{self.port}/api/catalog',data=b'{}',headers={'Content-Type':'application/json','Origin':'http://evil.example'})
        with self.assertRaises(urllib.error.HTTPError) as cm:self.opener.open(r)
        self.assertEqual(cm.exception.code,403)
if __name__=='__main__':unittest.main(verbosity=2)
