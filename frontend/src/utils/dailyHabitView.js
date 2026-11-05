import {validCalendarDate} from './dates.js';

const WEEK_DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const DATE_DAY_CODES = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function defaultSchedule(targetPerWeek){
 const count=Number.isInteger(targetPerWeek)&&targetPerWeek>=1&&targetPerWeek<=7?targetPerWeek:7;
 return WEEK_DAYS.slice(0,count);
}

function scheduleFor(row){
 const target=Number.isInteger(row?.targetPerWeek)&&row.targetPerWeek>=1&&row.targetPerWeek<=7?row.targetPerWeek:7;
 const values=typeof row?.scheduledDays==='string'?row.scheduledDays.split(','):[];
 return values.length===target&&new Set(values).size===values.length&&values.every(day=>WEEK_DAYS.includes(day))
  ? values : defaultSchedule(target);
}

export function isHabitScheduledOn(row,date){
 if(!validCalendarDate(date))throw Error('Invalid daily habit date');
 if(typeof row?.scheduledToday==='boolean')return row.scheduledToday;
 const weekday=DATE_DAY_CODES[new Date(date+'T00:00:00Z').getUTCDay()];
 return scheduleFor(row).includes(weekday);
}

export function dailyCompletionSummary(rows){
 if(!Array.isArray(rows))throw Error('Invalid daily completion rows');
 const dueToday=rows.filter(row=>row?.scheduledToday!==false);
 return {allDone:dueToday.length>0&&dueToday.every(row=>row.todayStatus==='COMPLETED')};
}

/**
 * Keeps off-schedule habits out of the normal daily action list without hiding
 * an already-recorded check-in or a habit deliberately opened from another page.
 */
export function dailyHabitView(rows,filter='ALL',target=null,date=null){
 if(!Array.isArray(rows)||!['ALL','PENDING','RECORDED','REST'].includes(filter))throw Error('Invalid daily habit view');
 if(date!==null&&!validCalendarDate(date))throw Error('Invalid daily habit date');
 const source=target?rows.filter(row=>target.id!==null&&row.habitId===target.id):rows;
 const annotated=date===null?source:source.map(row=>({...row,scheduledToday:isHabitScheduledOn(row,date)}));
 const restRows=date===null?[]:annotated.filter(row=>!row.scheduledToday&&!row.todayStatus);
 const actionRows=date===null?[...annotated]:target?annotated:annotated.filter(row=>row.scheduledToday||row.todayStatus);
 const pending=actionRows.filter(row=>!row.todayStatus);
 const recorded=actionRows.filter(row=>!!row.todayStatus);
 const rowsForFilter=filter==='PENDING'?pending:filter==='RECORDED'?recorded:filter==='REST'?restRows:actionRows;
 return {allRows:actionRows,rows:rowsForFilter,pendingRows:pending,restRows,counts:{ALL:actionRows.length,PENDING:pending.length,RECORDED:recorded.length,REST:restRows.length}};
}
