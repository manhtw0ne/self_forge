import {dailyFocusDraft} from './dailyFocusDraft.js';import {dailyFocusPlan} from './dailyFocusPlan.js';import {validCalendarDate,todayInTimezone,profileTimezone} from './dates.js';
export function dailyFocusProgress(draft,evidence,habits,today,timezone){
 const saved=dailyFocusDraft(draft);if(saved.date!==today||!validCalendarDate(today)||evidence?.date!==today||evidence.timezone!==profileTimezone(timezone)||!Array.isArray(evidence.sessions))throw Error('Invalid daily focus evidence');
 // Progress only compares a plan that was saved for this account date; it
 // must not reinterpret a later Dashboard schedule refresh as a different
 // plan. It still clears check-in status so recorded focus time is visible.
 const plan=dailyFocusPlan(saved.budget,saved.energy,saved.ids,habits.map(row=>({...row,scheduledToday:true,todayStatus:null})));const ids=new Set(),totals=new Map();
 for(const row of evidence.sessions){
  if(!row||!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||(row.habitId!==null&&(!Number.isSafeInteger(row.habitId)||row.habitId<1))||!Number.isInteger(row.durationMinutes)||row.durationMinutes<25||row.durationMinutes>120||typeof row.startedAt!=='string'||!Number.isFinite(Date.parse(row.startedAt))||todayInTimezone(timezone,new Date(row.startedAt))!==today)throw Error('Invalid focus source');
  ids.add(row.id);const prior=totals.get(row.habitId)??{minutes:0,sourceIds:[]};prior.minutes+=row.durationMinutes;prior.sourceIds.push(row.id);totals.set(row.habitId,prior);
 }
 return plan.sessions.map(row=>{const total=totals.get(row.id)??{minutes:0,sourceIds:[]};return {...row,recordedMinutes:total.minutes,remainingMinutes:Math.max(0,row.minutes-total.minutes),sourceIds:total.sourceIds};});
}
