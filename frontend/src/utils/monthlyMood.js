import {activityMonth} from './monthlyActivity.js';import {validCalendarDate,shiftDate,profileTimezone} from './dates.js';
export function monthlyMood(value,month,today,timezone){
 if(!validCalendarDate(today)||!/^\d{4}-\d{2}$/.test(month)||!validCalendarDate(month+'-01')||month>activityMonth(today)||month<activityMonth(today,-23))throw Error('Invalid mood month');
 const start=month+'-01',next=new Date(start+'T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);const end=shiftDate(next.toISOString().slice(0,10),-1),through=end<today?end:today,observedDays=Number(through.slice(-2));
 if(!value||value.month!==month||value.startDate!==start||value.endDate!==end||value.observedThrough!==through||value.timezone!==profileTimezone(timezone)||!Array.isArray(value.entries)||value.entries.length>observedDays)throw Error('Invalid mood history');
 const ids=new Set(),dates=new Set(),distribution=[0,0,0,0,0];let sum=0;
 const entries=value.entries.map(row=>{if(!row||!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||!validCalendarDate(row.date,through)||row.date<start||dates.has(row.date)||!Number.isInteger(row.score)||row.score<1||row.score>5)throw Error('Invalid mood entry');ids.add(row.id);dates.add(row.date);distribution[row.score-1]++;sum+=row.score;return {id:row.id,date:row.date,score:row.score};}).sort((a,b)=>b.date.localeCompare(a.date));
 const most=Math.max(...distribution);return {month,startDate:start,observedThrough:through,entries,observedDays,recordedDays:entries.length,unrecordedDays:observedDays-entries.length,average:entries.length?sum/entries.length:null,distribution,mostCommonScores:most>0?distribution.flatMap((count,index)=>count===most?[index+1]:[]):[]};
}
