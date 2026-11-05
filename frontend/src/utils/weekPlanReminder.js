import {readServerWeekPlan} from './weekPlan.js';
import {calendarWeekStart,profileTimezone,todayInTimezone} from './dates.js';
export function todayWeekPlanReminder(value,date,timezone,now=new Date()){
 if(todayInTimezone(timezone,now)!==date)return {stale:true,item:null};
 const plan=readServerWeekPlan(value,calendarWeekStart(date));
 if(!plan||plan.completed||plan.date!==date||!plan.time)return {stale:false,item:null};
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:profileTimezone(timezone),hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const time=parts.find(part=>part.type==='hour').value+':'+parts.find(part=>part.type==='minute').value;
 return {stale:false,item:{action:plan.action,time:plan.time,due:plan.time<=time}};
}
