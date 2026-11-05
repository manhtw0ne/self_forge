import {readPendingReminder,createReminderSafely} from './pendingReminder.js';
export const reminderDays=['MON','TUE','WED','THU','FRI','SAT','SUN'];
export const reminderDayLabels={MON:'Thứ Hai',TUE:'Thứ Ba',WED:'Thứ Tư',THU:'Thứ Năm',FRI:'Thứ Sáu',SAT:'Thứ Bảy',SUN:'Chủ nhật'};
export function scheduledHabitReminderDays(scheduledDays){
 const values=typeof scheduledDays==='string'?scheduledDays.split(','):[];
 return values.length&&new Set(values).size===values.length&&values.every(day=>reminderDays.includes(day))
  ?reminderDays.filter(day=>values.includes(day)):null;
}
/** Use a habit's chosen weekdays for a first reminder, never an untrusted payload. */
export function defaultHabitReminderDays(scheduledDays){
 return scheduledHabitReminderDays(scheduledDays)??[...reminderDays];
}
export function reminderDaysFitHabit(days,scheduledDays){
 const allowed=scheduledHabitReminderDays(scheduledDays);
 return Array.isArray(days)&&days.length>0&&new Set(days).size===days.length&&days.every(day=>reminderDays.includes(day))&&Boolean(allowed)&&days.every(day=>allowed.includes(day));
}
export function habitReminderPayload(habitId,form){
 if(!Number.isSafeInteger(habitId)||habitId<=0||!form||!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time)||typeof form.message!=='string'||form.message.length>255||
    !Array.isArray(form.days)||!form.days.length||new Set(form.days).size!==form.days.length||form.days.some(day=>!reminderDays.includes(day)))throw Error('Invalid habit reminder');
 return {habitId,reminderTime:form.time,daysOfWeek:reminderDays.filter(day=>form.days.includes(day)).join(','),message:form.message};
}
export function matchingReminder(rows,payload){
 return rows.some(row=>row.habitId===payload.habitId&&row.enabled&&row.reminderTime?.slice(0,5)===payload.reminderTime&&
   reminderDays.filter(day=>row.daysOfWeek?.split(',').includes(day)).join(',')===payload.daysOfWeek);
}
export async function createHabitReminder(storage,owner,habitId,form,post,makeId){
 const pending=readPendingReminder(storage,owner);if(pending&&pending.habitId!==habitId)throw Error('Another habit has a pending reminder');
 const payload=pending||habitReminderPayload(habitId,form);
 return createReminderSafely(storage,owner,payload,async body=>{
  const response=await post(body);
  if(!Number.isSafeInteger(response.data?.id)||response.data.id<=0||response.data.habitId!==habitId||typeof response.data.reminderTime!=='string'||typeof response.data.daysOfWeek!=='string')throw Error('Invalid reminder response');
  return response;
 },makeId);
}
