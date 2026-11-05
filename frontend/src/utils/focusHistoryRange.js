import {validCalendarDate,shiftDate} from './dates.js';
export function focusHistoryRange(fromDate,toDate,today){
 if(!validCalendarDate(today)||(fromDate&&(!validCalendarDate(fromDate,today)||fromDate<'0001-01-01'))||(toDate&&(!validCalendarDate(toDate,today)||toDate<'0001-01-01'))||(fromDate&&toDate&&fromDate>toDate))throw Error('Invalid history range');
 return {...(fromDate?{fromDate}:{}),...(toDate?{toDate}:{})};
}
export function focusHistoryPreset(kind,today){
 if(!validCalendarDate(today))throw Error('Invalid date');if(kind==='ALL')return {fromDate:'',toDate:''};if(kind==='MONTH')return {fromDate:today.slice(0,7)+'-01',toDate:today};if(kind==='7'||kind==='30'){const start=shiftDate(today,1-Number(kind));return {fromDate:start<'0001-01-01'?'0001-01-01':start,toDate:today};}throw Error('Invalid preset');
}
