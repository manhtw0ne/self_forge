import {validCalendarDate,calendarWeekStart,shiftDate} from './dates.js';
export function journalWeekPlanSource(entry,today,offset=0){
 if(!validCalendarDate(today)||!entry||!Number.isSafeInteger(entry.id)||entry.id<1||!validCalendarDate(entry.date,today)||entry.date<'0001-01-01'||typeof entry.tomorrowFocus!=='string'||entry.tomorrowFocus.length>5000||![0,1].includes(offset))throw Error('Invalid journal plan source');
 const action=entry.tomorrowFocus.trim();return {sourceDate:entry.date,action,canPrefill:action.length>0&&action.length<=1000,week:shiftDate(calendarWeekStart(today),offset*7)};
}
