import {calendarWeekStart,shiftDate,validCalendarDate,profileTimezone} from './dates.js';
export function companionWeek(today,offset){if(!Number.isInteger(offset)||offset>0||offset< -51)throw Error('Invalid week');return shiftDate(calendarWeekStart(today),offset*7);}
export function readCompanionWeek(value,week,today,timezone){
 const end=shiftDate(week,6),observed=end<today?end:today;
 if(!validCalendarDate(week)||calendarWeekStart(week)!==week||week>calendarWeekStart(today)||week<companionWeek(today,-51)||value?.weekStart!==week||value.observedThrough!==observed||value.timezone!==profileTimezone(timezone)||!Array.isArray(value.sources)||!['xp','counted','legacyExcluded'].every(key=>Number.isSafeInteger(value[key])&&value[key]>=0))throw Error('Invalid companion summary');
 const ids=new Set(),pairs=new Set(),groups=new Map();let xp=0;
 for(const row of value.sources){if(!row||!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||!Number.isSafeInteger(row.habitId)||row.habitId<1||typeof row.habitName!=='string'||!validCalendarDate(row.date)||row.date<week||row.date>observed||!Number.isSafeInteger(row.points)||row.points<1||pairs.has(row.habitId+':'+row.date))throw Error('Invalid companion source');ids.add(row.id);pairs.add(row.habitId+':'+row.date);xp+=row.points;const group=groups.get(row.habitId)||{id:row.habitId,name:row.habitName,xp:0,count:0};group.xp+=row.points;group.count++;groups.set(row.habitId,group);}
 if(xp!==value.xp||value.counted!==ids.size)throw Error('Mismatched companion total');
 return {xp,counted:ids.size,legacyExcluded:value.legacyExcluded,groups:[...groups.values()].sort((a,b)=>b.xp-a.xp||a.id-b.id)};
}
