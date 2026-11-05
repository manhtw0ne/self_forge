import {validCalendarDate,shiftDate} from './dates.js';
export function readTrendHabits(active,inactive){
 if(!Array.isArray(active)||!Array.isArray(inactive))throw Error('Invalid habits');const ids=new Set();
 return [...active,...inactive].map(row=>{if(!row||!Number.isSafeInteger(row.id)||row.id<=0||ids.has(row.id)||typeof row.name!=='string'||typeof row.active!=='boolean')throw Error('Invalid habit');ids.add(row.id);return {id:row.id,name:row.name,active:row.active};});
}
export function readHabitTrend(value,habitId,days,today){
 if(!value||![7,28].includes(days)||value.habitId!==habitId||value.days!==days||typeof value.habitName!=='string'||!validCalendarDate(today)||value.end!==today||value.start!==shiftDate(today,1-days)||value.previousEnd!==shiftDate(today,-days)||value.previousStart!==shiftDate(today,1-days*2)||!Array.isArray(value.evidence)||value.evidence.length>days*2)throw Error('Invalid trend');
 const focus=value=>{if(!value||!Number.isSafeInteger(value.sessions)||value.sessions<0||!Number.isSafeInteger(value.minutes)||value.minutes<value.sessions*25||value.minutes>value.sessions*120)throw Error('Invalid focus totals');return {sessions:value.sessions,minutes:value.minutes};};
 const currentFocus=focus(value.currentFocus),previousFocus=focus(value.previousFocus);
 const counts=()=>({completed:0,failed:0,skipped:0});const current=counts(),previous=counts();const ids=new Set(),dates=new Set();
 const evidence=value.evidence.map(row=>{if(!row||!Number.isSafeInteger(row.id)||row.id<=0||ids.has(row.id)||!validCalendarDate(row.date)||row.date<value.previousStart||row.date>today||dates.has(row.date)||!['COMPLETED','FAILED','SKIPPED'].includes(row.status))throw Error('Invalid trend evidence');ids.add(row.id);dates.add(row.date);const count=row.date>=value.start?current:previous;count[{COMPLETED:'completed',FAILED:'failed',SKIPPED:'skipped'}[row.status]]++;return {id:row.id,date:row.date,status:row.status};});
 for(const [key,count] of Object.entries({current,previous}))for(const field of Object.keys(count))if(value[key]?.[field]!==count[field])throw Error('Unsupported trend count');
 const map=new Map(evidence.map(row=>[row.date,row]));const calendar=Array.from({length:days},(_,index)=>{const date=shiftDate(value.start,index);return {date,status:map.get(date)?.status||'UNRECORDED',checkInId:map.get(date)?.id||null};});
 return {habitId,habitName:value.habitName,days,start:value.start,end:today,previousStart:value.previousStart,previousEnd:value.previousEnd,current,previous,currentFocus,previousFocus,evidence,calendar};
}
