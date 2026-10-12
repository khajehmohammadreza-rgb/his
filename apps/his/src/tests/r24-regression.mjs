/** Run with: node --experimental-default-type=module tests/r24-regression.mjs */
import assert from 'node:assert/strict';
import {CODE128_WIDTHS,decodeGrayLine,decodeCode128Runs,binaryRuns,decodeEanBits,validateEan,normalizeScannedCode} from '../app/utils/barcodeDecoder.js';
import {generateUniqueClinicBarcode,encodeCode128B} from '../app/utils/barcode.js';
import {WorkflowStatus,transitionEncounter440,stageForStatus440,returnEncounter440} from '../app/utils/workflow440.js';
import {ensureUnifiedEngineState,registerEncounter,updateEncounter,getEncounterForQueue} from '../app/core/unifiedEncounterEngine.js';
import {resolveWorkPlan,calculateAttendanceMetrics} from '../app/components/HrPayrollModule.js';
import {processProductsExcelImport} from '../app/utils/excelUtils.js';

const results=[];const test=(name,fn)=>{try{fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.stack||String(e)});}};
const makeImage=(s,scale=3,noise=0)=>{
 const bits='000000000000'+[...s].map((w,i)=>(i%2?'0':'1').repeat(+w*scale)).join('')+'000000000000';
 return Uint8Array.from(bits,(c,i)=>c==='1'?22+((i*7)%noise||0):235-((i*11)%noise||0));
};
test('Barcode Code128 B: 25 internal codes and 3 scales',()=>{
 for(let i=0;i<25;i++){
  const value=`BHS-INV-${String(20000+i)}`;
  const enc=encodeCode128B(value);
  for(const scale of [2,3,4])assert.equal(decodeGrayLine(makeImage(enc,scale,12)),value);
 }
});
test('Barcode normalization: Persian/Arabic digits and spaces',()=>assert.equal(normalizeScannedCode('  ۶۲۶ ١٢٣ '),'626123'));
test('Barcode code128 bad input rejected',()=>assert.equal(encodeCode128B('کد فارسی'),null));
test('EAN-13/checksum from pure signal',()=>{
 const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
 const G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
 const R=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
 const src='4006381333931';let bits='101'+['L','G','L','L','G','G'].map((v,i)=>(v==='L'?L:G)[+src[i+1]]).join('')+'01010'+src.slice(7).split('').map(c=>R[+c]).join('')+'101';
 assert.equal(decodeEanBits(bits),src);assert.equal(validateEan('4006381333932'),false);
 const enlarged='00000000'+[...bits].map(v=>v.repeat(3)).join('')+'00000000';
 assert.equal(decodeGrayLine(Uint8Array.from(enlarged,v=>v==='1'?0:255)),src);
});
test('Clinic barcode unique and never impersonates GS1 EAN',()=>{
 const b=generateUniqueClinicBarcode([{barcode:'BHS-DUPLICATE'}]);assert.ok(b.startsWith('BHS-'));assert.ok(encodeCode128B(b));
});
test('Excel procurement: missing barcode creates valid unique BHS Code128 labels',()=>{
 const rows=[{'کد کالا':'P-2','نام کالا':'نمونه آزمایشی ۱'},{'کد کالا':'P-3','نام کالا':'نمونه آزمایشی ۲'}];
 const imported=processProductsExcelImport(rows,[{id:'existing',code:'P-1',name:'قبلی',barcode:'BHS-EXIST1'}],[{id:'g',name:'عمومی'}],[{name:'انبار'}]);
 assert.equal(imported.createdCount,2);assert.equal(imported.autoBarcodesCount,2);
 const values=imported.updatedProducts.map(x=>x.barcode);
 assert.equal(new Set(values).size,3);
 for(const value of values){assert.ok(value.startsWith('BHS-'));assert.ok(encodeCode128B(value));}
});
test('Patient journey: create -> doctor -> nurse -> payment -> discharge',()=>{
 const doctor={id:'doc',role:'admin',name:'Test Admin'};
 let item={id:'q-a',patientId:'patient-a',patientName:'آزمایشی',status:WorkflowStatus.PATIENT_CONFIRMED,turnNumber:3,
   services:[{id:'svc-a',serviceId:'service-1',title:'ویزیت',quantity:1,unitPrice:100000,price:100000}],products:[],totalCost:100000,paidAmount:0};
 let state={patients:[{id:'patient-a',fullName:'آزمایشی',creditConfig:{enabled:true,currentDebt:0}}],products:[{id:'product-1',name:'سرنگ',stockQuantity:3}],visitQueue:[],encounters:[],transactions:[],billingDocuments:[],salesInvoices:[],settings:{}};
 state=registerEncounter(state,item,doctor);
 assert.equal(getEncounterForQueue(state,item.id).balance,100000);
 for(const stage of [WorkflowStatus.WAITING_DOCTOR,WorkflowStatus.UNDER_DOCTOR,WorkflowStatus.WAITING_NURSE,WorkflowStatus.NURSING,WorkflowStatus.READY_DISCHARGE]){
    item=transitionEncounter440(item,stage,doctor,{action:'test transition'});state=updateEncounter(state,item,doctor);
 }
 assert.equal(stageForStatus440(item.status),'discharge');
 item={...item,products:[{id:'p-line',productId:'product-1',title:'سرنگ',quantity:1,unitPrice:20000,price:20000}],totalCost:120000};
 state=updateEncounter(state,item,doctor);assert.equal(state.products[0].stockQuantity,2);
 state=updateEncounter(state,item,doctor);assert.equal(state.products[0].stockQuantity,2,'update must not double decrement');
 item={...item,paidAmount:120000,status:WorkflowStatus.DISCHARGED,paymentMethod:'card'};
 state=updateEncounter(state,item,doctor);
 assert.equal(getEncounterForQueue(state,item.id).balance,0);
 assert.ok(state.billingDocuments.some(doc=>doc.patientId==='patient-a'&&doc.balance===0));
 assert.equal(state.products[0].stockQuantity,2);
});
test('Patient flow prevents invalid updates to closed record',()=>{
 const actor={id:'a',name:'admin',role:'admin'};
 assert.throws(()=>transitionEncounter440({id:'q',status:'discharged'},'under_treatment',actor));
});
test('Staff journey: shift 8:00-16:00 (late 15min, early exit 10min)',()=>{
 const user={id:'u1',role:'nurse'};
 const p=resolveWorkPlan(user,'1405/07/19',[],[{enabled:true,scope:'center',startTime:'08:00',endTime:'16:00'}]);
 assert.equal(p.scheduledMinutes,480);
 const m=calculateAttendanceMetrics('08:15','15:50',p);
 assert.equal(m.actualMinutes,455);assert.equal(m.lateMinutes,15);assert.equal(m.earlyLeaveMinutes,10);
 assert.equal(m.shortageMinutes,25);assert.equal(m.systemOvertimeMinutes,0);
});
test('Staff overnight shift: 22:00-06:00 without negative or zero duration',()=>{
 const user={id:'u2',role:'secretary'};
 const p=resolveWorkPlan(user,'1405/07/19',[],[{enabled:true,scope:'center',startTime:'22:00',endTime:'06:00'}]);
 const m=calculateAttendanceMetrics('22:00','06:30',p);
 assert.equal(m.actualMinutes,510);assert.equal(m.systemOvertimeMinutes,30);assert.equal(m.shortageMinutes,0);
});
console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,tests:results},null,2));
if(results.some(x=>!x.pass))process.exitCode=1;
