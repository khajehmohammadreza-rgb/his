/**
 * Bastiyan HIS R24 - unified mobile/desktop barcode scanner.
 * Secure camera (HTTPS), offline CODE128/EAN fallback, native BarcodeDetector,
 * image capture / upload, USB scanner input, device/torch selection.
 */
import React, {useState,useRef,useEffect} from '../../client-vendor/react.js?b=r24-514-1405';
import { X, Camera, CheckCircle2, AlertTriangle, Search, Upload } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import {decodeCanvasImage,normalizeScannedCode} from '../utils/barcodeDecoder.js?b=r24-514-1405';
const h=React.createElement;
const formats=['ean_13','ean_8','code_128','code_39','upc_a','upc_e','qr_code','itf','data_matrix'];
function beep(){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=new AC(),o=c.createOscillator(),g=c.createGain();o.frequency.value=1150;g.gain.value=.08;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.09);o.onended=()=>c.close();}catch(_){}}
const B=(title,click,disabled=false)=>h('button',{type:'button',onClick:click,disabled,className:'bhis-secondary-button',style:{padding:'9px 11px',borderRadius:10,cursor:disabled?'wait':'pointer'}},title);
export function BarcodeCameraScanner({open=false,onDetected,onClose,continuous=false}){
  const video=useRef(null),stream=useRef(null),timer=useRef(0),detector=useRef(null),active=useRef(false),busy=useRef(false),callbacks=useRef({}),seen=useRef({code:'',at:0}),lastOnVideo=useRef(0),fileRef=useRef(null);
  const [manual,setManual]=useState(''),[status,setStatus]=useState(''),[error,setError]=useState(''),[device,setDevice]=useState(''),[devices,setDevices]=useState([]),[torch,setTorch]=useState(false),[torchCap,setTorchCap]=useState(false),[capturing,setCapturing]=useState(false),[lastCode,setLastCode]=useState('');
  callbacks.current={onDetected,onClose,continuous};
  function detect(raw,source='camera'){
    const code=normalizeScannedCode(raw);if(!code||!active.current)return false;
    const now=Date.now();if(seen.current.code===code && now-seen.current.at<1700)return false;
    seen.current={code,at:now};lastOnVideo.current=now;
    setLastCode(code);setStatus(`شناسایی شد (${source}): ${code}`);beep();try{navigator.vibrate?.(70);}catch(_){}
    // Never mutate inventory or create sales here; route to the owning workflow.
    const props=callbacks.current;
    const result=props.onDetected?.(code,{resume:()=>{setLastCode('');seen.current={code:'',at:0};},close:()=>props.onClose?.()});
    if(!props.continuous && result!==false)props.onClose?.();
    return true;
  }
  async function prepareNativeDetector(){
    if(typeof window.BarcodeDetector!=='function')return null;
    try{
      const supported=typeof window.BarcodeDetector.getSupportedFormats==='function'?await window.BarcodeDetector.getSupportedFormats():formats;
      const usable=formats.filter(x=>supported.includes(x));
      if(!usable.length)return null;
      return new window.BarcodeDetector({formats:usable});
    }catch(_){return null;}
  }
  useEffect(()=>{
    if(!open)return;
    let cancelled=false;active.current=true;seen.current={code:'',at:0};lastOnVideo.current=0;setError('');setStatus('در حال دریافت مجوز دوربین...');setLastCode('');
    async function loop(){
      if(cancelled||!active.current)return;
      if(!busy.current&&video.current?.readyState>=2 && video.current.videoWidth){
        busy.current=true;
        try{
          let code='';
          if(detector.current){try{const result=await detector.current.detect(video.current);code=result?.[0]?.rawValue||'';}catch(_){}}
          if(!code)code=decodeCanvasImage(video.current)||'';
          if(!cancelled && code)detect(code,'خودکار');
        }catch(_){/* single imperfect frame must not close camera */}
        finally{busy.current=false;}
      }
      if(!cancelled)timer.current=window.setTimeout(loop,190);
    }
    async function start(){
      try{
        if(!navigator.mediaDevices?.getUserMedia)throw new Error(!window.isSecureContext?'HTTPS_REQUIRED':'CAMERA_UNAVAILABLE');
        const videoConstraints={width:{ideal:1920},height:{ideal:1080},facingMode:{ideal:'environment'}};
        if(device)videoConstraints.deviceId={exact:device};
        const s=await navigator.mediaDevices.getUserMedia({video:videoConstraints,audio:false});
        if(cancelled){s.getTracks().forEach(t=>t.stop());return;}
        stream.current=s;
        if(video.current){video.current.srcObject=s;await video.current.play();}
        if(cancelled)return;
        const track=s.getVideoTracks()[0],caps=track?.getCapabilities?.()||{};
        setTorchCap(!!caps.torch);setTorch(false);
        if(caps.focusMode?.includes('continuous'))track.applyConstraints({advanced:[{focusMode:'continuous'}]}).catch(()=>{});
        const found=await navigator.mediaDevices.enumerateDevices().catch(()=>[]);
        if(!cancelled)setDevices(found.filter(x=>x.kind==='videoinput'));
        detector.current=await prepareNativeDetector();
        setStatus(detector.current?'شناسایی خودکار فعال: EAN / Code128 / QR و سایر کدهای پشتیبانی‌شده.':'موتور آفلاین فعال: EAN-13 / EAN-8 / Code128. برای QR از مرورگر سازگار یا تصویر استفاده کنید.');
        loop();
      }catch(err){
        if(cancelled)return;
        setError(err?.name==='NotAllowedError'?'دسترسی دوربین رد شده است. مجوز دوربین را در تنظیمات مرورگر فعال کنید.':err?.name==='NotFoundError'?'دوربینی در این دستگاه یافت نشد.':!window.isSecureContext?'دوربین فقط در HTTPS یا localhost قابل استفاده است.':'دوربین قابل راه‌اندازی نیست؛ آن را در برنامه‌های دیگر ببندید یا دستگاه دیگری انتخاب کنید.');
        setStatus('اسکن دستی، بارکدخوان USB و بارگذاری عکس همچنان فعال‌اند.');
      }
    }
    start();
    return()=>{cancelled=true;active.current=false;clearTimeout(timer.current);timer.current=0;busy.current=false;detector.current=null;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;};
  },[open,device]);
  if(!open)return null;
  const analyzeImage=async (source)=>{
    let result='';
    if(detector.current){try{const codes=await detector.current.detect(source);result=codes?.[0]?.rawValue||'';}catch(_){}}
    if(!result)result=decodeCanvasImage(source,{deep:true})||'';
    return result;
  };
  const capture=async()=>{
    if(capturing)return;setCapturing(true);setStatus('در حال بررسی فریم با وضوح کامل و تحلیل چندسطری...');
    try{
      if(!video.current?.videoWidth){setStatus('دوربین فعال نیست. از «بارگذاری عکس» یا ورود دستی استفاده کنید.');return;}
      const canvas=document.createElement('canvas');canvas.width=video.current.videoWidth;canvas.height=video.current.videoHeight;
      canvas.getContext('2d',{willReadFrequently:true}).drawImage(video.current,0,0,canvas.width,canvas.height);
      const code=await analyzeImage(canvas);if(code)detect(code,'تصویر دقیق');else setStatus('بارکد از تصویر تشخیص داده نشد. نور را زیاد کنید، دوربین را ثابت نگه دارید و دوباره تلاش کنید.');
    }catch(_){setStatus('تحلیل تصویر ناموفق بود؛ لطفاً دوباره تلاش کنید.');}
    finally{setCapturing(false);}
  };
  const upload=async e=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    if(file.size>12*1024*1024){setStatus('حجم تصویر بیش از ۱۲ مگابایت است.');return;}
    setCapturing(true);setStatus('در حال خواندن تصویر بارکد...');
    let url='';
    try{
      url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();
      const code=await analyzeImage(img);if(code)detect(code,'فایل تصویر');else setStatus('نتیجه‌ای در عکس پیدا نشد؛ عکس واضح‌تر یا ورود دستی را امتحان کنید.');
    }catch(_){setStatus('فایل تصویر قابل خواندن نبود.');}
    finally{if(url)URL.revokeObjectURL(url);setCapturing(false);}
  };
  const toggleTorch=async()=>{
    const track=stream.current?.getVideoTracks()[0];if(!track)return;
    try{await track.applyConstraints({advanced:[{torch:!torch}]});setTorch(!torch);}catch(_){setStatus('چراغ‌قوه در این دوربین در دسترس نیست.');}
  };
  const submit=e=>{e.preventDefault();const code=normalizeScannedCode(manual);if(code){detect(code,'دستی/بارکدخوان USB');setManual('');}};
  return h('div',{className:'bhis-picker-overlay',dir:'rtl',role:'dialog','aria-modal':'true','aria-label':'بارکدخوان کالا'},
    h('div',{className:'bhis-scanner-panel bhis-scanner-r24',style:{maxHeight:'98dvh',overflowY:'auto',background:'#0f172a',color:'#f8fafc'}},
      h('header',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',gap:12}},
        h('div',null,h('strong',{style:{fontSize:17}},'بارکدخوان یکپارچه باستیان'),h('div',{style:{fontSize:12,color:'#cbd5e1',marginTop:4}},'تشخیص خودکار، عکس دقیق، بارکدخوان USB و ورود دستی')),
        h('button',{type:'button',onClick:()=>callbacks.current.onClose?.(),className:'bhis-icon-button','aria-label':'بستن'},h(X,{size:22}))),
      h('div',{className:'bhis-scanner-video',style:{minHeight:220,maxHeight:'48dvh'}},h('video',{ref:video,playsInline:true,muted:true,autoPlay:true,style:{width:'100%',height:'100%',objectFit:'contain'}}),
        !error?h('div',{className:'bhis-scanner-frame',style:{pointerEvents:'none'}},h('span')):h('div',{className:'bhis-scanner-error',style:{background:'#020617eb'}},h(AlertTriangle,{size:35}),h('p',null,error))),
      h('div',{style:{padding:'10px 16px',fontSize:12,color:lastCode?'#6ee7b7':'#e2e8f0',background:'#1e293b',lineHeight:1.9},role:'status'},lastCode?h(CheckCircle2,{size:16,style:{display:'inline',marginLeft:6}}):null,status),
      h('div',{style:{display:'flex',gap:7,padding:'10px 14px',flexWrap:'wrap',background:'#f1f5f9',color:'#0f172a'}},
        B(capturing?'در حال تحلیل...':'اسکن دقیق از تصویر',capture,capturing),
        h('label',{className:'bhis-secondary-button',style:{cursor:'pointer',padding:'9px 11px',borderRadius:10,display:'inline-flex',gap:6,alignItems:'center'}},h(Upload,{size:16}),'انتخاب عکس / دوربین گوشی',h('input',{type:'file',ref:fileRef,accept:'image/*',capture:undefined,onChange:upload,style:{display:'none'}})),
        torchCap?B(torch?'خاموش‌کردن فلش':'روشن‌کردن فلش',toggleTorch):null,
        devices.length>1?h('select',{value:device,onChange:e=>setDevice(e.target.value),style:{border:'1px solid #94a3b8',borderRadius:8,fontSize:12,padding:8,maxWidth:190}},
          h('option',{value:''},'دوربین پیش‌فرض'),devices.map((d,i)=>h('option',{key:d.deviceId,value:d.deviceId},d.label||`دوربین ${i+1}`))):null),
      h('form',{onSubmit:submit,style:{display:'flex',gap:8,alignItems:'center',padding:'12px 15px',flexWrap:'wrap'}},
        h('input',{type:'text',autoComplete:'off',inputMode:'text',value:manual,onChange:e=>setManual(e.target.value),placeholder:'اسکن با بارکدخوان USB یا ورود دستی کد...',style:{flex:'1 1 170px',minWidth:0,borderRadius:9,padding:'10px',background:'white',color:'#0f172a',direction:'ltr'}}),
        h('button',{type:'submit',className:'bhis-primary-button',style:{padding:'10px 16px'}},'ثبت کد')),
      h('p',{style:{margin:'0 16px 12px',fontSize:11,color:'#cbd5e1'}},'برای گوشی، آدرس سامانه باید HTTPS باشد. دوربین را ثابت نگه دارید؛ ثبت خودکار فقط پس از تشخیص کد معتبر انجام می‌شود.')));
}
