"""Regression: reset the admin account without altering catalog or clinical data."""
import sys,sqlite3, tempfile,unittest,contextlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server


class AdminProvision(unittest.TestCase):
    def test_preserve_products_role_backup_and_sessions(self):
        with tempfile.TemporaryDirectory() as root:
            db=Path(root)/'catalog.sqlite3'
            server.init_db(db)
            with server.db_connect(db) as con:
                con.execute("INSERT INTO products(code,name,created_at,updated_at) VALUES('12','Test product',?,?)",(server.now(),server.now()))
                con.execute("UPDATE users SET role='operator' WHERE username='admin'")
                admin=con.execute("SELECT id FROM users WHERE username='admin'").fetchone()['id']
                con.execute("INSERT INTO sessions(id_hash,user_id,expires) VALUES('session-test',?,9999999999)",(admin,))
                original=con.execute("SELECT count(*) FROM products").fetchone()[0]
            private_test_secret='test-only-provisioning-secret-2026'
            snapshot=server.provision_admin(db,private_test_secret)
            self.assertTrue(snapshot.is_file())
            with contextlib.closing(sqlite3.connect(snapshot)) as old:
                self.assertEqual(old.execute('PRAGMA quick_check').fetchone()[0],'ok')
                self.assertEqual(old.execute('SELECT count(*) FROM products').fetchone()[0],original)
                self.assertEqual(old.execute("SELECT role FROM users WHERE username='admin'").fetchone()[0],'operator')
            with server.db_connect(db) as con:
                row=con.execute("SELECT pw_hash,role,id FROM users WHERE username='admin'").fetchone()
                self.assertEqual(row['role'],'admin')
                self.assertTrue(server.check_pw(private_test_secret,row['pw_hash']))
                self.assertEqual(con.execute('SELECT count(*) FROM products').fetchone()[0],original)
                self.assertEqual(con.execute("SELECT count(*) FROM sessions WHERE user_id=?",(row['id'],)).fetchone()[0],0)
                self.assertEqual(con.execute('PRAGMA quick_check').fetchone()[0],'ok')
            # A second install must preserve all rows and generate another unique backup.
            backup2=server.provision_admin(db,private_test_secret)
            self.assertNotEqual(snapshot,backup2)
            with server.db_connect(db) as con:
                self.assertEqual(con.execute("SELECT name FROM products WHERE code='12'").fetchone()[0],'Test product')


if __name__=='__main__':
    unittest.main()
