import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Briefcase, Clock, Calculator, Calendar, FileText, Plus, Trash2, Edit3, Search, Printer, CreditCard, Building2, Download, Info, Sliders, Check, Send } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { getJalaliDateString, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
import { exportToExcel } from '../utils/excelUtils.js?b=r24-514-1405';

const h = React.createElement;
const uid = (p='id') => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const n = (v) => Number(v || 0);
const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
const fa = (v) => toPersianDigits(String(v ?? ''));
const money = (v) => `${fa(Math.round(n(v)).toLocaleString('en-US'))} تومان`;
const hoursText = (minutes) => `${fa((n(minutes)/60).toFixed(2))} ساعت`;
const minutesText = (minutes) => `${fa(Math.round(n(minutes)))} دقیقه`;
const dateMonth = (d) => String(d || '').slice(0,7);
const currentPeriod = () => dateMonth(getJalaliDateString());

const roleLabels = {
  admin:'مدیر کل', superadmin:'سوپر ادمین', accountant:'حسابدار', cashier:'صندوق‌دار',
  receptionist:'منشی / پذیرش', secretary:'منشی', nurse:'پرستار', doctor:'پزشک',
  inventory_manager:'انباردار', purchaser:'مسئول خرید', operating_room_supervisor:'مسئول اتاق عمل'
};

function timeToMinute(value){
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value||'').trim());
  if(!m) return null;
  const hh=Number(m[1]), mm=Number(m[2]);
  if(hh<0||hh>23||mm<0||mm>59) return null;
  return hh*60+mm;
}
function normalizeRange(startTime,endTime){
  const start=timeToMinute(startTime), rawEnd=timeToMinute(endTime);
  if(start===null||rawEnd===null) return null;
  const end=rawEnd<=start?rawEnd+1440:rawEnd;
  return {start,end,startTime,endTime,duration:end-start};
}
function actualInterval(clockIn,clockOut){
  const start=timeToMinute(clockIn), rawEnd=timeToMinute(clockOut);
  if(start===null||rawEnd===null) return null;
  return {start,end:rawEnd<start?rawEnd+1440:rawEnd};
}
function overlapMinutes(a,b){
  return Math.max(0,Math.min(a.end,b.end)-Math.max(a.start,b.start));
}
function rulePriority(scope){ return scope==='user'?3:scope==='role'?2:1; }

function resolveRecurringRule(user,workSchedules){
  const candidates=(workSchedules||[]).filter(r=>{
    if(r?.enabled===false) return false;
    if(r.scope==='user') return String(r.targetId||'')===String(user?.id||'');
    if(r.scope==='role') return String(r.targetId||'')===String(user?.role||'');
    return r.scope==='center';
  }).sort((a,b)=>rulePriority(b.scope)-rulePriority(a.scope)||(n(b.createdAtMs)-n(a.createdAtMs)));
  return candidates[0]||null;
}
export function resolveWorkPlan(user,date,shifts,workSchedules){
  const daily=(shifts||[]).filter(s=>String(s.userId)===String(user?.id)&&String(s.jalaliDate)===String(date)&&s.enabled!==false);
  const shiftRanges=daily.map(s=>normalizeRange(s.startTime,s.endTime)).filter(Boolean);
  if(shiftRanges.length){
    return {
      hasPlan:true, source:'shift', sourceLabel:'شیفت ثبت‌شده',
      ranges:shiftRanges, scheduledMinutes:shiftRanges.reduce((a,r)=>a+r.duration,0),
      title:daily.map(s=>s.shiftTitle||`${s.startTime} تا ${s.endTime}`).join(' + ')
    };
  }
  const rule=resolveRecurringRule(user,workSchedules);
  const range=rule?normalizeRange(rule.startTime,rule.endTime):null;
  if(rule&&range){
    const label=rule.scope==='user'?'ساعت کاری شخصی':rule.scope==='role'?'ساعت کاری سمت':'ساعت کاری مرکز';
    return {hasPlan:true,source:'rule',sourceLabel:label,ranges:[range],scheduledMinutes:range.duration,title:`${rule.startTime} تا ${rule.endTime}`,rule};
  }
  return {hasPlan:false,source:'free',sourceLabel:'بدون موظفی تعریف‌شده',ranges:[],scheduledMinutes:0,title:'کارکرد آزاد'};
}
export function calculateAttendanceMetrics(clockIn,clockOut,plan){
  const actual=actualInterval(clockIn,clockOut);
  if(!actual) return {
    actualMinutes:0, scheduledMinutes:plan?.scheduledMinutes||0, regularWorkedMinutes:0,
    shortageMinutes:0, lateMinutes:0, earlyLeaveMinutes:0, systemOvertimeMinutes:0
  };
  const actualMinutes=Math.max(0,actual.end-actual.start);
  if(!plan?.hasPlan){
    return {
      actualMinutes,scheduledMinutes:0,regularWorkedMinutes:actualMinutes,shortageMinutes:0,
      lateMinutes:0,earlyLeaveMinutes:0,systemOvertimeMinutes:0
    };
  }
  let regular=0;
  for(const r of plan.ranges) regular+=overlapMinutes(actual,r);
  regular=Math.min(actualMinutes,regular);
  const ranges=plan.ranges.slice().sort((a,b)=>a.start-b.start);
  const first=ranges[0], last=ranges[ranges.length-1];
  const late=first?clamp(actual.start-first.start,0,first.duration):0;
  const early=last?clamp(last.end-actual.end,0,last.duration):0;
  return {
    actualMinutes,
    scheduledMinutes:plan.scheduledMinutes,
    regularWorkedMinutes:regular,
    shortageMinutes:Math.max(0,plan.scheduledMinutes-regular),
    lateMinutes:late,
    earlyLeaveMinutes:early,
    systemOvertimeMinutes:Math.max(0,actualMinutes-regular)
  };
}
function userName(users,id){ return users.find(u=>String(u.id)===String(id))?.name || 'کاربر'; }
function Button({children,onClick,kind='primary',disabled=false,title=''}) {
  return h('button',{type:'button',onClick,disabled,title,className:`hrx-btn hrx-${kind}${disabled?' hrx-disabled':''}`},children);
}
function Field({label,children,help}) {
  return h('label',{className:'hrx-field'},[
    h('span',{className:'hrx-label',key:'l'},label),
    children,
    help?h('small',{className:'hrx-help',key:'h'},help):null
  ]);
}
function Stat({label,value,tone='normal',sub=''}) {
  return h('div',{className:`hrx-stat hrx-stat-${tone}`},[
    h('span',{key:'l'},label),
    h('strong',{key:'v'},value),
    sub?h('small',{key:'s'},sub):null
  ]);
}

