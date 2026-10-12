/**
 * Bastiyan HIS barcode utilities - 4.5.7
 * Internal labels use CODE128 by default because it safely encodes clinic-owned IDs.
 */
import JsBarcode from '../../client-vendor/jsbarcode.js?b=r24-514-1405';
import {CODE128_WIDTHS,normalizeScannedCode} from './barcodeDecoder.js?b=r24-514-1405';

export function normalizeBarcode(value) {
  return normalizeScannedCode(value);
}

export function isLikelyEAN13(value) {
  const code = normalizeBarcode(value);
  if (!/^\d{13}$/.test(code)) return false;
  const body = code.slice(0, 12);
  return generateEAN13CheckDigit(body) === code.slice(12);
}

/** Always render a real SVG: do not silently accept the previous no-op vendor bridge. */
export function encodeCode128B(text){
  const s=normalizeBarcode(text);if(!s||!/^[\x20-\x7e]+$/.test(s))return null;
  const symbols=[104,...Array.from(s,c=>c.charCodeAt(0)-32)];
  let checksum=104;symbols.slice(1).forEach((val,i)=>checksum+=val*(i+1));
  symbols.push(checksum%103,106);
  return symbols.map(v=>CODE128_WIDTHS[v]).join('');
}
export function renderBarcode(element,code,options={}){
  const value=normalizeBarcode(code);
  if(!element||!value)return false;
  const svgNS='http://www.w3.org/2000/svg';
  const dims=encodeCode128B(value);
  if(!dims){element.textContent='';return false;}
  const w=Math.max(.8,Number(options.width)||1.5),height=Math.max(24,Number(options.height)||50),fontSize=Math.max(8,Number(options.fontSize)||12);
  const quiet=11*w;
  let total=0;for(const c of dims)total+=Number(c);
  const width=2*quiet+total*w,showText=options.displayValue!==false;
  const outHeight=height+(showText?fontSize+7:0);
  while(element.firstChild)element.removeChild(element.firstChild);
  element.setAttribute('xmlns',svgNS);element.setAttribute('viewBox',`0 0 ${width} ${outHeight}`);
  element.setAttribute('width',`${width}`);element.setAttribute('height',`${outHeight}`);
  const bg=document.createElementNS(svgNS,'rect');bg.setAttribute('width',`${width}`);bg.setAttribute('height',`${outHeight}`);bg.setAttribute('fill','#fff');element.appendChild(bg);
  let x=quiet;
  for(let i=0;i<dims.length;i++){
    const run=Number(dims[i])*w;
    if(i%2===0){const bar=document.createElementNS(svgNS,'rect');bar.setAttribute('x',String(x));bar.setAttribute('y','0');bar.setAttribute('width',String(run));bar.setAttribute('height',String(height));bar.setAttribute('fill','#111827');element.appendChild(bar);}
    x+=run;
  }
  if(showText){const label=document.createElementNS(svgNS,'text');label.setAttribute('x',String(width/2));label.setAttribute('y',String(height+fontSize+2));label.setAttribute('font-size',String(fontSize));label.setAttribute('text-anchor','middle');label.setAttribute('font-family','sans-serif');label.setAttribute('fill','#111827');label.textContent=value;element.appendChild(label);}
  return true;
}

export function generateEAN13CheckDigit(first12) {
  const code = String(first12 ?? '').replace(/\D/g, '').slice(0, 12);
  if (code.length !== 12) return '';
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(code[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

/**
 * Clinic IDs are INTERNAL CODE128 labels, not GS1-registered EAN-13/GTINs.
 * Existing imported EAN codes remain unchanged; only new labels get BHS- prefix.
 */
export function generateUniqueClinicBarcode(products=[],prefix='BHS'){
  const used=new Set((products||[]).map(p=>normalizeBarcode(p?.barcode)).filter(Boolean));
  const fixed=String(prefix||'BHS').replace(/[^A-Z0-9]/gi,'').toUpperCase().slice(0,8)||'BHS';
  // Keep IDs short enough for dense 40mm stock labels (a long Code128 is unreadable when shrunk).
  // Randomness is local; collision check protects IDs already assigned to this center.
  for(let i=0;i<200;i++){
    let rand='';
    if(typeof crypto!=='undefined'&&crypto.getRandomValues){
      const bytes=new Uint32Array(2);crypto.getRandomValues(bytes);
      rand=(bytes[0].toString(36).padStart(7,'0')+bytes[1].toString(36).padStart(7,'0')).slice(3,11).toUpperCase();
    } else rand=(Math.random().toString(36).slice(2)+'00000000').slice(0,8).toUpperCase();
    const code=`${fixed}-${rand}`;
    if(!used.has(code))return code;
  }
  throw new Error('Unable to allocate a unique local barcode');
}

export function generateBarcodeSvgString(code, options = {}) {
  const value = normalizeBarcode(code);
  if (!value || typeof document === 'undefined') return '';
  const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  renderBarcode(svgNode, value, { height: options.height || 40, width: options.width || 1.5, fontSize: options.fontSize || 12, format: options.format });
  return svgNode.outerHTML;
}
