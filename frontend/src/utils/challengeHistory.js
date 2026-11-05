import {validCalendarDate,shiftDate} from './dates.js';
import {challengeWindowDays} from './challengeWindow.js';
export function challengeHistory(value,challenge,today){
 const days=challengeWindowDays(challenge);
 if(!days||!validCalendarDate(today)||value?.challengeId!==challenge.id||value?.habitId!==challenge.habitId||value?.startDate!==challenge.startDate||value?.endDate!==challenge.endDate||!Array.isArray(value.entries)||value.entries.length>days)throw Error('Invalid challenge history');
 const dates=new Map(),ids=new Set();
 for(const row of value.entries){
  if(!row||!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||!validCalendarDate(row.date,today)||row.date<challenge.startDate||row.date>challenge.endDate||dates.has(row.date)||!['COMPLETED','FAILED','SKIPPED'].includes(row.status))throw Error('Invalid challenge evidence');
  ids.add(row.id);dates.set(row.date,{id:row.id,date:row.date,status:row.status});
 }
 return Array.from({length:days},(_,index)=>{const date=shiftDate(challenge.startDate,index);return dates.get(date)??{id:null,date,status:date>today?'UPCOMING':'UNRECORDED'};});
}
