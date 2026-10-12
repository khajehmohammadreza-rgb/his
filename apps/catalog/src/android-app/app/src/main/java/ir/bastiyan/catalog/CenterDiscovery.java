package ir.bastiyan.catalog;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import javax.net.ssl.*;
import java.util.Locale;

/** LAN discovery and TOFU pinned local-CA enrollment. Never send login credentials during bootstrap. */
public class CenterDiscovery {
    public static final int PORT=8765;
    private final Context context;
    public CenterDiscovery(Context ctx){context=ctx.getApplicationContext();}
    private SharedPreferences prefs(){return context.getSharedPreferences("trusted_center",Context.MODE_PRIVATE);}
    public static final class Center {
        public String host,id,caPem;
        Center(String h,String i,String pem){host=h;id=i;caPem=pem;}
    }
    public Center find() {
        SharedPreferences store=prefs();String saved=store.getString("host","");
        String identity=store.getString("serverId","");String certificate=store.getString("ca","");
        if(!saved.isEmpty() && !certificate.isEmpty() && validHost(saved) && verify(saved,identity,certificate))
            return new Center(saved,identity,certificate);
        if(!identity.isEmpty() && certificate.isEmpty())return null; // A lost pinned CA cannot be replaced silently.
        try(DatagramSocket sock=new DatagramSocket()){
            sock.setBroadcast(true);sock.setSoTimeout(500);
            byte[] magic="BASTIYAN_CATALOG_DISCOVER_V2".getBytes(StandardCharsets.US_ASCII);
            sock.send(new DatagramPacket(magic,magic.length,InetAddress.getByName("255.255.255.255"),PORT+1));
            sock.send(new DatagramPacket(magic,magic.length,InetAddress.getByName("127.0.0.1"),PORT+1));
            long end=System.currentTimeMillis()+2300;
            while(System.currentTimeMillis()<end){
                byte[] raw=new byte[2048];DatagramPacket p=new DatagramPacket(raw,raw.length);
                try{sock.receive(p);}catch(SocketTimeoutException t){continue;}
                String host=p.getAddress().getHostAddress();if(!validHost(host))continue;
                JSONObject msg;
                try{msg=new JSONObject(new String(p.getData(),0,p.getLength(),StandardCharsets.UTF_8));}
                catch(Exception malformed){continue;}
                if(!"bastiyan-catalog".equals(msg.optString("service")) || !msg.optBoolean("https"))continue;
                String id=msg.optString("server_id"),finger=msg.optString("ca_sha256");
                if(id.isEmpty()||finger.length()!=64)continue;
                if(!identity.isEmpty() && !identity.equals(id))continue;
                if(!certificate.isEmpty() && !finger.equals(sha256(certificate.getBytes(StandardCharsets.US_ASCII))))continue;
                String ca=certificate.isEmpty()?fetchPublicCA(host):certificate;
                if(!finger.equals(sha256(ca.getBytes(StandardCharsets.US_ASCII))))continue;
                if(!verify(host,id,ca))continue;
                store.edit().putString("host",host).putString("serverId",id).putString("ca",ca).apply();
                return new Center(host,id,ca);
            }
        }catch(Exception ignore) { /* Offline state; will retry on next heartbeat. */ }
        return null;
    }
    public static boolean validHost(String text) {
        try {
            InetAddress ip=InetAddress.getByName(text);
            if(!(ip instanceof Inet4Address)||!text.equals(ip.getHostAddress()))return false;
            byte[] a=ip.getAddress();int first=a[0]&255,second=a[1]&255;
            return first==10 || (first==172 && second>=16 && second<=31) || (first==192 && second==168) || first==127;
        } catch(Exception ex){return false;}
    }
    static String sha256(byte[] raw)throws Exception{
        byte[] hash=MessageDigest.getInstance("SHA-256").digest(raw);
        StringBuilder b=new StringBuilder();for(byte x:hash)b.append(String.format(Locale.US,"%02x",x&255));return b.toString();
    }
    // A PUBLIC CA certificate is downloaded without authentication only once, and fingerprint-bound
    // to UDP discovery. This is TOFU: the first Wi-Fi must be a trusted network.
    private static String fetchPublicCA(String ip)throws Exception{
        HttpsURLConnection c=(HttpsURLConnection)new URL("https://"+ip+":"+PORT+"/api/ca-cert").openConnection();
        c.setSSLSocketFactory(insecureOnlyForPublicCa());c.setHostnameVerifier((h,s)->h.equals(ip));
        c.setConnectTimeout(2000);c.setReadTimeout(2000);c.setInstanceFollowRedirects(false);
        try{
            if(c.getResponseCode()!=200)throw new Exception("CA unavailable");
            ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[2048];int n,total=0;
            try(java.io.InputStream in=c.getInputStream()){
                while((n=in.read(buf))!=-1){total+=n;if(total>16384)throw new Exception("CA too large");out.write(buf,0,n);}
            }
            String pem=out.toString("US-ASCII");if(!pem.startsWith("-----BEGIN CERTIFICATE-----"))throw new Exception("Invalid CA");
            return pem;
        }finally{c.disconnect();}
    }
    private static SSLSocketFactory insecureOnlyForPublicCa()throws Exception{
        TrustManager[] tm={new X509TrustManager(){
            public X509Certificate[] getAcceptedIssuers(){return new X509Certificate[0];}
            public void checkClientTrusted(X509Certificate[] chain,String auth){}
            public void checkServerTrusted(X509Certificate[] chain,String auth){}
        }};
        SSLContext c=SSLContext.getInstance("TLS");c.init(null,tm,null);return c.getSocketFactory();
    }
    public static X509Certificate parseCA(String pem)throws Exception{
        return (X509Certificate)CertificateFactory.getInstance("X.509").generateCertificate(
                new ByteArrayInputStream(pem.getBytes(StandardCharsets.US_ASCII)));
    }
    public static SSLSocketFactory trustedFactory(String pem)throws Exception{
        X509Certificate ca=parseCA(pem);ca.checkValidity();if(ca.getBasicConstraints()<0)throw new Exception("Not a CA");
        ca.verify(ca.getPublicKey());
        java.security.KeyStore store=java.security.KeyStore.getInstance(java.security.KeyStore.getDefaultType());
        store.load(null,null);store.setCertificateEntry("bastiyan-center",ca);
        TrustManagerFactory f=TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());f.init(store);
        SSLContext ssl=SSLContext.getInstance("TLS");ssl.init(null,f.getTrustManagers(),null);return ssl.getSocketFactory();
    }
    public static boolean verify(String ip,String id,String pem){
        try {
            HttpsURLConnection c=(HttpsURLConnection)new URL("https://"+ip+":"+PORT+"/api/status").openConnection();
            c.setSSLSocketFactory(trustedFactory(pem));c.setConnectTimeout(1700);c.setReadTimeout(1700);
            c.setInstanceFollowRedirects(false);
            try{
                if(c.getResponseCode()!=200)return false;
                ByteArrayOutputStream out=new ByteArrayOutputStream();
                try(java.io.InputStream input=c.getInputStream()){
                    byte[] b=new byte[1024];int n,total=0;
                    while((n=input.read(b))!=-1){total+=n;if(total>4096)throw new Exception("Invalid status length");out.write(b,0,n);}
                }
                JSONObject json=new JSONObject(out.toString("UTF-8"));
                return json.optBoolean("ok") && json.optBoolean("https") && id.equals(json.optString("server_id"))
                       && "ready".equals(json.optString("database"));
            }finally{c.disconnect();}
        }catch(Exception ex){return false;}
    }
}
