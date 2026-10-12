/** Bastiyan R24: offline CODE128/EAN decoding without browser BarcodeDetector dependency. */
export const CODE128_WIDTHS = ["212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412", "211214", "211232", "2331112"];
const STARTS = [103,104,105];
const num = v=>Number(v)||0;
export function normalizeScannedCode(value){
  return String(value??'').trim().replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/\s+/g,'');
}
export function validateEan(code){
  const v=normalizeScannedCode(code);
  if(!/^\d{8}$|^\d{13}$/.test(v)) return false;
  let s=0;
  for(let i=v.length-2,weight=3;i>=0;i--,weight=weight===3?1:3)s+=num(v[i])*weight;
  return (10-s%10)%10===num(v.at(-1));
}
const patternWidths = CODE128_WIDTHS.map(p=>p.split('').map(Number));
function matchWidths(runs,off,code,tolerance=1.48){
  const src=patternWidths[code]; if(off+src.length>runs.length) return Infinity;
  let sum=0,tot=0;
  for(let j=0;j<src.length;j++){sum+=runs[off+j].len; tot+=src[j];}
  const scale=sum/tot; if(scale<.8)return Infinity;
  let err=0;
  for(let j=0;j<src.length;j++){
    const w=runs[off+j].len/scale;
    err+=Math.abs(w-src[j]);
    if(Math.abs(w-src[j])>tolerance)return Infinity;
  }
  return err/src.length;
}
function chooseSymbol(runs,idx,limit=.72){
  let best=-1,bestErr=limit;
  for(let i=0;i<=106;i++){
    if(i===106&&idx+7>runs.length)continue;
    if(i!==106&&idx+6>runs.length)continue;
    const e=matchWidths(runs,idx,i);
    if(e<bestErr){bestErr=e;best=i;}
  }
  return best;
}
function decodeValues(values){
  if(values.length<4||!STARTS.includes(values[0])||values.at(-1)!==106)return null;
  const check=values.at(-2),body=values.slice(1,-2);
  let total=values[0];body.forEach((v,i)=>total+=v*(i+1));
  if(total%103!==check)return null;
  let set=values[0]===105?'C':values[0]===104?'B':'A',shift=false,out='';
  for(const v of body){
    if(v===102||v===96||v===97)continue; // FNC: not user-visible
    if(v===98&&set!=='C'){shift=true;continue;}
    if(v===99){set='C';continue;}
    if(v===100&&set!=='B'){set='B';continue;}
    if(v===101&&set!=='A'){set='A';continue;}
    if(v>95)return null;
    const cur=shift?(set==='A'?'B':'A'):set;shift=false;
    if(cur==='C')out+=String(v).padStart(2,'0');
    else if(cur==='B')out+=String.fromCharCode(v+32);
    else out+=String.fromCharCode(v<64?v+32:v-64);
  }
  return out&&/^[\x20-\x7E]+$/.test(out)?out:null;
}
export function decodeCode128Runs(runs){
  for(let at=0;at<runs.length-25;at++){
    if(!runs[at].bit||((at>0)&&runs[at-1].bit))continue;
    const start=STARTS.find(x=>matchWidths(runs,at,x)<.5);
    if(start==null)continue;
    const vals=[start];let i=at+6;
    while(i<runs.length-6&&vals.length<130){
      const v=chooseSymbol(runs,i);
      if(v<0)break;
      vals.push(v);i+=v===106?7:6;
      if(v===106){const value=decodeValues(vals);if(value)return value;break;}
    }
  }
  return null;
}
export function binaryRuns(bits){
  const a=[];if(!bits.length)return a;
  let first=bits[0],start=0;
  for(let i=1;i<=bits.length;i++)if(i===bits.length||bits[i]!==first){a.push({bit:first,len:i-start,start});first=bits[i];start=i;}
  return a;
}
const EAN_L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const EAN_G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const EAN_R=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const EAN_P=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
function hamming(a,b){let x=0;for(let i=0;i<a.length;i++)x+=(a[i]!==b[i])?1:0;return x;}
function eanDigit(bits,table,maxErr=0){let idx=-1,err=maxErr+.001;for(let i=0;i<table.length;i++){let v=hamming(bits,table[i]);if(v<err){idx=i;err=v;}}return idx;}
export function decodeEanBits(bits){
  if(bits.length===95&&bits.slice(0,3)==='101'&&bits.slice(45,50)==='01010'&&bits.slice(92)==='101'){
    let p='',s='';for(let i=0;i<6;i++){let x=bits.slice(3+i*7,10+i*7),v=eanDigit(x,EAN_L);if(v>=0){p+='L';s+=v;continue;}v=eanDigit(x,EAN_G);if(v<0)return null;p+='G';s+=v;}
    const first=EAN_P.indexOf(p);if(first<0)return null;
    let code=first+s;for(let i=0;i<6;i++){const v=eanDigit(bits.slice(50+i*7,57+i*7),EAN_R);if(v<0)return null;code+=v;}
    return validateEan(code)?code:null;
  }
  if(bits.length===67&&bits.slice(0,3)==='101'&&bits.slice(31,36)==='01010'&&bits.slice(64)==='101'){
    let code='';for(let i=0;i<4;i++){let d=eanDigit(bits.slice(3+i*7,10+i*7),EAN_L);if(d<0)return null;code+=d;}
    for(let i=0;i<4;i++){let d=eanDigit(bits.slice(36+i*7,43+i*7),EAN_R);if(d<0)return null;code+=d;}
    return validateEan(code)?code:null;
  }
  return null;
}
export function decodeGrayLine(gray){
  if(!gray||gray.length<90)return null;
  let mn=255,mx=0;for(let i=0;i<gray.length;i++){mn=Math.min(mn,gray[i]);mx=Math.max(mx,gray[i]);}
  if(mx-mn<28)return null;
  for(const off of [-24,-10,0,10,24]){
    const t=Math.max(12,Math.min(245,(mn+mx)/2+off));
    for(const inverted of [false,true]){
      const bits=Uint8Array.from(gray,v=>(v<t)!==inverted?1:0);
      const runs=binaryRuns(bits);
      if(!inverted){
        const code=decodeCode128Runs(runs);if(code)return code;
      }
      for(let k=0;k<runs.length-32;k++){
        if(runs[k].bit!==1||runs[k+1].bit!==0||runs[k+2].bit!==1)continue;
        const m=(runs[k].len+runs[k+1].len+runs[k+2].len)/3;
        if(m<1||[runs[k],runs[k+1],runs[k+2]].some(r=>Math.abs(r.len/m-1)>.55))continue;
        for(const count of [95,67])for(const factor of [.94,.98,1,1.02,1.06]){
          const unit=m*factor,begin=runs[k].start;
          if(begin+unit*count>=bits.length)continue;
          let s='';for(let z=0;z<count;z++){const at=Math.min(bits.length-1,Math.floor(begin+(z+.5)*unit));s+=bits[at]?'1':'0';}
          const v=decodeEanBits(s);if(v)return v;
        }
      }
    }
  }
  return null;
}
export function decodeCanvasImage(source,{deep=false}={}){
  const width=source.width||source.videoWidth,height=source.height||source.videoHeight;
  if(!width||!height)return null;
  const canvas=document.createElement('canvas');const ratio=Math.min(1, (deep?2200:1280)/width);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return null;
  ctx.drawImage(source,0,0,canvas.width,canvas.height);
  const rows=deep?[.14,.21,.28,.35,.42,.5,.58,.65,.72,.79,.86]:[.3,.4,.5,.6,.7];
  for(const row of rows){
    const y=Math.max(0,Math.min(canvas.height-1,Math.round(canvas.height*row)));
    const data=ctx.getImageData(0,y,canvas.width,1).data;
    const gray=new Uint8Array(canvas.width);
    for(let i=0,j=0;i<gray.length;i++,j+=4)gray[i]=Math.round(.299*data[j]+.587*data[j+1]+.114*data[j+2]);
    const code=decodeGrayLine(gray);if(code)return code;
    if(deep){const reversed=gray.slice().reverse();const other=decodeGrayLine(reversed);if(other)return other;}
  }
  // Rotated mobile photos (portrait/landscape mismatch): inspect vertical sections too.
  if(deep){
    for(const column of [.18,.27,.36,.45,.5,.55,.64,.73,.82]){
      const x=Math.max(0,Math.min(canvas.width-1,Math.round(canvas.width*column)));
      const data=ctx.getImageData(x,0,1,canvas.height).data;
      const gray=new Uint8Array(canvas.height);
      for(let i=0,j=0;i<gray.length;i++,j+=4)gray[i]=Math.round(.299*data[j]+.587*data[j+1]+.114*data[j+2]);
      const code=decodeGrayLine(gray)||decodeGrayLine(gray.slice().reverse());
      if(code)return code;
    }
  }
  return null;
}
