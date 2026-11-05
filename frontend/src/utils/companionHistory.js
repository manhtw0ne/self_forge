import {validCalendarDate} from './dates.js';
export function readCompanionHistory(value){
 if(!value||!Array.isArray(value.items)||value.items.length>20)throw Error('Invalid companion history');
 let previous=Infinity;const items=value.items.map(row=>{
  if(!row||!Number.isSafeInteger(row.id)||row.id<=0||row.id>=previous||!Number.isSafeInteger(row.checkInId)||row.checkInId<=0||typeof row.habitName!=='string'||!validCalendarDate(row.date)||typeof row.changedAt!=='string'||!Number.isFinite(Date.parse(row.changedAt))||
     !Number.isSafeInteger(row.delta)||row.delta===0||!['COMPLETED','REVERSED'].includes(row.reason)||(row.reason==='COMPLETED'?row.delta<0:row.delta>0))throw Error('Invalid companion event');
  previous=row.id;return {id:row.id,checkInId:row.checkInId,habitName:row.habitName,date:row.date,changedAt:row.changedAt,delta:row.delta,reason:row.reason};
 });
 const nextCursor=value.nextCursor??null;if(nextCursor!==null&&(!Number.isSafeInteger(nextCursor)||nextCursor<=0||items.length!==20||nextCursor!==items.at(-1).id))throw Error('Invalid history cursor');
 return {items,nextCursor};
}
