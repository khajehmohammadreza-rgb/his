package ir.bastiyan.catalog;

import android.Manifest;
import android.app.Activity;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.widget.*;
import androidx.activity.ComponentActivity;
import androidx.camera.core.*;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.common.InputImage;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Native CameraX + bundled offline ML Kit barcode reader. No simulated camera frames. */
public final class ScannerActivity extends ComponentActivity {
    private static final int CAMERA_REQUEST = 21, GALLERY_REQUEST = 22;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final AtomicBoolean completed = new AtomicBoolean(false);
    private final AtomicBoolean decoding = new AtomicBoolean(false);
    private final ExecutorService cameraExecutor = Executors.newSingleThreadExecutor();
    private PreviewView preview;
    private BarcodeScanner reader;
    private ImageCapture highResCapture;
    private ProcessCameraProvider cameraProvider;
    private Camera camera;
    private TextView status;
    private Button torchButton, detailedButton;
    private long lastFrameMillis;
    private String lastValue = "";
    private int stableFrames;
    private boolean detailedMode;

    @Override public void onCreate(Bundle savedState) {
        super.onCreate(savedState);
        getWindow().setStatusBarColor(Color.rgb(11, 32, 55));
        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundColor(Color.BLACK);
        preview = new PreviewView(this);
        preview.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        frame.addView(preview, new FrameLayout.LayoutParams(-1, -1));
        View finder = new View(this);
        android.graphics.drawable.GradientDrawable finderShape = new android.graphics.drawable.GradientDrawable();
        finderShape.setColor(0x00111111);
        finderShape.setStroke(dp(3), 0xFF52E8CB);
        finderShape.setCornerRadius(dp(20));
        finder.setBackground(finderShape);
        FrameLayout.LayoutParams finderLp = new FrameLayout.LayoutParams(-1, dp(170), Gravity.CENTER);
        finderLp.setMargins(dp(20), 0, dp(20), 0);
        frame.addView(finder, finderLp);
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.VERTICAL);
        header.setGravity(Gravity.CENTER);
        header.setPadding(dp(15), dp(14), dp(15), dp(14));
        header.setBackgroundColor(0xDF0A243F);
        TextView heading = label("اسکن بارکد با دوربین", 19, Color.WHITE);
        status = label("بارکد را در کادر قرار دهید؛ شناسایی خودکار است.", 14, 0xFFCAECFF);
        header.addView(heading); header.addView(status);
        frame.addView(header, new FrameLayout.LayoutParams(-1, -2, Gravity.TOP));
        LinearLayout actions = new LinearLayout(this);
        actions.setPadding(dp(8), dp(8), dp(8), dp(14));
        actions.setGravity(Gravity.CENTER);
        actions.setOrientation(LinearLayout.VERTICAL);
        actions.setBackgroundColor(0xDB09233C);
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        detailedButton = action("اسکن دقیق (عکس)");
        torchButton = action("چراغ‌قوه");
        row.addView(detailedButton, new LinearLayout.LayoutParams(0, -2, 1f));
        row.addView(torchButton, new LinearLayout.LayoutParams(0, -2, 1f));
        actions.addView(row, new LinearLayout.LayoutParams(-1, -2));
        LinearLayout below = new LinearLayout(this);
        below.setGravity(Gravity.CENTER);
        Button gallery = action("انتخاب عکس بارکد");
        Button manual = action("ورود دستی");
        below.addView(gallery, new LinearLayout.LayoutParams(0, -2, 1f));
        below.addView(manual, new LinearLayout.LayoutParams(0, -2, 1f));
        actions.addView(below, new LinearLayout.LayoutParams(-1, -2));
        frame.addView(actions, new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM));
        setContentView(frame);
        BarcodeScannerOptions options = new BarcodeScannerOptions.Builder().setBarcodeFormats(
                Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8,
                Barcode.FORMAT_UPC_A, Barcode.FORMAT_UPC_E,
                Barcode.FORMAT_CODE_128, Barcode.FORMAT_CODE_39,
                Barcode.FORMAT_CODE_93, Barcode.FORMAT_CODABAR,
                Barcode.FORMAT_ITF, Barcode.FORMAT_QR_CODE,
                Barcode.FORMAT_DATA_MATRIX, Barcode.FORMAT_PDF417).build();
        reader = BarcodeScanning.getClient(options);
        torchButton.setOnClickListener(v -> {
            if (camera == null || !camera.getCameraInfo().hasFlashUnit()) {
                setStatus("دوربین این دستگاه چراغ‌قوه ندارد."); return;
            }
            boolean enabled = Boolean.TRUE.equals(camera.getCameraInfo().getTorchState().getValue());
            camera.getCameraControl().enableTorch(!enabled);
            torchButton.setText(enabled ? "چراغ‌قوه" : "خاموش‌کردن نور");
        });
        detailedButton.setOnClickListener(v -> captureDetailed());
        gallery.setOnClickListener(v -> {
            Intent i = new Intent(Intent.ACTION_GET_CONTENT);
            i.setType("image/*"); i.addCategory(Intent.CATEGORY_OPENABLE);
            startActivityForResult(Intent.createChooser(i, "تصویر بارکد"), GALLERY_REQUEST);
        });
        manual.setOnClickListener(v -> askManual());
        preview.setOnTouchListener((v, motion) -> {
            if (motion.getAction() == MotionEvent.ACTION_UP && camera != null) {
                androidx.camera.core.MeteringPoint point = preview.getMeteringPointFactory().createPoint(motion.getX(), motion.getY());
                camera.getCameraControl().startFocusAndMetering(new FocusMeteringAction.Builder(point, FocusMeteringAction.FLAG_AF | FocusMeteringAction.FLAG_AE).setAutoCancelDuration(3, java.util.concurrent.TimeUnit.SECONDS).build());
                setStatus("در حال فوکوس روی بارکد…");
                return true;
            }
            return true;
        });
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) startCamera();
        else requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQUEST);
    }

    private int dp(int v) { return (int)(v * getResources().getDisplayMetrics().density + .5f); }
    private TextView label(String value, int size, int color) {
        TextView t = new TextView(this); t.setText(value); t.setTextColor(color); t.setTextSize(size);
        t.setGravity(Gravity.CENTER); t.setPadding(dp(5), dp(3), dp(5), dp(3)); return t;
    }
    private Button action(String text) {
        Button b = new Button(this); b.setText(text); b.setTextSize(13); b.setAllCaps(false); return b;
    }
    private void setStatus(String text) { main.post(() -> status.setText(text)); }

    @Override public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        if (code == CAMERA_REQUEST && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) startCamera();
        else if (code == CAMERA_REQUEST) { setStatus("برای شناسایی خودکار بارکد، اجازه دوربین را فعال کنید."); }
    }
    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(this);
        future.addListener(() -> {
            try {
                cameraProvider = future.get(); cameraProvider.unbindAll();
                Preview live = new Preview.Builder().build();
                live.setSurfaceProvider(preview.getSurfaceProvider());
                ImageAnalysis analysis = new ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .setTargetResolution(new android.util.Size(1280, 720)).build();
                highResCapture = new ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                        .setJpegQuality(100).build();
                analysis.setAnalyzer(cameraExecutor, this::readLiveFrame);
                camera = cameraProvider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, live, analysis, highResCapture);
                setStatus("اسکن زنده فعال است؛ برای بارکد کم‌رنگ «اسکن دقیق» را بزنید.");
            } catch (Exception e) { setStatus("دوربین راه‌اندازی نشد: " + e.getMessage()); }
        }, ContextCompat.getMainExecutor(this));
    }
    private void readLiveFrame(ImageProxy frame) {
        if (completed.get() || detailedMode || SystemClock.elapsedRealtime()-lastFrameMillis<110 || !decoding.compareAndSet(false,true)) {
            frame.close(); return;
        }
        lastFrameMillis = SystemClock.elapsedRealtime();
        android.media.Image media = frame.getImage();
        if (media==null) {decoding.set(false);frame.close();return;}
        InputImage image = InputImage.fromMediaImage(media, frame.getImageInfo().getRotationDegrees());
        reader.process(image)
                .addOnSuccessListener(codes -> handleCodes(codes, false))
                .addOnFailureListener(e -> setStatus("بارکد را با نور بیشتر یا دکمه اسکن دقیق امتحان کنید."))
                .addOnCompleteListener(task -> { frame.close(); decoding.set(false); });
    }
    private void handleCodes(List<Barcode> codes, boolean detailed) {
        if (completed.get()) return;
        for (Barcode result : codes) {
            String value=result.getRawValue();
            if (value==null || value.trim().isEmpty()) continue;
            value=value.trim();
            if (value.equals(lastValue)) stableFrames++; else { lastValue=value;stableFrames=1; }
            if (detailed || stableFrames>=2) { complete(value); return; }
            setStatus("بارکد شناسایی شد؛ برای اطمینان یک فریم دیگر بررسی می‌شود…");
            return;
        }
        if (detailed) setStatus("در عکس واضح نبود؛ نور را اصلاح کنید، از فاصله نزدیک‌تر عکس بگیرید یا بارکد را دستی وارد کنید.");
    }
    private void captureDetailed() {
        if (highResCapture==null || completed.get()) {setStatus("دوربین هنوز آماده نیست.");return;}
        detailedMode=true;
        detailedButton.setEnabled(false);
        setStatus("در حال تصویربرداری با کیفیت بالا و تحلیل دقیق بارکد…");
        highResCapture.takePicture(cameraExecutor, new ImageCapture.OnImageCapturedCallback(){
            @Override public void onCaptureSuccess(ImageProxy photo) {
                try {
                    android.media.Image media=photo.getImage();
                    if(media==null){setStatus("دریافت عکس انجام نشد.");resetDetailed();return;}
                    InputImage image=InputImage.fromMediaImage(media, photo.getImageInfo().getRotationDegrees());
                    reader.process(image)
                            .addOnSuccessListener(codes -> handleCodes(codes,true))
                            .addOnFailureListener(err -> setStatus("تحلیل عکس ناموفق بود؛ عکس دیگری امتحان کنید."))
                            .addOnCompleteListener(task -> {photo.close();resetDetailed();});
                }catch(Exception e){photo.close();resetDetailed();setStatus("تصویربرداری ناموفق بود.");}
            }
            @Override public void onError(ImageCaptureException e){resetDetailed();setStatus("دوربین نتوانست عکس بگیرد: "+e.getMessage());}
        });
    }
    private void resetDetailed(){ main.post(()->{detailedMode=false;detailedButton.setEnabled(true);}); }
    private void askManual() {
        EditText field=new EditText(this);field.setSingleLine(true);field.setHint("شماره بارکد");
        field.setInputType(android.text.InputType.TYPE_CLASS_TEXT);
        FrameLayout box=new FrameLayout(this);box.setPadding(dp(16),0,dp(16),0);
        box.addView(field,new FrameLayout.LayoutParams(-1,-2));
        new android.app.AlertDialog.Builder(this).setTitle("ورود دستی بارکد")
                .setView(box).setNegativeButton("انصراف",null)
                .setPositiveButton("تأیید",(dialog,button)->{
                    String val=field.getText().toString().trim();
                    if(!val.isEmpty())complete(val); else setStatus("شماره بارکد خالی است.");
                }).show();
    }
    private void complete(String value){
        if (!completed.compareAndSet(false,true))return;
        try {
            android.os.Vibrator v=(android.os.Vibrator)getSystemService(VIBRATOR_SERVICE);
            if (v!=null&&v.hasVibrator()) v.vibrate(80);
        }catch(Exception ignored){}
        Intent result=new Intent();result.putExtra("barcode",value);
        setResult(Activity.RESULT_OK,result);finish();
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==GALLERY_REQUEST&&result==RESULT_OK&&data!=null&&data.getData()!=null){
            Uri photo=data.getData();setStatus("در حال تحلیل تصویر انتخابی…");
            try {
                InputImage input=InputImage.fromFilePath(this,photo);
                reader.process(input)
                        .addOnSuccessListener(codes -> handleCodes(codes,true))
                        .addOnFailureListener(e -> setStatus("بارکد در این تصویر خوانده نشد."));
            }catch(IOException ex){setStatus("تصویر انتخابی قابل خواندن نیست.");}
        }
    }
    @Override protected void onDestroy(){
        completed.set(true);
        if(cameraProvider!=null) cameraProvider.unbindAll();
        cameraExecutor.shutdown();
        if(reader!=null)reader.close();
        super.onDestroy();
    }
}
