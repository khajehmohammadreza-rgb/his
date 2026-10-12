import {getJalaliDateString,parseJalaliDate,jalaliToGregorian,toEnglishDigits} from './jalali.js?b=r24-514-1405';
export const DEFAULT_FISCAL_YEAR=1405;
export const fiscalYearOptions=(current=DEFAULT_FISCAL_YEAR)=>{const cy=Number(current)||DEFAULT_FISCAL_YEAR;return Array.from({length:9},(_,i)=>cy-6+i)};
export function fiscalYearFromJalali(value){try{return Number(parseJalaliDate(toEnglishDigits(String(value)) ).jy)}catch{return Number(toEnglishDigits(String(value||'')).slice(0,4))||DEFAULT_FISCAL_YEAR}}
export function fiscalYearFromValue(value){if(!value)return fiscalYearFromJalali(getJalaliDateString());const clean=toEnglishDigits(String(value)).trim();if(/^\d{4}[/-]\d/.test(clean))return fiscalYearFromJalali(clean);if(/^\d{4}$/.test(clean))return Number(clean);try{return fiscalYearFromJalali(getJalaliDateString(new Date(value)))}catch{return DEFAULT_FISCAL_YEAR}}
export function getActiveFiscalYear(settings={}){return Number(settings?.activeFiscalYear)||fiscalYearFromJalali(getJalaliDateString())}
export function withFiscalYear(record={},settings={},dateValue){return {...record,fiscalYear:Number(record.fiscalYear)||fiscalYearFromValue(dateValue||record.jalaliDate||record.date||record.createdAt||record.timestamp)}}
export function belongsToFiscalYear(record={},year){if(!year)return true;return Number(record.fiscalYear||fiscalYearFromValue(record.jalaliDate||record.date||record.createdAt||record.timestamp))===Number(year)}
