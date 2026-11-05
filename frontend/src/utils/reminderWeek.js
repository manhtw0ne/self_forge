import {validCalendarDate,shiftDate} from './dates.js';
const weekdays=['SUN','MON','TUE','WED','THU','FRI','SAT'];
export function reminderWeek(reminders,today){
 if(!Array.isArray(reminders)||!validCalendarDate(today)||today<'0001-01-01')throw Error('Invalid reminder week');const ids=new Set();const active=[];let excluded=0;
 for(const row of reminders){
  if(!row||!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||typeof row.enabled!=='boolean')throw Error('Invalid reminder');ids.add(row.id);
  if(!row.enabled||row.habitActive===false){excluded++;continue;}
  if(typeof row.habitName!=='string'||!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(row.reminderTime)||typeof row.daysOfWeek!=='string')throw Error('Invalid reminder schedule');
  const days=row.daysOfWeek.split(',');if(!days.length||new Set(days).size!==days.length||days.some(day=>!weekdays.includes(day)))throw Error('Invalid reminder days');
  if(typeof row.habitScheduledDays!=='string')throw Error('Invalid habit schedule');
  const scheduledDays=row.habitScheduledDays.split(',');if(!scheduledDays.length||new Set(scheduledDays).size!==scheduledDays.length||scheduledDays.some(day=>!weekdays.includes(day)))throw Error('Invalid habit schedule');
  active.push({id:row.id,name:row.habitName,time:row.reminderTime,minute:row.reminderTime.slice(0,5),days:days.filter(day=>scheduledDays.includes(day))});
 }
 const days=Array.from({length:7},(_,offset)=>{const date=shiftDate(today,offset);if(!validCalendarDate(date))throw Error('Date out of range');const day=weekdays[new Date(date+'T00:00:00Z').getUTCDay()];const rows=active.filter(row=>row.days.includes(day)).map(({id,name,time,minute})=>({id,name,time,minute})).sort((a,b)=>a.minute.localeCompare(b.minute)||a.time.localeCompare(b.time)||a.id-b.id);const counts=new Map();for(const row of rows)counts.set(row.minute,(counts.get(row.minute)||0)+1);return {date,rows:rows.map(row=>({...row,overlap:counts.get(row.minute)>1})),overlapMinutes:[...counts.values()].filter(count=>count>1).length};});
 return {days,total:days.reduce((sum,day)=>sum+day.rows.length,0),overlapMinutes:days.reduce((sum,day)=>sum+day.overlapMinutes,0),excluded};
}
