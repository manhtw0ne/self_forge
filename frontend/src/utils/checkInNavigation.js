import {validCalendarDate} from './dates.js';
export function checkInEntryPath(date,id){if(!validCalendarDate(date)||date<'0001-01-01'||!Number.isSafeInteger(id)||id<1)throw Error('Invalid check-in link');return '/check-in-history?'+new URLSearchParams({date,entry:String(id)});}
export function readCheckInTarget(search,today){
 if(!validCalendarDate(today)||today<'0001-01-01')throw Error('Invalid account date');const params=new URLSearchParams(search),dates=params.getAll('date'),ids=params.getAll('entry');const date=dates[0]??today,id=ids[0];
 const invalid=dates.length>1||ids.length>1||!validCalendarDate(date,today)||date<'0001-01-01'||ids.length>0&&(dates.length!==1||!/^[1-9]\d*$/.test(id)||!Number.isSafeInteger(Number(id)));
 return {date:invalid?today:date,entryId:invalid||!ids.length?null:Number(id),invalid};
}
export function selectedCheckIn(entries,target){if(target.invalid||target.entryId===null)return null;const rows=entries.filter(row=>row.id===target.entryId&&row.date===target.date);return rows.length===1?rows[0]:null;}
