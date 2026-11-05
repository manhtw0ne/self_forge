import {validCalendarDate,shiftDate} from './dates.js';
import {challengeWindow} from './challengeWindow.js';
export function challengeDraftSchedule(form,today){
 const startDate=form.startDate||today;
 if(!validCalendarDate(today)||!validCalendarDate(startDate)||startDate<'0001-01-01'||startDate<today)throw Error('Chọn ngày bắt đầu từ hôm nay trở đi.');
 return challengeWindow(form.targetDays,form.windowDays,startDate);
}
export function challengeStartPreset(kind,today){
 if(!validCalendarDate(today))throw Error('Invalid date');let offset;
 if(kind==='TODAY')offset=0;else if(kind==='TOMORROW')offset=1;else if(kind==='MONDAY'){const weekday=new Date(today+'T00:00:00Z').getUTCDay();offset=(8-weekday)%7||7;}else throw Error('Invalid preset');
 const date=shiftDate(today,offset);if(!validCalendarDate(date))throw Error('Invalid date');return date;
}
