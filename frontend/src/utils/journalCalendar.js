import {validCalendarDate} from './dates.js';
export function journalMonth(month,dates,today){
 if(!validCalendarDate(today)||today<'0001-01-01'||!validCalendarDate(month+'-01')||month<'0001-01'||month>today.slice(0,7)||!Array.isArray(dates))throw Error('Invalid journal calendar');
 const recorded=new Set();for(const date of dates){if(!validCalendarDate(date,today)||date<'0001-01-01'||recorded.has(date))throw Error('Invalid saved journal dates');recorded.add(date);}
 const first=new Date(month+'-01T00:00:00Z');const offset=(first.getUTCDay()+6)%7;const end=new Date(first);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);
 const days=Array.from({length:end.getUTCDate()},(_,index)=>{const date=month+'-'+String(index+1).padStart(2,'0');return {date,day:index+1,saved:recorded.has(date),future:date>today};});
 return {offset,days,count:days.filter(row=>row.saved).length};
}
export function shiftJournalMonth(month,offset,today){
 if(!validCalendarDate(month+'-01')||![-1,1].includes(offset)||!validCalendarDate(today))return null;
 const index=Number(month.slice(0,4))*12+Number(month.slice(5))-1+offset;const year=Math.floor(index/12);if(year<1||year>9999)return null;
 const next=String(year).padStart(4,'0')+'-'+String(index%12+1).padStart(2,'0');return next>today.slice(0,7)?null:next;
}
