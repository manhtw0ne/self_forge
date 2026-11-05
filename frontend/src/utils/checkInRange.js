import {validCalendarDate,profileTimezone,shiftDate} from './dates.js';
const statuses=['ALL','COMPLETED','FAILED','SKIPPED'];
export function checkInRangeQuery(query,status,fromDate,toDate,today){
 if(typeof query!=='string'||query.trim().length>100||!statuses.includes(status)||!validCalendarDate(today)||!validCalendarDate(fromDate,today)||fromDate<'0001-01-01'||!validCalendarDate(toDate,today)||fromDate>toDate||(Date.parse(toDate+'T00:00:00Z')-Date.parse(fromDate+'T00:00:00Z'))/86400000>365)throw Error('Chọn khoảng ngày tối đa 366 ngày, không ở tương lai; từ khóa tối đa 100 ký tự.');
 return {query:query.trim(),status,fromDate,toDate};
}
export function checkInRangePreset(days,today){if(![7,30,90,366].includes(days)||!validCalendarDate(today))throw Error('Invalid range preset');const fromDate=shiftDate(today,1-days);if(!validCalendarDate(fromDate)||fromDate<'0001-01-01')throw Error('Invalid range preset');return {fromDate,toDate:today};}
export function readCheckInRange(value,scope,today,timezone,before=null){
 checkInRangeQuery(scope.query,scope.status,scope.fromDate,scope.toDate,today);
 if(!value||value.query!==scope.query||value.status!==scope.status||value.fromDate!==scope.fromDate||value.toDate!==scope.toDate||value.timezone!==profileTimezone(timezone)||!Array.isArray(value.items)||value.items.length>20)throw Error('Invalid check-in search scope');
 let previous=before;const ids=new Set();const items=value.items.map(row=>{
  if(!row||!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||!Number.isSafeInteger(row.habitId)||row.habitId<1||typeof row.habitName!=='string'||!row.habitName.trim()||row.habitName.length>255||!validCalendarDate(row.date,scope.toDate)||row.date<scope.fromDate||!['COMPLETED','FAILED','SKIPPED'].includes(row.status)||scope.status!=='ALL'&&row.status!==scope.status||(row.note!=null&&(typeof row.note!=='string'||row.note.length>255))||previous&&(row.date>previous.date||row.date===previous.date&&row.id>=previous.id))throw Error('Invalid check-in search row');
  ids.add(row.id);previous={date:row.date,id:row.id};return {id:row.id,habitId:row.habitId,habitName:row.habitName,date:row.date,status:row.status,note:row.note??''};
 });
 const next=value.nextCursor??null;if(next&&(items.length!==20||next.date!==items.at(-1)?.date||next.id!==items.at(-1)?.id))throw Error('Invalid check-in search cursor');return {items,nextCursor:next?{date:next.date,id:next.id}:null};
}
