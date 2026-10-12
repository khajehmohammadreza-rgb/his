package ir.bastiyan.catalog;

import android.app.Activity;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslCertificate;
import android.net.http.SslError;
import android.os.*;
import android.provider.MediaStore;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import androidx.activity.ComponentActivity;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.cert.X509Certificate;
import java.security.cert.CertificateFactory;
import java.util.*;
import java.util.concurrent.*;
import javax.net.ssl.HttpsURLConnection;

/** Native LAN discovery + HTTPS-pinned WebView + native offline-model barcode scanner. */
public class MainActivity extends ComponentActivity {
    private static final int SCAN=41,CHOOSE_PHOTO=42;
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private WebView web;private TextView status;
    private CenterDiscovery.Center center;private String loadedHost="";
    private volatile boolean scanningNetwork=false,running=true;
    private ValueCallback<Uri[]> pendingUpload;

    @Override public void onCreate(Bundle state){
        super.onCreate(state);getWindow().setStatusBarColor(Color.rgb(14,43,72));
        getWindow().setNavigationBarColor(Color.rgb(14,43,72));
        FrameLayout root=new FrameLayout(this);
        web=new WebView(this);web.setBackgroundColor(Color.rgb(244,247,252));
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(true);
        web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.getSettings().setSupportZoom(false);
        android.webkit.CookieManager.getInstance().setAcceptCookie(true);
        android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){
                Uri u=req.getUrl();
                if(center==null || !"https".equals(u.getScheme()) || !center.host.equals(u.getHost()) || u.getPort()!=8765) return true;
                return false;
            }
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error){
                if(center!=null && trustedLeaf(error,center))handler.proceed();
                else{handler.cancel();showStatus("گواهی سرور مرکز تغییر کرده است. اتصال برای امنیت اطلاعات متوقف شد.");}
            }
            @Override public void onPageFinished(WebView v,String url){
                if(center!=null && url.startsWith("https://"+center.host+":8765/"))showStatus(null);
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(pendingUpload!=null)pendingUpload.onReceiveValue(null);
                pendingUpload=callback;
                Intent i=new Intent(Intent.ACTION_GET_CONTENT);i.setType("image/*");i.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(Intent.createChooser(i,"تصویر بارکد"),CHOOSE_PHOTO);
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request){
                // The native scanner provides the camera; do not automatically grant WebView media.
                request.deny();
            }
        });
        web.setDownloadListener((url,userAgent,disposition,mimetype,length)->downloadExport(url,disposition,mimetype));
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));
        status=new TextView(this);status.setText("در حال جست‌وجوی سرور مرکز…");
        status.setTextColor(Color.rgb(22,60,88));status.setTextSize(16);status.setGravity(Gravity.CENTER);
        status.setPadding(30,22,30,22);status.setBackgroundColor(Color.rgb(236,245,252));
        FrameLayout.LayoutParams bar=new FrameLayout.LayoutParams(-1,-2,Gravity.TOP);
        root.addView(status,bar);
        Button scan=new Button(this);scan.setText("اسکن سریع بارکد");scan.setTextColor(Color.WHITE);
        scan.setAllCaps(false);scan.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(18,92,125)));
        FrameLayout.LayoutParams scanPos=new FrameLayout.LayoutParams(-2,-2,Gravity.BOTTOM|Gravity.LEFT);
        scanPos.setMargins(18,18,18,32);root.addView(scan,scanPos);
        scan.setOnClickListener(v->startActivityForResult(new Intent(this,ScannerActivity.class),SCAN));
        setContentView(root);
        ui.post(this::heartbeat);
    }
    private void showStatus(String message){ui.post(()->{
        if(message==null){status.setVisibility(View.GONE);return;}
        status.setText(message);status.setVisibility(View.VISIBLE);
    });}
    private void heartbeat(){
        if(!running)return;
        if(!scanningNetwork){
            scanningNetwork=true;
            worker.execute(()->{
                try{
                    CenterDiscovery.Center next=new CenterDiscovery(this).find();
                    if(!running)return;
                    if(next==null){center=null;showStatus("اتصال به سرور برقرار نیست؛ تلاش مجدد به‌صورت خودکار انجام می‌شود.");}
                    else {
                        center=next;
                        ui.post(()->{
                            if(!next.host.equals(loadedHost)){
                                loadedHost=next.host;
                                showStatus("سرور شناسایی شد؛ در حال اتصال امن…");
                                web.loadUrl("https://"+next.host+":8765/");
                            }else if(web.getUrl()==null){web.loadUrl("https://"+next.host+":8765/");}
                            else showStatus(null);
                        });
                    }
                }catch(Exception ignored){showStatus("شبکه در دسترس نیست؛ در حال تلاش مجدد…");}
                finally{scanningNetwork=false;}
            });
        }
        ui.postDelayed(this::heartbeat,5000);
    }
    private static boolean trustedLeaf(SslError error,CenterDiscovery.Center server){
        // Never blanket-proceed on SSL errors. Verify the leaf's signature against the pinned CA,
        // the leaf validity and SAN IP. Only an otherwise-valid untrusted local CA is allowed.
        try{
            if(error.getPrimaryError()!=SslError.SSL_UNTRUSTED)return false;
            Uri origin=Uri.parse(error.getUrl());
            if(!"https".equals(origin.getScheme()) || !server.host.equals(origin.getHost()) || origin.getPort()!=8765)return false;
            Bundle saved=SslCertificate.saveState(error.getCertificate());
            byte[] bytes=saved.getByteArray("x509-certificate");if(bytes==null)return false;
            X509Certificate leaf=(X509Certificate)CertificateFactory.getInstance("X.509").generateCertificate(new ByteArrayInputStream(bytes));
            X509Certificate ca=CenterDiscovery.parseCA(server.caPem);
            leaf.checkValidity();ca.checkValidity();leaf.verify(ca.getPublicKey());
            if(ca.getBasicConstraints()<0)return false;
            Collection<List<?>> sans=leaf.getSubjectAlternativeNames();
            if(sans==null)return false;
            for(List<?> entry:sans)if(entry.size()>=2 && Integer.valueOf(7).equals(entry.get(0)) && server.host.equals(entry.get(1)))return true;
        }catch(Exception ignored){}
        return false;
    }
    @Override protected void onActivityResult(int req,int result,Intent data){
        super.onActivityResult(req,result,data);
        if(req==SCAN && result==Activity.RESULT_OK && data!=null){
            String code=data.getStringExtra("barcode");if(code==null)return;
            String command="window.dispatchEvent(new CustomEvent('bastiyan-native-scan',{detail:{code:"+JSONObject.quote(code)+"}}));";
            web.evaluateJavascript(command,null);
        }else if(req==CHOOSE_PHOTO){
            if(pendingUpload!=null){
                Uri[] uris=result==RESULT_OK && data!=null && data.getData()!=null?new Uri[]{data.getData()}:null;
                pendingUpload.onReceiveValue(uris);pendingUpload=null;
            }
        }
    }
    private void downloadExport(String url,String name,String mime){
        CenterDiscovery.Center pinned=center;
        if(pinned==null||!url.startsWith("https://"+pinned.host+":8765/api/export"))return;
        worker.execute(()->{
            try{
                HttpsURLConnection c=(HttpsURLConnection)new URL(url).openConnection();
                c.setSSLSocketFactory(CenterDiscovery.trustedFactory(pinned.caPem));
                c.setConnectTimeout(4000);c.setReadTimeout(12000);
                String cookie=android.webkit.CookieManager.getInstance().getCookie("https://"+pinned.host+":8765/");
                if(cookie!=null)c.setRequestProperty("Cookie",cookie);
                if(c.getResponseCode()!=200)throw new IOException("Export unauthorized");
                String filename=url.contains("export-csv")?"bastiyan-catalog.csv":"bastiyan-catalog.json";
                java.io.OutputStream output;
                if(Build.VERSION.SDK_INT>=29){
                    ContentValues values=new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME,filename);
                    values.put(MediaStore.Downloads.MIME_TYPE,filename.endsWith(".json")?"application/json":"text/csv");
                    values.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS);
                    Uri uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
                    if(uri==null)throw new IOException("MediaStore unavailable");
                    output=getContentResolver().openOutputStream(uri);
                }else{
                    File dir=getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    if(dir==null)throw new IOException("Downloads unavailable");
                    output=new FileOutputStream(new File(dir,filename));
                }
                if(output==null)throw new IOException("Cannot save export");
                try(InputStream input=c.getInputStream();OutputStream out=output){
                    byte[] buf=new byte[8192];int n;
                    while((n=input.read(buf))!=-1)out.write(buf,0,n);
                }finally{c.disconnect();}
                ui.post(()->Toast.makeText(this,"خروجی با موفقیت ذخیره شد",Toast.LENGTH_LONG).show());
            }catch(Exception e){ui.post(()->Toast.makeText(this,"ذخیره خروجی انجام نشد: "+e.getMessage(),Toast.LENGTH_LONG).show());}
        });
    }
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){running=false;worker.shutdownNow();web.destroy();super.onDestroy();}
}
