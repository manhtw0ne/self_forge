import {validCalendarDate,shiftDate} from './dates.js';
export function goalAgenda(rows,today){
 if(!Array.isArray(rows)||!validCalendarDate(today))throw Error('Invalid goal agenda');const ids=new Set(),active=[];
 for(const row of rows){
  if(!row||!Number.isSafeInteger(row.id)||row.id<=0||ids.has(row.id)||typeof row.name!=='string'||!row.name.trim()||row.name.length>255||!['ACTIVE','COMPLETED','ABANDONED'].includes(row.status)||!Number.isSafeInteger(row.targetValue)||row.targetValue<1||row.targetValue>2147483647||!Number.isSafeInteger(row.currentValue)||row.currentValue<0||row.currentValue>2147483647||(row.unit!=null&&(typeof row.unit!=='string'||row.unit.length>255))||(row.deadline!=null&&!validCalendarDate(row.deadline)))throw Error('Invalid goal');
  ids.add(row.id);const remaining=Math.max(0,row.targetValue-row.currentValue);if(row.status!=='ACTIVE'||remaining===0)continue;
  active.push({id:row.id,name:row.name,unit:row.unit||'',currentValue:row.currentValue,targetValue:row.targetValue,remaining,deadline:row.deadline||null,percent:Math.min(100,Math.round(row.currentValue/row.targetValue*100))});
 }
 active.sort((a,b)=>(a.deadline||'9999-12-31').localeCompare(b.deadline||'9999-12-31')||a.id-b.id);
 return {active,dueSoon:active.filter(row=>row.deadline&&row.deadline>=today&&row.deadline<=shiftDate(today,6)),overdue:active.filter(row=>row.deadline&&row.deadline<today)};
}
