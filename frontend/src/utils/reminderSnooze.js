import {validCalendarDate,profileTimezone,todayInTimezone} from './dates.js';
const minutes=[10,30,60];
const key=(owner,date)=>{if(!Number.isSafeInteger(owner)||owner<1||!validCalendarDate(date)||date<'0001-01-01')throw Error('Invalid snooze scope');return 'sf_reminder_snooze:'+owner+':'+date;};
function validate(items,date,timezone){
 if(!Array.isArray(items)||items.length>100)throw Error('Invalid snoozes');const ids=new Set();
 return items.map(row=>{if(!row||!Number.isSafeInteger(row.reminderId)||row.reminderId<1||ids.has(row.reminderId)||!Number.isSafeInteger(row.habitId)||row.habitId<1||typeof row.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(row.time)||typeof row.days!=='string'||row.days.length>27||!Number.isSafeInteger(row.createdAt)||!Number.isSafeInteger(row.until)||!minutes.includes((row.until-row.createdAt)/60000)||todayInTimezone(timezone,new Date(row.createdAt))!==date||todayInTimezone(timezone,new Date(row.until))!==date)throw Error('Invalid snooze');ids.add(row.reminderId);return {reminderId:row.reminderId,habitId:row.habitId,time:row.time,days:row.days,createdAt:row.createdAt,until:row.until};});
}
export function readReminderSnoozes(storage,owner,date,timezone){const raw=storage.getItem(key(owner,date));if(raw===null)return [];const value=JSON.parse(raw);if(value.version!==1||value.date!==date||value.timezone!==profileTimezone(timezone))throw Error('Invalid snooze scope');return validate(value.items,date,timezone);}
export function writeReminderSnoozes(storage,owner,date,timezone,items){const value=validate(items,date,timezone);storage.setItem(key(owner,date),JSON.stringify({version:1,date,timezone:profileTimezone(timezone),items:value}));return value;}
export function clearReminderSnoozes(storage,owner,date){storage.removeItem(key(owner,date));}
export function snoozeReminder(items,item,duration,date,timezone,now=new Date()){
 if(!minutes.includes(duration)||!item?.due||todayInTimezone(timezone,now)!==date)throw Error('Chỉ nhắc lại lịch đã đến giờ trong hôm nay.');
 const until=now.getTime()+duration*60000;if(todayInTimezone(timezone,new Date(until))!==date)throw Error('Lượt nhắc lại sẽ sang ngày mới. Chọn thời gian ngắn hơn hoặc sửa lịch nhắc.');
 return validate([...items.filter(row=>row.reminderId!==item.id),{reminderId:item.id,habitId:item.habitId,time:item.reminderTime,days:item.daysOfWeek,createdAt:now.getTime(),until}],date,timezone);
}
export function applyReminderSnoozes(items,snoozes,timezone,now=new Date()){
 return items.map(item=>{const source=snoozes.find(row=>row.reminderId===item.id&&row.habitId===item.habitId&&row.time===item.reminderTime&&row.days===item.daysOfWeek&&row.createdAt<=now.getTime()&&todayInTimezone(timezone,new Date(row.createdAt))===todayInTimezone(timezone,now));
  if(!source)return {...item,snoozed:false,snoozedUntil:null,effectiveTime:item.time};
  const snoozed=source.until>now.getTime(),effectiveTime=new Intl.DateTimeFormat('en-GB',{timeZone:profileTimezone(timezone),hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(source.until));
  return {...item,snoozed,snoozedUntil:source.until,effectiveTime,due:!snoozed};
 }).sort((a,b)=>Number(b.due)-Number(a.due)||a.effectiveTime.localeCompare(b.effectiveTime)||a.id-b.id);
}
