import {validCalendarDate,shiftDate,profileTimezone} from './dates.js';
export function activityMonth(today,offset=0){if(!validCalendarDate(today)||!Number.isInteger(offset)||offset>0||offset< -23)throw Error('Invalid activity month');const date=new Date(today.slice(0,7)+'-01T00:00:00Z');date.setUTCMonth(date.getUTCMonth()+offset);return date.toISOString().slice(0,7);}
export function readMonthlyActivity(value,month,today,timezone){
 if(!validCalendarDate(today)||!/^\d{4}-\d{2}$/.test(month)||!validCalendarDate(month+'-01')||month>activityMonth(today)||month<activityMonth(today,-23))throw Error('Invalid requested month');
 const start=month+'-01',next=new Date(start+'T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);const end=shiftDate(next.toISOString().slice(0,10),-1),through=end<today?end:today;
 if(!value||value.month!==month||value.startDate!==start||value.endDate!==end||value.observedThrough!==through||value.timezone!==profileTimezone(timezone)||!Array.isArray(value.days))throw Error('Invalid monthly activity');
 const count=Number(through.slice(-2));if(value.days.length!==count)throw Error('Missing calendar days');const keys=['completed','failed','skipped','focusSessions','focusMinutes'],totals=Object.fromEntries(keys.map(key=>[key,0]));let recorded=0;
 const days=value.days.map((row,index)=>{if(!row||row.date!==shiftDate(start,index)||keys.some(key=>!Number.isSafeInteger(row[key])||row[key]<0)||row.focusMinutes<row.focusSessions*25||row.focusMinutes>row.focusSessions*120)throw Error('Invalid daily totals');for(const key of keys)totals[key]+=row[key];if(row.completed+row.failed+row.skipped+row.focusSessions>0)recorded++;return {date:row.date,...Object.fromEntries(keys.map(key=>[key,row[key]]))};});
 if(keys.some(key=>value[key]!==totals[key])||value.recordedDays!==recorded)throw Error('Invalid monthly totals');return {month,startDate:start,endDate:end,observedThrough:through,timezone:value.timezone,...totals,recordedDays:recorded,days};
}

export function readMonthlyHabitActivity(value){
 const keys=['completed','failed','skipped','focusSessions','focusMinutes'];
 if(!Array.isArray(value.habits)||!Array.isArray(value.days)||!Number.isSafeInteger(value.unlinkedFocusSessions)||value.unlinkedFocusSessions<0||!Number.isSafeInteger(value.unlinkedFocusMinutes)||value.unlinkedFocusMinutes<value.unlinkedFocusSessions*25||value.unlinkedFocusMinutes>value.unlinkedFocusSessions*120)throw Error('Invalid monthly habit activity');
 const ids=new Set(),totals=Object.fromEntries(keys.map(key=>[key,0]));
 const habits=value.habits.map(row=>{if(!row||!Number.isSafeInteger(row.habitId)||row.habitId<1||ids.has(row.habitId)||typeof row.habitName!=='string'||!row.habitName.trim()||typeof row.active!=='boolean'||keys.some(key=>!Number.isSafeInteger(row[key])||row[key]<0)||row.completed+row.failed+row.skipped>value.days.length||row.focusMinutes<row.focusSessions*25||row.focusMinutes>row.focusSessions*120)throw Error('Invalid monthly habit');ids.add(row.habitId);for(const key of keys)totals[key]+=row[key];return {habitId:row.habitId,habitName:row.habitName,active:row.active,...Object.fromEntries(keys.map(key=>[key,row[key]]))};});
 totals.focusSessions+=value.unlinkedFocusSessions;totals.focusMinutes+=value.unlinkedFocusMinutes;if(keys.some(key=>value[key]!==totals[key]))throw Error('Mismatched habit totals');return {habits,unlinkedFocusSessions:value.unlinkedFocusSessions,unlinkedFocusMinutes:value.unlinkedFocusMinutes};
}
export function sortMonthlyHabits(rows,mode='completed',language='vi'){
 if(!['completed','focus'].includes(mode))throw Error('Invalid habit sort');return [...rows].sort((a,b)=>(mode==='focus'?b.focusMinutes-a.focusMinutes:b.completed-a.completed)||a.habitName.localeCompare(b.habitName,language)||a.habitId-b.habitId);
}
