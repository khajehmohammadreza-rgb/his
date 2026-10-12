import {getJalaliDateString} from './jalali.js?b=r24-514-1405';

const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const key=v=>String(v??'').trim();
const clamp=(v,min=0,max=100)=>Math.min(max,Math.max(min,num(v,0)));
function inRange(date,from,to){const x=key(date);return (!from||x>=key(from))&&(!to||x<=key(to))}
function itemPrice(item={}){return num(item.price??item.tariffPrice??item.salesPrice??item.unitPrice,0)}
function itemKind(item={}){return item.kind==='product'||item.type==='product'||item.itemKind==='product'?'product':'service'}
function itemType(item={}){return key(item.serviceType||item.type||item.serviceGroup||'')}
function categoryId(item={}){return key(item.categoryId||item.serviceCategoryId||item.productCategoryId||'')}

function normalizeShares(source={},fallback={}){
  const patient=clamp(source.patientSharePercent??fallback.patientSharePercent??100);
  const insurer=clamp(source.insurerSharePercent??fallback.insurerSharePercent??0);
  let difference=source.differencePercent;
  if(difference===undefined||difference===null||difference==='') difference=Math.max(0,100-patient-insurer);
  difference=clamp(difference);
  const sum=patient+insurer+difference;
  if(sum>100&&sum>0){
    const ratio=100/sum;
    return {patient:patient*ratio,insurer:insurer*ratio,difference:difference*ratio,differenceAction:source.differenceAction||fallback.differenceAction||'patient'};
  }
  return {patient,insurer,difference,differenceAction:source.differenceAction||fallback.differenceAction||'patient'};
}

function findActiveContract(catalog,insurerId,contractId,date){
  const contracts=(catalog.contracts||[]).filter(x=>key(x.insurerId)===key(insurerId));
  if(contractId){
    const selected=contracts.find(x=>key(x.id)===key(contractId));
    return selected&&selected.active!==false&&inRange(date,selected.validFrom,selected.validTo)?selected:null;
  }
  return contracts.find(x=>x.active!==false&&inRange(date,x.validFrom,x.validTo))||null;
}

function findGroupRule(contract,item){
  const rules=Array.isArray(contract?.groupRules)?contract.groupRules:[];
  const kind=itemKind(item), type=itemType(item), cat=categoryId(item);
  const candidates=rules.filter(r=>r&&r.active!==false&&(
    (r.scope==='kind'&&key(r.targetId)===kind)||
    (r.scope==='type'&&type&&key(r.targetId)===type)||
    (r.scope==='category'&&cat&&key(r.targetId)===cat)
  ));
  candidates.sort((a,b)=>{
    const pr=x=>x.scope==='category'?3:x.scope==='type'?2:1;
    return pr(b)-pr(a);
  });
  return candidates[0]||null;
}

function findOverride(catalog,insurerId,contract,item){
  const kind=itemKind(item);
  const id=key(item.id||item.serviceId||item.productId);
  return (catalog.tariffs||[]).find(x=>x.active!==false&&key(x.insurerId)===key(insurerId)&&
    (!contract||!x.contractId||key(x.contractId)===key(contract.id))&&
    key(x.itemKind||'service')===kind&&key(x.serviceId||x.itemId)===id) || null;
}