export const HrPayrollModule = ({
  users=[], currentUser={}, settings={}, shifts=[], attendanceRecords=[], attendanceRequests=[],
  payrolls=[], staffAccounts=[], workSchedules=[], payrollAdjustments=[],
  onSaveShifts, onSaveAttendance, onSaveAttendanceRequests, onSavePayrolls,
  onSaveStaffAccounts, onSaveWorkSchedules, onSavePayrollAdjustments, onAddExpense
}) => {
  const role=String(currentUser?.role||'');
  const superOverride=typeof sessionStorage!=='undefined' &&
    (sessionStorage.getItem('bastiyan_superadmin_override')==='1'||sessionStorage.getItem('bastian_superadmin_override')==='1');
  const canManage=['admin','superadmin'].includes(role)||superOverride;
  const canPayroll=canManage||role==='accountant';

  const [tab,setTab]=useState('attendance');
  const [clockUserId,setClockUserId]=useState(currentUser?.id||users[0]?.id||'');
  const [recordFilter,setRecordFilter]=useState('all');
  const [period,setPeriod]=useState(currentPeriod());
  const [payrollUserId,setPayrollUserId]=useState(users[0]?.id||'');
  const [manualForm,setManualForm]=useState({userId:users[0]?.id||'',date:getJalaliDateString(),clockIn:'08:00',clockOut:'16:00',notes:''});
  const [shiftForm,setShiftForm]=useState({userId:users[0]?.id||'',date:getJalaliDateString(),startTime:'08:00',endTime:'16:00',title:'شیفت اختصاصی',notes:''});
  const [scheduleForm,setScheduleForm]=useState({scope:'center',targetId:'center',startTime:'08:00',endTime:'16:00',title:'ساعت کاری',enabled:true});
  const [accountEdit,setAccountEdit]=useState(null);
  const [adjustForm,setAdjustForm]=useState({userId:users[0]?.id||'',period:currentPeriod(),type:'bonus',title:'تشویقی',amount:'',notes:''});
  const [requestReason,setRequestReason]=useState('');
  const [externalPayments,setExternalPayments]=useState(()=>{
    try{return JSON.parse(localStorage.getItem('clinic_external_payroll_payments')||'[]')}catch{return []}
  });

  React.useEffect(()=>{try{localStorage.setItem('clinic_external_payroll_payments',JSON.stringify(externalPayments))}catch{}},[externalPayments]);
  const [externalForm,setExternalForm]=useState({fullName:'',taskDescription:'',amount:'',date:getJalaliDateString(),bankName:'',bankIban:''});
  const addExternalPayment=()=>{
    if(!canPayroll) return;
    if(!externalForm.fullName.trim()||n(externalForm.amount)<=0) return alert('نام دریافت‌کننده و مبلغ معتبر را وارد کنید.');
    const item={id:uid('extpay'),...externalForm,amount:n(externalForm.amount),createdAt:new Date().toISOString(),createdBy:currentUser?.name||''};
    setExternalPayments(v=>[item,...v]);
    onAddExpense?.({id:uid('exp-ext'),title:`پرداخت خارج از روال - ${item.fullName}`,category:'حقوق و دستمزد / پرداخت خارج از روال',
      expenseType:'salary',amount:item.amount,recipient:item.fullName,recipientRole:'خارج از پرسنل',paymentMethod:'bank_transfer',
      date:new Date().toISOString(),jalaliDate:item.date,recordedByUserName:currentUser?.name||'',notes:item.taskDescription});
    setExternalForm({fullName:'',taskDescription:'',amount:'',date:getJalaliDateString(),bankName:'',bankIban:''});
  };

  const getAccount=(userId)=>{
    const found=staffAccounts.find(a=>String(a.userId)===String(userId));
    const u=users.find(x=>String(x.id)===String(userId));
    return {
      userId, userName:u?.name||found?.userName||'کاربر',
      paymentModel:'hourly', baseSalary:0, hourlyRate:100000, overtimeHourlyRate:150000,
      shiftRate:0, housingAllowance:0, childAllowance:0, insuranceDeduction:0, taxDeduction:0,
      monthlyExpectedWorkDays:26, managerUserId:'', bankName:'', bankCardNumber:'', bankIban:'',
      ...(found||{})
    };
  };
  const saveAccount=(account)=>{
    const updated=staffAccounts.filter(a=>String(a.userId)!==String(account.userId));
    onSaveStaffAccounts?.([...updated,account]);
    setAccountEdit(null);
  };
  const canApproveUser=(userId)=>{
    if(canManage) return true;
    const acc=getAccount(userId);
    return String(acc.managerUserId||'')===String(currentUser?.id||'');
  };

  const currentClockUser=users.find(u=>String(u.id)===String(clockUserId))||currentUser;
  const visibleClockUsers=canManage?users:users.filter(u=>String(u.id)===String(currentUser?.id));
  const today=getJalaliDateString();

  const registerEntry=()=>{
    const uidv=String(clockUserId||currentUser?.id||'');
    if(!uidv) return alert('کاربر انتخاب نشده است.');
    const open=attendanceRecords.find(r=>String(r.userId)===uidv&&!r.clockOut);
    if(open) return alert(`برای ${userName(users,uidv)} یک ورود باز از ساعت ${open.clockIn} وجود دارد. ابتدا خروج را ثبت کنید.`);
    const now=new Date(), time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const u=users.find(x=>String(x.id)===uidv)||currentUser;
    const plan=resolveWorkPlan(u,today,shifts,workSchedules);
    const rec={
      id:uid('att'),userId:uidv,userName:u?.name||'کاربر',userRole:u?.role||'',
      jalaliDate:today,isoDate:now.toISOString().slice(0,10),clockIn:time,clockOut:'',
      status:'open',source:'live_clock',scheduleSource:plan.source,scheduleLabel:plan.sourceLabel,
      scheduleTitle:plan.title,scheduledMinutes:plan.scheduledMinutes,
      actualMinutes:0,regularWorkedMinutes:0,shortageMinutes:0,lateMinutes:0,earlyLeaveMinutes:0,
      systemOvertimeMinutes:0,approvedOvertimeMinutes:0,overtimeApprovalStatus:'none',
      createdByUserId:currentUser?.id||'',createdByUserName:currentUser?.name||'',createdAt:new Date().toISOString()
    };
    onSaveAttendance?.([rec,...attendanceRecords]);
  };
  const registerExit=()=>{
    const uidv=String(clockUserId||currentUser?.id||'');
    const open=attendanceRecords.find(r=>String(r.userId)===uidv&&!r.clockOut);
    if(!open) return alert(`برای ${userName(users,uidv)} ورود بازی وجود ندارد.`);
    if(open.createdAt&&Date.now()-new Date(open.createdAt).getTime()>36*3600000) return alert('این ورود بیش از ۳۶ ساعت باز مانده است؛ برای جلوگیری از محاسبه نادرست، از اصلاح تردد توسط مدیر استفاده کنید.');
    const now=new Date(), out=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const u=users.find(x=>String(x.id)===uidv)||currentUser;
    const plan=resolveWorkPlan(u,open.jalaliDate,shifts,workSchedules);
    const m=calculateAttendanceMetrics(open.clockIn,out,plan);
    const next={
      ...open,clockOut:out,status:'closed',...m,scheduleSource:plan.source,scheduleLabel:plan.sourceLabel,
      scheduleTitle:plan.title,workedHours:Number((m.actualMinutes/60).toFixed(2)),
      overtimeHours:Number((m.systemOvertimeMinutes/60).toFixed(2)),
      overtimeApprovalStatus:m.systemOvertimeMinutes>0&&plan.hasPlan?'pending':'none',
      closedAt:new Date().toISOString()
    };
    onSaveAttendance?.(attendanceRecords.map(r=>r.id===open.id?next:r));
  };

  const addManualAttendance=()=>{
    if(!canManage) return;
    const u=users.find(x=>String(x.id)===String(manualForm.userId));
    if(!u||!manualForm.clockIn||!manualForm.clockOut) return alert('اطلاعات تردد کامل نیست.');
    const plan=resolveWorkPlan(u,manualForm.date,shifts,workSchedules);
    const m=calculateAttendanceMetrics(manualForm.clockIn,manualForm.clockOut,plan);
    const rec={
      id:uid('att-manual'),userId:u.id,userName:u.name,userRole:u.role,jalaliDate:manualForm.date,
      isoDate:new Date().toISOString().slice(0,10),clockIn:manualForm.clockIn,clockOut:manualForm.clockOut,
      status:'closed',source:'manager_manual',...m,scheduleSource:plan.source,scheduleLabel:plan.sourceLabel,scheduleTitle:plan.title,
      workedHours:Number((m.actualMinutes/60).toFixed(2)),overtimeHours:Number((m.systemOvertimeMinutes/60).toFixed(2)),
      approvedOvertimeMinutes:0,overtimeApprovalStatus:m.systemOvertimeMinutes>0&&plan.hasPlan?'pending':'none',
      notes:manualForm.notes,approvedBy:currentUser?.name||'',createdAt:new Date().toISOString()
    };
    onSaveAttendance?.([rec,...attendanceRecords]);
  };

  const approveOvertime=(rec,approve)=>{
    if(!canApproveUser(rec.userId)) return alert('تایید اضافه‌کار فقط توسط مدیر مسئول یا مدیر کل مجاز است.');
    let minutes=0;
    if(approve){
      const answer=prompt(`اضافه‌کار سیستمی: ${Math.round(n(rec.systemOvertimeMinutes))} دقیقه\nچند دقیقه تایید می‌شود؟`,String(Math.round(n(rec.systemOvertimeMinutes))));
      if(answer===null) return;
      minutes=clamp(Number(answer)||0,0,n(rec.systemOvertimeMinutes));
    }
    const updated=attendanceRecords.map(r=>r.id===rec.id?{
      ...r,approvedOvertimeMinutes:minutes,overtimeApprovalStatus:approve?'approved':'rejected',
      overtimeReviewedByUserId:currentUser?.id||'',overtimeReviewedByUserName:currentUser?.name||'',
      overtimeReviewedAt:new Date().toISOString()
    }:r);
    onSaveAttendance?.(updated);
  };

  const addShift=()=>{
    if(!canManage) return;
    const u=users.find(x=>String(x.id)===String(shiftForm.userId));
    if(!u) return;
    const range=normalizeRange(shiftForm.startTime,shiftForm.endTime);
    if(!range) return alert('ساعت شیفت معتبر نیست.');
    const item={
      id:uid('shift'),userId:u.id,userName:u.name,userRole:u.role,jalaliDate:shiftForm.date,
      startTime:shiftForm.startTime,endTime:shiftForm.endTime,shiftTitle:shiftForm.title||'شیفت اختصاصی',
      notes:shiftForm.notes,enabled:true,createdAt:new Date().toISOString(),createdBy:currentUser?.name||''
    };
    onSaveShifts?.([item,...shifts]);
  };
  const addSchedule=()=>{
    if(!canManage) return;
    const range=normalizeRange(scheduleForm.startTime,scheduleForm.endTime);
    if(!range) return alert('ساعت کاری معتبر نیست.');
    let targetId=scheduleForm.targetId,targetName='کل مرکز';
    if(scheduleForm.scope==='user'){
      const u=users.find(x=>String(x.id)===String(targetId)); if(!u)return alert('پرسنل انتخاب نشده است.'); targetName=u.name;
    } else if(scheduleForm.scope==='role'){
      targetName=roleLabels[targetId]||targetId;
    } else targetId='center';
    const item={
      id:uid('wrk'),scope:scheduleForm.scope,targetId,targetName,title:scheduleForm.title||'ساعت کاری',
      startTime:scheduleForm.startTime,endTime:scheduleForm.endTime,enabled:true,
      createdAt:new Date().toISOString(),createdAtMs:Date.now(),createdBy:currentUser?.name||''
    };
    onSaveWorkSchedules?.([item,...workSchedules]);
  };

  const addAdjustment=()=>{
    if(!canPayroll) return;
    if(!adjustForm.userId||!n(adjustForm.amount)) return alert('پرسنل و مبلغ را مشخص کنید.');
    const u=users.find(x=>String(x.id)===String(adjustForm.userId));
    const item={
      id:uid('adj'),userId:adjustForm.userId,userName:u?.name||'کاربر',period:adjustForm.period||currentPeriod(),
      type:adjustForm.type,title:adjustForm.title||'تعدیل حقوق',amount:Math.abs(n(adjustForm.amount)),
      notes:adjustForm.notes,status:canManage?'approved':'pending',
      createdByUserId:currentUser?.id||'',createdByUserName:currentUser?.name||'',createdAt:new Date().toISOString()
    };
    onSavePayrollAdjustments?.([item,...payrollAdjustments]);
    setAdjustForm(v=>({...v,amount:'',notes:''}));
  };
  const reviewAdjustment=(id,status)=>{
    if(!canManage) return;
    onSavePayrollAdjustments?.(payrollAdjustments.map(a=>a.id===id?{...a,status,reviewedBy:currentUser?.name||'',reviewedAt:new Date().toISOString()}:a));
  };

  const attendanceByPeriod=(userId,p)=>{
    return attendanceRecords.filter(r=>String(r.userId)===String(userId)&&dateMonth(r.jalaliDate)===p&&r.clockIn&&r.clockOut);
  };

  const computePayrollStats=(userId,p)=>{
    const u=users.find(x=>String(x.id)===String(userId))||{};
    const acc=getAccount(userId);
    const rows=attendanceByPeriod(userId,p);
    const byDate={};
    rows.forEach(r=>{(byDate[r.jalaliDate] ||= []).push(r)});
    const dates=Object.keys(byDate);
    let actual=0,regular=0,systemOt=0,approvedOt=0,late=0,early=0,shortage=0,plannedCovered=0;
    dates.forEach(date=>{
      const plan=resolveWorkPlan(u,date,shifts,workSchedules);
      let dayActual=0,dayRegular=0,dayApproved=0;
      const intervals=byDate[date];
      intervals.forEach(r=>{
        const mm=calculateAttendanceMetrics(r.clockIn,r.clockOut,plan);
        dayActual+=mm.actualMinutes; dayRegular+=mm.regularWorkedMinutes;
        systemOt+=mm.systemOvertimeMinutes;
        dayApproved+=r.overtimeApprovalStatus==='approved'?n(r.approvedOvertimeMinutes):0;
      });
      if(plan.hasPlan){
        dayRegular=Math.min(dayRegular,plan.scheduledMinutes);
        plannedCovered+=plan.scheduledMinutes;
        shortage+=Math.max(0,plan.scheduledMinutes-dayRegular);
        const starts=intervals.map(r=>actualInterval(r.clockIn,r.clockOut)).filter(Boolean);
        if(starts.length&&plan.ranges.length){
          const firstIn=Math.min(...starts.map(x=>x.start)), lastOut=Math.max(...starts.map(x=>x.end));
          const sorted=plan.ranges.slice().sort((a,b)=>a.start-b.start);
          late+=clamp(firstIn-sorted[0].start,0,sorted[0].duration);
          early+=clamp(sorted[sorted.length-1].end-lastOut,0,sorted[sorted.length-1].duration);
        }
      }
      actual+=dayActual; regular+=plan.hasPlan?dayRegular:dayActual; approvedOt+=dayApproved;
    });

    const monthShifts=shifts.filter(s=>String(s.userId)===String(userId)&&dateMonth(s.jalaliDate)===p&&s.enabled!==false);
    let expected=0,expectedDays=0,planMode='free';
    if(monthShifts.length){
      expected=monthShifts.reduce((sum,s)=>sum+n(normalizeRange(s.startTime,s.endTime)?.duration),0);
      expectedDays=new Set(monthShifts.map(s=>s.jalaliDate)).size; planMode='shift';
      const missing=Math.max(0,expected-plannedCovered);
      shortage+=missing;
    } else {
      const rule=resolveRecurringRule(u,workSchedules);
      const rr=rule?normalizeRange(rule.startTime,rule.endTime):null;
      if(rr){
        expectedDays=Math.max(0,n(acc.monthlyExpectedWorkDays||26));
        expected=rr.duration*expectedDays; planMode='rule';
        const representedDays=dates.filter(d=>resolveWorkPlan(u,d,shifts,workSchedules).hasPlan).length;
        const missingDays=Math.max(0,expectedDays-representedDays);
        shortage+=missingDays*rr.duration;
      } else {
        expected=actual;expectedDays=dates.length;planMode='free';
      }
    }
    shortage=Math.min(shortage,expected);
    const approvedAdjs=payrollAdjustments.filter(a=>String(a.userId)===String(userId)&&a.period===p&&a.status==='approved');
    const bonus=approvedAdjs.filter(a=>['bonus','allowance'].includes(a.type)).reduce((s,a)=>s+n(a.amount),0);
    const manualDeduction=approvedAdjs.filter(a=>['penalty','deduction'].includes(a.type)).reduce((s,a)=>s+n(a.amount),0);
    const pendingAdjustments=payrollAdjustments.filter(a=>String(a.userId)===String(userId)&&a.period===p&&a.status==='pending').length;
    const shortageDeduction=(shortage/60)*n(acc.hourlyRate);
    const overtimePay=(approvedOt/60)*n(acc.overtimeHourlyRate||acc.hourlyRate);
    let baseEntitlement=0;
    if(acc.paymentModel==='monthly_fixed') baseEntitlement=n(acc.baseSalary);
    else if(acc.paymentModel==='shift_based') baseEntitlement=Math.max(0,expectedDays)*n(acc.shiftRate);
    else if(acc.paymentModel==='hybrid') baseEntitlement=n(acc.baseSalary)+(expected/60)*n(acc.hourlyRate);
    else baseEntitlement=(expected/60)*n(acc.hourlyRate);
    const allowances=n(acc.housingAllowance)+n(acc.childAllowance);
    const grossBeforeDeductions=baseEntitlement+overtimePay+allowances+bonus;
    const fixedDeductions=n(acc.insuranceDeduction)+n(acc.taxDeduction)+n(acc.currentAdvanceDebt);
    const totalDeductions=shortageDeduction+manualDeduction+fixedDeductions;
    const net=Math.max(0,grossBeforeDeductions-totalDeductions);
    const absenceDays=Math.max(0,expectedDays-dates.length);
    return {
      user:u,account:acc,rows,expectedMinutes:expected,expectedDays,absenceDays,actualMinutes:actual,regularMinutes:regular,
      shortageMinutes:shortage,lateMinutes:late,earlyLeaveMinutes:early,systemOvertimeMinutes:systemOt,
      approvedOvertimeMinutes:approvedOt,unapprovedOvertimeMinutes:Math.max(0,systemOt-approvedOt),
      bonus,manualDeduction,pendingAdjustments,shortageDeduction,overtimePay,baseEntitlement,allowances,
      fixedDeductions,grossBeforeDeductions,totalDeductions,net,planMode
    };
  };

  const stats=computePayrollStats(payrollUserId,period);

  const issuePayroll=()=>{
    if(!canPayroll) return;
    if(!payrollUserId) return alert('پرسنل انتخاب نشده است.');
    if(stats.pendingAdjustments>0) return alert('تعدیلات تاییدنشده برای این دوره وجود دارد. ابتدا تعیین تکلیف کنید.');
    const pendingOt=attendanceByPeriod(payrollUserId,period).some(r=>n(r.systemOvertimeMinutes)>0&&r.overtimeApprovalStatus==='pending');
    if(pendingOt&&!confirm('برای این شخص اضافه‌کار سیستمی تاییدنشده وجود دارد. فیش بدون محاسبه آن صادر شود؟')) return;
    const p={
      id:uid('pay'),payrollNumber:`PAY-${Date.now().toString().slice(-7)}`,userId:payrollUserId,
      userName:stats.user?.name||'کاربر',userRole:stats.user?.role||'',period,monthJalali:period,
      jalaliDate:getJalaliDateString(),expectedMinutes:stats.expectedMinutes,actualMinutes:stats.actualMinutes,
      payableRegularMinutes:Math.max(0,stats.expectedMinutes-stats.shortageMinutes),
      lateMinutes:stats.lateMinutes,earlyLeaveMinutes:stats.earlyLeaveMinutes,absenceDays:stats.absenceDays,shortageMinutes:stats.shortageMinutes,
      systemOvertimeMinutes:stats.systemOvertimeMinutes,approvedOvertimeMinutes:stats.approvedOvertimeMinutes,
      baseEntitlement:stats.baseEntitlement,shortageDeducted:Math.round(stats.shortageDeduction),
      overtimePaid:Math.round(stats.overtimePay),allowancesPaid:Math.round(stats.allowances),bonusesPaid:Math.round(stats.bonus),
      manualDeductions:Math.round(stats.manualDeduction),fixedDeductions:Math.round(stats.fixedDeductions),
      grossPay:Math.round(stats.grossBeforeDeductions),totalDeductions:Math.round(stats.totalDeductions),
      netPayable:Math.round(stats.net),paymentStatus:'issued',recordedByUserName:currentUser?.name||'',
      createdAt:new Date().toISOString(),notes:'محاسبه خودکار از تردد، موظفی، تایید اضافه‌کار و تعدیلات حقوق'
    };
    onSavePayrolls?.([p,...payrolls]);
  };

  const markPayrollPaid=(pay)=>{
    if(!canPayroll||pay.paymentStatus==='paid') return;
    const updated=payrolls.map(p=>p.id===pay.id?{...p,paymentStatus:'paid',paymentDate:getJalaliDateString(),paidBy:currentUser?.name||''}:p);
    onSavePayrolls?.(updated);
    onAddExpense?.({
      id:uid('exp-salary'),title:`پرداخت حقوق - ${pay.userName} - ${pay.period}`,category:'حقوق و دستمزد پرسنل',
      expenseType:'salary',amount:n(pay.netPayable),recipient:pay.userName,recipientRole:pay.userRole,
      paymentMethod:'bank_transfer',date:new Date().toISOString(),jalaliDate:getJalaliDateString(),
      recordedByUserName:currentUser?.name||'',notes:`فیش ${pay.payrollNumber}`
    });
  };

  const submitAttendanceRequest=()=>{
    if(!requestReason.trim()) return alert('علت درخواست را وارد کنید.');
    const item={id:uid('attreq'),userId:currentUser?.id,userName:currentUser?.name,userRole:currentUser?.role,
      jalaliDate:today,requestType:'attendance_correction',reason:requestReason,status:'pending',createdAt:new Date().toISOString()};
    onSaveAttendanceRequests?.([item,...attendanceRequests]); setRequestReason('');
  };

  const reviewRequest=(req,status)=>{
    if(!canApproveUser(req.userId)) return;
    onSaveAttendanceRequests?.(attendanceRequests.map(r=>r.id===req.id?{...r,status,reviewedByUserName:currentUser?.name,reviewedAt:new Date().toISOString()}:r));
  };

  const filteredRecords=attendanceRecords
    .filter(r=>recordFilter==='all'||String(r.userId)===String(recordFilter))
    .slice().sort((a,b)=>String(b.jalaliDate||'').localeCompare(String(a.jalaliDate||''))||String(b.clockIn||'').localeCompare(String(a.clockIn||'')));

  const accountCards=users.filter(u=>!['patient'].includes(u.role||'')).map(u=>{
    const a=getAccount(u.id);
    return h('div',{className:'hrx-card',key:u.id},[
      h('div',{className:'hrx-card-head',key:'h'},[
        h('div',null,[h('strong',null,u.name),h('small',null,roleLabels[u.role]||u.role||'پرسنل')]),
        canPayroll?Button({kind:'ghost',onClick:()=>setAccountEdit({...a}),children:h(Edit3,{size:15})}):null
      ]),
      h('div',{className:'hrx-mini-grid',key:'g'},[
        h('span',null,['مدل پرداخت',h('b',null,a.paymentModel==='hourly'?'ساعتی':a.paymentModel==='monthly_fixed'?'ثابت ماهانه':a.paymentModel==='shift_based'?'شیفتی':'ترکیبی')]),
        h('span',null,['نرخ ساعتی',h('b',null,money(a.hourlyRate))]),
        h('span',null,['نرخ اضافه‌کار',h('b',null,money(a.overtimeHourlyRate))]),
        h('span',null,['روز موظفی ماه',h('b',null,fa(a.monthlyExpectedWorkDays))])
      ])
    ]);
  });

  const tabs=[
    ['attendance','ورود و خروج',Clock],
    ['schedules','موظفی و شیفت',Calendar],
    ['accounts','حساب پرسنل',CreditCard],
    ['adjustments','تشویقی و کسورات',Sliders],
    ['payroll','محاسبه حقوق',Calculator],
    ['payslips','فیش‌های حقوقی',FileText],
    ['requests','درخواست‌ها',Send],
    ['external','پرداخت خارج از روال',Briefcase],
    ['bank','خروجی بانکی',Building2]
  ];

  const header=h('div',{className:'hrx-hero'},[
    h('div',{key:'title'},[
      h('div',{className:'hrx-title'},[h(Briefcase,{size:26}),h('div',null,[h('h1',null,'مدیریت کارکرد، حضور و غیاب و حقوق'),h('p',null,'یکپارچه با شیفت، ساعت کاری، تایمکس، تایید اضافه‌کار، کسری کار و فیش حقوق')])]),
    ]),
    h('div',{className:'hrx-clock-box',key:'clock'},[
      h('select',{value:clockUserId,onChange:e=>setClockUserId(e.target.value),disabled:!canManage},visibleClockUsers.map(u=>h('option',{key:u.id,value:u.id},u.name))),
      Button({kind:'success',onClick:registerEntry,children:'ثبت ورود'}),
      Button({kind:'danger',onClick:registerExit,children:'ثبت خروج'})
    ])
  ]);

  const nav=h('div',{className:'hrx-tabs'},tabs.map(([id,label,Icon])=>h('button',{
    type:'button',key:id,onClick:()=>setTab(id),className:`hrx-tab${tab===id?' active':''}`
  },[h(Icon,{size:16,key:'i'}),h('span',{key:'t'},label)])));

  let body=null;

  if(tab==='attendance'){
    body=h('div',{className:'hrx-stack'},[
      h('div',{className:'hrx-grid hrx-grid-4',key:'stats'},[
        Stat({label:'ورودهای باز',value:fa(attendanceRecords.filter(r=>!r.clockOut).length),tone:'warning'}),
        Stat({label:'اضافه‌کار در انتظار تایید',value:minutesText(attendanceRecords.filter(r=>r.overtimeApprovalStatus==='pending').reduce((s,r)=>s+n(r.systemOvertimeMinutes),0)),tone:'warning'}),
        Stat({label:'کل کسرکار ثبت‌شده',value:minutesText(attendanceRecords.reduce((s,r)=>s+n(r.shortageMinutes),0)),tone:'danger'}),
        Stat({label:'اضافه‌کار تاییدشده',value:minutesText(attendanceRecords.reduce((s,r)=>s+n(r.approvedOvertimeMinutes),0)),tone:'success'})
      ]),
      canManage?h('section',{className:'hrx-panel',key:'manual'},[
        h('div',{className:'hrx-panel-title'},[h('h3',null,'ثبت دستی تردد توسط مدیر'),h('p',null,'برای اصلاح یا ثبت موردی؛ محاسبات موظفی و اضافه‌کار خودکار انجام می‌شود.')]),
        h('div',{className:'hrx-form-grid'},[
          Field({label:'پرسنل',children:h('select',{value:manualForm.userId,onChange:e=>setManualForm({...manualForm,userId:e.target.value})},users.map(u=>h('option',{value:u.id,key:u.id},u.name)))}),
          Field({label:'تاریخ',children:h('input',{value:manualForm.date,onChange:e=>setManualForm({...manualForm,date:e.target.value})})}),
          Field({label:'ساعت ورود',children:h('input',{type:'time',value:manualForm.clockIn,onChange:e=>setManualForm({...manualForm,clockIn:e.target.value})})}),
          Field({label:'ساعت خروج',children:h('input',{type:'time',value:manualForm.clockOut,onChange:e=>setManualForm({...manualForm,clockOut:e.target.value})})}),
          Field({label:'توضیحات',children:h('input',{value:manualForm.notes,onChange:e=>setManualForm({...manualForm,notes:e.target.value})})}),
          h('div',{className:'hrx-field hrx-action-field'},Button({onClick:addManualAttendance,children:'ثبت تردد و محاسبه'}))
        ])
      ]):null,
      h('section',{className:'hrx-panel',key:'table'},[
        h('div',{className:'hrx-toolbar'},[
          h('div',{className:'hrx-panel-title'},[h('h3',null,'ریز ورود و خروج و محاسبات'),h('p',null,'اضافه‌کار خارج از موظفی تا قبل از تایید مدیر وارد مبلغ حقوق نمی‌شود.')]),
          h('select',{value:recordFilter,onChange:e=>setRecordFilter(e.target.value)},[
            h('option',{value:'all',key:'all'},'همه پرسنل'),...users.map(u=>h('option',{value:u.id,key:u.id},u.name))
          ])
        ]),
        h('div',{className:'hrx-table-wrap'},h('table',{className:'hrx-table'},[
          h('thead',null,h('tr',null,['پرسنل','تاریخ','ورود','خروج','مبنای موظفی','کارکرد واقعی','تأخیر','تعجیل','کسرکار','اضافه‌کار سیستمی','تاییدشده','وضعیت'].map(x=>h('th',{key:x},x)))),
          h('tbody',null,filteredRecords.map(r=>h('tr',{key:r.id},[
            h('td',null,r.userName),h('td',null,fa(r.jalaliDate)),h('td',null,fa(r.clockIn||'—')),h('td',null,fa(r.clockOut||'باز')),
            h('td',null,r.scheduleLabel||'—'),h('td',null,hoursText(r.actualMinutes||n(r.workedHours)*60)),
            h('td',{className:n(r.lateMinutes)>0?'hrx-bad':''},minutesText(r.lateMinutes)),
            h('td',{className:n(r.earlyLeaveMinutes)>0?'hrx-bad':''},minutesText(r.earlyLeaveMinutes)),
            h('td',{className:n(r.shortageMinutes)>0?'hrx-bad':''},minutesText(r.shortageMinutes)),
            h('td',{className:n(r.systemOvertimeMinutes)>0?'hrx-warn':''},minutesText(r.systemOvertimeMinutes)),
            h('td',{className:n(r.approvedOvertimeMinutes)>0?'hrx-good':''},minutesText(r.approvedOvertimeMinutes)),
            h('td',null,n(r.systemOvertimeMinutes)>0&&r.overtimeApprovalStatus==='pending'&&canApproveUser(r.userId)
              ?h('div',{className:'hrx-inline'},[
                Button({kind:'success',onClick:()=>approveOvertime(r,true),children:'تایید'}),
                Button({kind:'danger',onClick:()=>approveOvertime(r,false),children:'رد'})
              ])
              :h('span',{className:`hrx-pill ${r.overtimeApprovalStatus||'none'}`},r.status==='open'?'ورود باز':r.overtimeApprovalStatus==='approved'?'اضافه‌کار تایید':r.overtimeApprovalStatus==='rejected'?'اضافه‌کار رد':r.overtimeApprovalStatus==='pending'?'منتظر مدیر':'عادی'))
          ])))
        ]))
      ])
    ]);
  }

  if(tab==='schedules'){
    body=h('div',{className:'hrx-stack'},[
      canManage?h('section',{className:'hrx-panel'},[
        h('div',{className:'hrx-panel-title'},[h('h3',null,'تعریف ساعت کاری پایه'),h('p',null,'اولویت محاسبه: شیفت تاریخ‌دار ← ساعت شخص ← ساعت سمت ← ساعت مرکز. اگر هیچ‌کدام نباشد تمام ورود تا خروج کارکرد محسوب می‌شود.')]),
        h('div',{className:'hrx-form-grid'},[
          Field({label:'سطح',children:h('select',{value:scheduleForm.scope,onChange:e=>setScheduleForm({...scheduleForm,scope:e.target.value,targetId:e.target.value==='center'?'center':e.target.value==='user'?(users[0]?.id||''):(users[0]?.role||'receptionist')})},[
            h('option',{value:'center'},'کل مرکز'),h('option',{value:'role'},'سمت / نقش'),h('option',{value:'user'},'شخص')
          ])}),
          scheduleForm.scope==='user'?Field({label:'پرسنل',children:h('select',{value:scheduleForm.targetId,onChange:e=>setScheduleForm({...scheduleForm,targetId:e.target.value})},users.map(u=>h('option',{value:u.id,key:u.id},u.name)))}):null,
          scheduleForm.scope==='role'?Field({label:'سمت',children:h('select',{value:scheduleForm.targetId,onChange:e=>setScheduleForm({...scheduleForm,targetId:e.target.value})},Array.from(new Set(users.map(u=>u.role).filter(Boolean))).map(r=>h('option',{value:r,key:r},roleLabels[r]||r)))}):null,
          Field({label:'از ساعت',children:h('input',{type:'time',value:scheduleForm.startTime,onChange:e=>setScheduleForm({...scheduleForm,startTime:e.target.value})})}),
          Field({label:'تا ساعت',children:h('input',{type:'time',value:scheduleForm.endTime,onChange:e=>setScheduleForm({...scheduleForm,endTime:e.target.value})})}),
          Field({label:'عنوان',children:h('input',{value:scheduleForm.title,onChange:e=>setScheduleForm({...scheduleForm,title:e.target.value})})}),
          h('div',{className:'hrx-field hrx-action-field'},Button({onClick:addSchedule,children:'ثبت ساعت کاری'}))
        ])
      ]):null,
      h('section',{className:'hrx-panel'},[
        h('div',{className:'hrx-panel-title'},[h('h3',null,'قواعد ساعت کاری'),h('p',null,'قواعد پایین‌تر فقط وقتی اعمال می‌شوند که قاعده با اولویت بالاتر وجود نداشته باشد.')]),
        h('div',{className:'hrx-card-grid'},workSchedules.map(r=>h('div',{className:'hrx-card',key:r.id},[
          h('div',{className:'hrx-card-head'},[h('div',null,[h('strong',null,r.targetName||'مرکز'),h('small',null,r.scope==='user'?'شخصی':r.scope==='role'?'سمت':'مرکز')]),
            canManage?Button({kind:'danger',onClick:()=>onSaveWorkSchedules?.(workSchedules.filter(x=>x.id!==r.id)),children:h(Trash2,{size:14})}):null]),
          h('div',{className:'hrx-rule-time'},`${fa(r.startTime)} — ${fa(r.endTime)}`),h('small',null,r.title||'ساعت کاری')
        ])))
      ]),
      canManage?h('section',{className:'hrx-panel'},[
        h('div',{className:'hrx-panel-title'},[h('h3',null,'شیفت تاریخ‌دار'),h('p',null,'شیفت تاریخ‌دار برای همان روز بالاترین اولویت را در موظفی دارد.')]),
        h('div',{className:'hrx-form-grid'},[
          Field({label:'پرسنل',children:h('select',{value:shiftForm.userId,onChange:e=>setShiftForm({...shiftForm,userId:e.target.value})},users.map(u=>h('option',{value:u.id,key:u.id},u.name)))}),
          Field({label:'تاریخ',children:h('input',{value:shiftForm.date,onChange:e=>setShiftForm({...shiftForm,date:e.target.value})})}),
          Field({label:'شروع',children:h('input',{type:'time',value:shiftForm.startTime,onChange:e=>setShiftForm({...shiftForm,startTime:e.target.value})})}),
          Field({label:'پایان',children:h('input',{type:'time',value:shiftForm.endTime,onChange:e=>setShiftForm({...shiftForm,endTime:e.target.value})})}),
          Field({label:'عنوان',children:h('input',{value:shiftForm.title,onChange:e=>setShiftForm({...shiftForm,title:e.target.value})})}),
          h('div',{className:'hrx-field hrx-action-field'},Button({onClick:addShift,children:'ثبت شیفت'}))
        ]),
        h('div',{className:'hrx-table-wrap'},h('table',{className:'hrx-table'},[
          h('thead',null,h('tr',null,['پرسنل','تاریخ','شروع','پایان','عنوان','عملیات'].map(x=>h('th',{key:x},x)))),
          h('tbody',null,shifts.slice().sort((a,b)=>String(b.jalaliDate).localeCompare(String(a.jalaliDate))).map(s=>h('tr',{key:s.id},[
            h('td',null,s.userName||userName(users,s.userId)),h('td',null,fa(s.jalaliDate)),h('td',null,fa(s.startTime)),h('td',null,fa(s.endTime)),h('td',null,s.shiftTitle||'شیفت'),
            h('td',null,Button({kind:'danger',onClick:()=>onSaveShifts?.(shifts.filter(x=>x.id!==s.id)),children:'حذف'}))
          ])))
        ]))
      ]):null
    ]);
  }

  if(tab==='accounts'){
    body=h('div',{className:'hrx-stack'},[
      h('section',{className:'hrx-panel'},[
        h('div',{className:'hrx-panel-title'},[h('h3',null,'پروفایل مالی و موظفی پرسنل'),h('p',null,'نرخ ساعتی مبنای محاسبه کارکرد و کسرکار است؛ مدیر مستقیم، تایید اضافه‌کار سیستمی را انجام می‌دهد.')]),
        h('div',{className:'hrx-card-grid'},accountCards)
      ]),
      accountEdit?h('section',{className:'hrx-panel hrx-editor'},[
        h('div',{className:'hrx-panel-title'},[h('h3',null,`ویرایش حساب ${accountEdit.userName}`)]),
        h('div',{className:'hrx-form-grid'},[
          Field({label:'مدل پرداخت',children:h('select',{value:accountEdit.paymentModel,onChange:e=>setAccountEdit({...accountEdit,paymentModel:e.target.value})},[
            h('option',{value:'hourly'},'ساعتی'),h('option',{value:'monthly_fixed'},'ثابت ماهانه'),h('option',{value:'shift_based'},'شیفتی'),h('option',{value:'hybrid'},'ترکیبی')
          ])}),
          Field({label:'حقوق پایه ماهانه',children:h('input',{type:'number',value:accountEdit.baseSalary,onChange:e=>setAccountEdit({...accountEdit,baseSalary:n(e.target.value)})})}),
          Field({label:'نرخ هر ساعت',children:h('input',{type:'number',value:accountEdit.hourlyRate,onChange:e=>setAccountEdit({...accountEdit,hourlyRate:n(e.target.value)})})}),
          Field({label:'نرخ اضافه‌کار تاییدشده',children:h('input',{type:'number',value:accountEdit.overtimeHourlyRate,onChange:e=>setAccountEdit({...accountEdit,overtimeHourlyRate:n(e.target.value)})})}),
          Field({label:'حق هر شیفت',children:h('input',{type:'number',value:accountEdit.shiftRate,onChange:e=>setAccountEdit({...accountEdit,shiftRate:n(e.target.value)})})}),
          Field({label:'روز موظفی ماه (برای ساعت کاری ثابت)',children:h('input',{type:'number',min:0,max:31,value:accountEdit.monthlyExpectedWorkDays,onChange:e=>setAccountEdit({...accountEdit,monthlyExpectedWorkDays:n(e.target.value)})})}),
          Field({label:'مدیر مستقیم',children:h('select',{value:accountEdit.managerUserId||'',onChange:e=>setAccountEdit({...accountEdit,managerUserId:e.target.value})},[
            h('option',{value:''},'فقط مدیر کل'),...users.filter(u=>String(u.id)!==String(accountEdit.userId)).map(u=>h('option',{value:u.id,key:u.id},u.name))
          ])}),
          Field({label:'بیمه کسرشونده',children:h('input',{type:'number',value:accountEdit.insuranceDeduction,onChange:e=>setAccountEdit({...accountEdit,insuranceDeduction:n(e.target.value)})})}),
          Field({label:'مالیات',children:h('input',{type:'number',value:accountEdit.taxDeduction,onChange:e=>setAccountEdit({...accountEdit,taxDeduction:n(e.target.value)})})}),
          Field({label:'حق مسکن/مزایا',children:h('input',{type:'number',value:accountEdit.housingAllowance,onChange:e=>setAccountEdit({...accountEdit,housingAllowance:n(e.target.value)})})}),
          Field({label:'حق اولاد',children:h('input',{type:'number',value:accountEdit.childAllowance,onChange:e=>setAccountEdit({...accountEdit,childAllowance:n(e.target.value)})})}),
          Field({label:'مانده مساعده/وام',children:h('input',{type:'number',value:accountEdit.currentAdvanceDebt,onChange:e=>setAccountEdit({...accountEdit,currentAdvanceDebt:n(e.target.value)})})})
        ]),
        h('div',{className:'hrx-inline'},[
          Button({onClick:()=>saveAccount(accountEdit),children:'ذخیره حساب پرسنل'}),
          Button({kind:'ghost',onClick:()=>setAccountEdit(null),children:'انصراف'})
        ])
      ]):null
    ]);
  }

  if(tab==='adjustments'){
    body=h('div',{className:'hrx-stack'},[
      canPayroll?h('section',{className:'hrx-panel'},[
        h('div',{className:'hrx-panel-title'},[h('h3',null,'تشویقی، پاداش و کسورات دستی'),h('p',null,'تعدیلات غیرسیستمی در فیش حقوق همان دوره نمایش داده می‌شود.')]),
        h('div',{className:'hrx-form-grid'},[
          Field({label:'پرسنل',children:h('select',{value:adjustForm.userId,onChange:e=>setAdjustForm({...adjustForm,userId:e.target.value})},users.map(u=>h('option',{value:u.id,key:u.id},u.name)))}),
          Field({label:'دوره',children:h('input',{value:adjustForm.period,onChange:e=>setAdjustForm({...adjustForm,period:e.target.value}),placeholder:'1405/01'})}),
          Field({label:'نوع',children:h('select',{value:adjustForm.type,onChange:e=>setAdjustForm({...adjustForm,type:e.target.value})},[
            h('option',{value:'bonus'},'تشویقی / پاداش'),h('option',{value:'allowance'},'مزایا'),h('option',{value:'penalty'},'جریمه'),h('option',{value:'deduction'},'کسری دستی')
          ])}),
          Field({label:'عنوان',children:h('input',{value:adjustForm.title,onChange:e=>setAdjustForm({...adjustForm,title:e.target.value})})}),
          Field({label:'مبلغ',children:h('input',{type:'number',value:adjustForm.amount,onChange:e=>setAdjustForm({...adjustForm,amount:e.target.value})})}),
          Field({label:'توضیح',children:h('input',{value:adjustForm.notes,onChange:e=>setAdjustForm({...adjustForm,notes:e.target.value})})}),
          h('div',{className:'hrx-field hrx-action-field'},Button({onClick:addAdjustment,children:'ثبت تعدیل'}))
        ])
      ]):null,
      h('section',{className:'hrx-panel'},[
        h('div',{className:'hrx-table-wrap'},h('table',{className:'hrx-table'},[
          h('thead',null,h('tr',null,['پرسنل','دوره','نوع','عنوان','مبلغ','وضعیت','عملیات'].map(x=>h('th',{key:x},x)))),
          h('tbody',null,payrollAdjustments.map(a=>h('tr',{key:a.id},[
            h('td',null,a.userName),h('td',null,fa(a.period)),h('td',null,a.type==='bonus'?'تشویقی':a.type==='allowance'?'مزایا':a.type==='penalty'?'جریمه':'کسری'),
            h('td',null,a.title),h('td',null,money(a.amount)),h('td',null,h('span',{className:`hrx-pill ${a.status}`},a.status==='approved'?'تایید':a.status==='rejected'?'رد':'در انتظار')),
            h('td',null,a.status==='pending'&&canManage?h('div',{className:'hrx-inline'},[
              Button({kind:'success',onClick:()=>reviewAdjustment(a.id,'approved'),children:'تایید'}),
              Button({kind:'danger',onClick:()=>reviewAdjustment(a.id,'rejected'),children:'رد'})
            ]):null)
          ])))
        ]))
      ])
    ]);
  }

  if(tab==='payroll'){
    body=h('div',{className:'hrx-stack'},[
      h('section',{className:'hrx-panel'},[
        h('div',{className:'hrx-toolbar'},[
          h('div',{className:'hrx-panel-title'},[h('h3',null,'محاسبه هوشمند حقوق'),h('p',null,'تمام ارقام از تردد، موظفی، تایید مدیر و پروفایل مالی محاسبه می‌شوند.')]),
          h('div',{className:'hrx-inline'},[
            h('select',{value:payrollUserId,onChange:e=>setPayrollUserId(e.target.value)},users.map(u=>h('option',{value:u.id,key:u.id},u.name))),
            h('input',{value:period,onChange:e=>setPeriod(e.target.value),className:'hrx-period',placeholder:'1405/01'})
          ])
        ]),
        h('div',{className:'hrx-grid hrx-grid-4'},[
          Stat({label:'موظفی دوره',value:hoursText(stats.expectedMinutes),sub:`${fa(stats.expectedDays)} روز`}),
          Stat({label:'کارکرد واقعی',value:hoursText(stats.actualMinutes)}),
          Stat({label:'کسرکار',value:hoursText(stats.shortageMinutes),tone:stats.shortageMinutes?'danger':'normal',sub:`تأخیر ${minutesText(stats.lateMinutes)} | تعجیل ${minutesText(stats.earlyLeaveMinutes)} | غیبت ${fa(stats.absenceDays)} روز`}),
          Stat({label:'اضافه‌کار سیستمی',value:hoursText(stats.systemOvertimeMinutes),tone:stats.unapprovedOvertimeMinutes?'warning':'success',sub:`تایید مدیر: ${hoursText(stats.approvedOvertimeMinutes)}`})
        ]),
        h('div',{className:'hrx-pay-grid'},[
          h('div',{className:'hrx-pay-card good'},[
            h('h4',null,'اقلام دریافتی'),
            h('p',null,['استحقاق پایه',h('b',null,money(stats.baseEntitlement))]),
            h('p',null,['اضافه‌کار تاییدشده',h('b',null,money(stats.overtimePay))]),
            h('p',null,['مزایای ثابت',h('b',null,money(stats.allowances))]),
            h('p',null,['تشویقی/مزایای دستی',h('b',null,money(stats.bonus))]),
            h('strong',null,['ناخالص: ',money(stats.grossBeforeDeductions)])
          ]),
          h('div',{className:'hrx-pay-card bad'},[
            h('h4',null,'کسورات'),
            h('p',null,['کسرکار ناشی از تاخیر/تعجیل/غیبت',h('b',null,money(stats.shortageDeduction))]),
            h('p',null,['کسورات دستی/جریمه',h('b',null,money(stats.manualDeduction))]),
            h('p',null,['بیمه/مالیات/مساعده',h('b',null,money(stats.fixedDeductions))]),
            h('strong',null,['جمع کسورات: ',money(stats.totalDeductions)])
          ])
        ]),
        h('div',{className:'hrx-net'},[
          h('div',null,[h('span',null,'خالص قابل پرداخت'),h('strong',null,money(stats.net))]),
          canPayroll?Button({kind:'success',onClick:issuePayroll,children:'صدور فیش حقوق'}):null
        ])
      ])
    ]);
  }

  if(tab==='payslips'){
    body=h('section',{className:'hrx-panel'},[
      h('div',{className:'hrx-panel-title'},[h('h3',null,'فیش‌های حقوقی حرفه‌ای'),h('p',null,'ثبت پرداخت از صدور فیش جداست و فقط پس از پرداخت در هزینه‌های حسابداری اعمال می‌شود.')]),
      h('div',{className:'hrx-table-wrap'},h('table',{className:'hrx-table'},[
        h('thead',null,h('tr',null,['کد','پرسنل','دوره','موظفی','واقعی','تاخیر','تعجیل','غیبت','کسرکار','اضافه‌کار سیستمی','اضافه‌کار رسمی/تاییدشده','تشویقی','کسورات','خالص','وضعیت','عملیات'].map(x=>h('th',{key:x},x)))),
        h('tbody',null,payrolls.map(p=>h('tr',{key:p.id},[
          h('td',null,p.payrollNumber),h('td',null,p.userName),h('td',null,fa(p.period||p.monthJalali)),
          h('td',null,hoursText(p.expectedMinutes)),h('td',null,hoursText(p.actualMinutes)),
          h('td',null,minutesText(p.lateMinutes)),h('td',null,minutesText(p.earlyLeaveMinutes)),h('td',null,`${fa(p.absenceDays||0)} روز`),h('td',{className:'hrx-bad'},minutesText(p.shortageMinutes)),
          h('td',{className:'hrx-warn'},minutesText(p.systemOvertimeMinutes)),h('td',{className:'hrx-good'},minutesText(p.approvedOvertimeMinutes)),
          h('td',null,money(p.bonusesPaid)),h('td',null,money(p.totalDeductions)),h('td',{className:'hrx-good'},money(p.netPayable)),
          h('td',null,h('span',{className:`hrx-pill ${p.paymentStatus}`},p.paymentStatus==='paid'?'پرداخت شده':'صادر شده')),
          h('td',null,p.paymentStatus!=='paid'&&canPayroll?Button({kind:'success',onClick:()=>markPayrollPaid(p),children:'ثبت پرداخت'}):null)
        ])))
      ]))
    ]);
  }

  if(tab==='requests'){
    body=h('div',{className:'hrx-stack'},[
      h('section',{className:'hrx-panel'},[
        h('div',{className:'hrx-panel-title'},[h('h3',null,'درخواست اصلاح تردد'),h('p',null,'درخواست‌های فراموشی یا اصلاح تایمکس برای مدیر ارسال می‌شوند.')]),
        h('div',{className:'hrx-inline'},[
          h('input',{value:requestReason,onChange:e=>setRequestReason(e.target.value),placeholder:'علت درخواست...',className:'hrx-grow'}),
          Button({onClick:submitAttendanceRequest,children:'ارسال درخواست'})
        ])
      ]),
      h('section',{className:'hrx-panel'},[
        h('div',{className:'hrx-table-wrap'},h('table',{className:'hrx-table'},[
          h('thead',null,h('tr',null,['پرسنل','تاریخ','شرح','وضعیت','عملیات'].map(x=>h('th',{key:x},x)))),
          h('tbody',null,attendanceRequests.map(r=>h('tr',{key:r.id},[
            h('td',null,r.userName),h('td',null,fa(r.jalaliDate)),h('td',null,r.reason),h('td',null,r.status),
            h('td',null,r.status==='pending'&&canApproveUser(r.userId)?h('div',{className:'hrx-inline'},[
              Button({kind:'success',onClick:()=>reviewRequest(r,'approved'),children:'تایید'}),
              Button({kind:'danger',onClick:()=>reviewRequest(r,'rejected'),children:'رد'})
            ]):null)
          ])))
        ]))
      ])
    ]);
  }

  if(tab==='external'){
    body=h('div',{className:'hrx-stack'},[
      h('section',{className:'hrx-panel'},[
        h('div',{className:'hrx-panel-title'},[h('h3',null,'پرداخت‌های خارج از روال پرسنلی'),h('p',null,'حق‌الزحمه پیمانکار، نیروی موقت یا شخص خارج از لیست پرسنل؛ مستقیماً در هزینه‌های حسابداری ثبت می‌شود.')]),
        canPayroll?h('div',{className:'hrx-form-grid'},[
          Field({label:'نام و نام خانوادگی',children:h('input',{value:externalForm.fullName,onChange:e=>setExternalForm({...externalForm,fullName:e.target.value})})}),
          Field({label:'شرح کار / علت پرداخت',children:h('input',{value:externalForm.taskDescription,onChange:e=>setExternalForm({...externalForm,taskDescription:e.target.value})})}),
          Field({label:'مبلغ',children:h('input',{type:'number',value:externalForm.amount,onChange:e=>setExternalForm({...externalForm,amount:e.target.value})})}),
          Field({label:'تاریخ',children:h('input',{value:externalForm.date,onChange:e=>setExternalForm({...externalForm,date:e.target.value})})}),
          Field({label:'بانک',children:h('input',{value:externalForm.bankName,onChange:e=>setExternalForm({...externalForm,bankName:e.target.value})})}),
          Field({label:'شماره شبا',children:h('input',{value:externalForm.bankIban,onChange:e=>setExternalForm({...externalForm,bankIban:e.target.value})})}),
          h('div',{className:'hrx-field hrx-action-field'},Button({onClick:addExternalPayment,children:'ثبت پرداخت خارج از روال'}))
        ]):null
      ]),
      h('section',{className:'hrx-panel'},[
        h('div',{className:'hrx-table-wrap'},h('table',{className:'hrx-table'},[
          h('thead',null,h('tr',null,['نام','تاریخ','شرح','بانک/شبا','مبلغ','عملیات'].map(x=>h('th',{key:x},x)))),
          h('tbody',null,externalPayments.map(e=>h('tr',{key:e.id},[
            h('td',null,e.fullName),h('td',null,fa(e.date)),h('td',null,e.taskDescription||'—'),
            h('td',null,`${e.bankName||'—'} / ${e.bankIban||'—'}`),h('td',{className:'hrx-good'},money(e.amount)),
            h('td',null,canPayroll?Button({kind:'danger',onClick:()=>setExternalPayments(v=>v.filter(x=>x.id!==e.id)),children:'حذف'}):null)
          ])))
        ]))
      ])
    ]);
  }

  if(tab==='bank'){
    const staffRows=payrolls.filter(p=>p.paymentStatus==='paid'&&(period?String(p.period||p.monthJalali)===period:true)).map(p=>{
      const a=getAccount(p.userId);
      return {نام:p.userName,دوره:p.period||p.monthJalali,نوع:'پرسنل',بانک:a.bankName||'',کارت:a.bankCardNumber||'',شبا:a.bankIban||'',مبلغ:p.netPayable,کد_فیش:p.payrollNumber};
    });
    const externalRows=externalPayments.filter(e=>!period||dateMonth(e.date)===period).map(e=>({نام:e.fullName,دوره:dateMonth(e.date),نوع:'خارج از روال',بانک:e.bankName||'',کارت:'',شبا:e.bankIban||'',مبلغ:e.amount,کد_فیش:e.id}));
    const rows=[...staffRows,...externalRows];
    body=h('section',{className:'hrx-panel'},[
      h('div',{className:'hrx-toolbar'},[
        h('div',{className:'hrx-panel-title'},[h('h3',null,'شیت پرداخت بانکی'),h('p',null,'فقط فیش‌هایی که «ثبت پرداخت» شده‌اند در خروجی بانکی می‌آیند.')]),
        Button({kind:'ghost',onClick:()=>exportToExcel(rows,`حقوق_${period||'همه'}`),disabled:!rows.length,children:h('span',{className:'hrx-inline'},[h(Download,{size:15}), 'خروجی اکسل'])})
      ]),
      h('div',{className:'hrx-grid hrx-grid-3'},[
        Stat({label:'تعداد پرداخت',value:fa(rows.length)}),
        Stat({label:'جمع پرداختی',value:money(rows.reduce((s,r)=>s+n(r['مبلغ']),0)),tone:'success'}),
        Stat({label:'دوره',value:fa(period)})
      ])
    ]);
  }

  return h('div',{className:'hrx-root',dir:'rtl'},[header,nav,body]);
};

export default HrPayrollModule;