function resolveWithProvider({catalog,providerId,contractId,item,date,visited=[]}){
  const insurer=(catalog.insurers||[]).find(x=>x.active!==false&&key(x.id)===key(providerId));
  if(!insurer)return null;
  const contract=findActiveContract(catalog,insurer.id,contractId,date);
  const override=findOverride(catalog,insurer.id,contract,item);
  if(override?.coverageMode==='free') return {forcedFree:true,reason:'service_override_free',insurerId:insurer.id,insurerName:insurer.name};
  if(override?.coverageMode==='other_insurer'&&override.overrideInsurerId){
    const token=`${insurer.id}:${key(item.id)}`;
    if(visited.includes(token))return null;
    return resolveWithProvider({catalog,providerId:override.overrideInsurerId,contractId:override.overrideContractId||'',item,date,visited:[...visited,token]});
  }
  const groupRule=findGroupRule(contract,item);
  if(groupRule?.coverageMode==='free') return {forcedFree:true,reason:'group_rule_free',insurerId:insurer.id,insurerName:insurer.name};
  if(!contract&&!override)return null;

  const original=itemPrice(item);
  const insuredTariff=num(override?.insuredTariff,original);
  const baseTariff=num(override?.baseTariff,original);
  const ceiling=num(override?.ceilingAmount,contract?.ceilingAmount||0);
  let coveredBase=Math.min(original,insuredTariff||original,baseTariff||original);
  if(ceiling>0)coveredBase=Math.min(coveredBase,ceiling);

  const shares=normalizeShares(override?.coverageMode==='custom'?override:(groupRule?.coverageMode==='custom'?groupRule:{}),contract||{});
  let patientShare=coveredBase*shares.patient/100;
  let insurerShare=coveredBase*shares.insurer/100;
  let discountShare=0;
  let differenceAmount=coveredBase*shares.difference/100;
  if(shares.differenceAction==='insurer')insurerShare+=differenceAmount;
  else if(shares.differenceAction==='discount')discountShare+=differenceAmount;
  else patientShare+=differenceAmount;

  const fixedPatient=num(override?.patientFixedAmount,0);
  const fixedInsurer=num(override?.insurerFixedAmount,0);
  patientShare+=fixedPatient;
  insurerShare+=fixedInsurer;
  const deductible=num(contract?.franchiseAmount,0);
  patientShare+=deductible;
  const allocated=Math.min(coveredBase,patientShare+insurerShare+discountShare);
  if(allocated<coveredBase)patientShare+=coveredBase-allocated;
  patientShare=Math.max(0,Math.min(original,patientShare));
  insurerShare=Math.max(0,Math.min(original-patientShare,insurerShare));
  discountShare=Math.max(0,Math.min(original-patientShare-insurerShare,discountShare));
  const uncovered=Math.max(0,original-coveredBase);
  patientShare+=uncovered;
  const patientPayable=Math.max(0,original-insurerShare-discountShare);

  return {
    insurerId:insurer.id,insurerName:insurer.name,
    contractId:contract?.id||'',contractTitle:contract?.title||'',
    overrideId:override?.id||'',groupRuleId:groupRule?.id||'',
    itemKind:itemKind(item),itemId:key(item.id),
    originalTotal:original,coveredBase,
    patientShare,insurerShare,discountShare,differenceAmount,
    differenceAction:shares.differenceAction,patientPayable,
    percentages:{patient:shares.patient,insurer:shares.insurer,difference:shares.difference},
    requirements:{requiresReferral:Boolean(contract?.requiresReferral),requiresApproval:Boolean(contract?.requiresApproval)},
    maxVisits:num(contract?.maxVisits,0),forcedFree:false
  };
}

export function resolveInsuranceCoverage({settings={},patient={},service={},item=null,date=getJalaliDateString()}={}){
  const target=item||service||{};
  const ins=patient?.insuranceProviderId?{providerId:patient.insuranceProviderId,contractId:patient.insuranceContractId,isOther:false}:patient?.insurance||{};
  if(!ins?.providerId||ins.isOther||ins.providerId==='other')return null;
  const catalog=settings.insuranceCatalog||{};
  const result=resolveWithProvider({catalog,providerId:ins.providerId,contractId:ins.contractId,item:target,date});
  if(result?.forcedFree)return null;
  return result;
}

export function applyInsuranceToServiceLine({line={},service={},settings={},patient={},date=getJalaliDateString()}={}){
  const coverage=resolveInsuranceCoverage({settings,patient,item:{...service,itemKind:'service'},date});
  if(!coverage)return {...line,insuranceApplied:false};
  const qty=Math.max(1,num(line.quantity,1));
  const unitPatient=coverage.patientPayable;
  return {...line,unitPrice:unitPatient,price:unitPatient*qty,tariffPrice:unitPatient,
    grossUnitPrice:coverage.originalTotal,grossTotal:coverage.originalTotal*qty,
    insuranceApplied:true,insurance:coverage,
    insurancePatientShare:coverage.patientShare*qty,
    insuranceInsurerShare:coverage.insurerShare*qty,
    insuranceDiscountShare:coverage.discountShare*qty};
}

export function applyInsuranceToProductLine({line={},product={},settings={},patient={},date=getJalaliDateString()}={}){
  const coverage=resolveInsuranceCoverage({settings,patient,item:{...product,itemKind:'product',type:'product'},date});
  if(!coverage)return {...line,insuranceApplied:false};
  const qty=Math.max(1,num(line.quantity,1));
  const unitPatient=coverage.patientPayable;
  return {...line,unitPrice:unitPatient,price:unitPatient*qty,salesPrice:unitPatient,
    grossUnitPrice:coverage.originalTotal,grossTotal:coverage.originalTotal*qty,
    insuranceApplied:true,insurance:coverage,
    insurancePatientShare:coverage.patientShare*qty,
    insuranceInsurerShare:coverage.insurerShare*qty,
    insuranceDiscountShare:coverage.discountShare*qty};
}
