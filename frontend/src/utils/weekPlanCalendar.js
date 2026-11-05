import {readServerWeekPlan} from './weekPlan.js';
import {shiftDate,validCalendarDate} from './dates.js';
const escape=value=>String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const encoder=new TextEncoder();
function fold(line){let output='',bytes=0;for(const char of line){const size=encoder.encode(char).length;if(bytes+size>75){output+='\r\n ';bytes=1;}output+=char;bytes+=size;}return output;}
const stamp=date=>{const iso=date.toISOString();if(!/^\d{4}-/.test(iso))throw Error('Date out of range');return iso.replace(/[-:]/g,'').slice(0,15)+'Z';};
function instant(date,time,zone){
 const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const epoch=value=>{const parts=Object.fromEntries(formatter.formatToParts(value).map(part=>[part.type,part.value]));return Date.parse(parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute+':'+parts.second+'Z');};
 const midnight=Date.parse(date+'T00:00:00Z'),wall=Date.parse(date+'T'+time+':00Z');const offsets=new Set([-1,0,1].map(day=>{const sample=new Date(midnight+day*86400000);return epoch(sample)-sample.getTime();}));
 const matches=[...offsets].map(offset=>new Date(wall-offset)).filter(value=>epoch(value)===wall).sort((a,b)=>a-b);if(!matches.length)throw Error('This local time does not exist');return matches[0];
}
export function weekPlanCalendar(value,owner,timezone,minutes=30,t=text=>text,now=new Date()){
 if(typeof timezone!=='string'||!timezone||!Number.isSafeInteger(owner)||owner<1||![15,30,45,60,90,120].includes(minutes)||!Number.isFinite(now.getTime()))throw Error('Invalid calendar export');
 const plan=readServerWeekPlan(value,value?.week);if(!plan)throw Error('Missing saved plan');new Intl.DateTimeFormat('en',{timeZone:timezone});
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SelfForge//WeekPlan//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:week-plan-'+owner+'-'+plan.week+'@selfforge.local','SEQUENCE:'+plan.version,'DTSTAMP:'+stamp(now)];
 if(plan.time){const start=instant(plan.date,plan.time,timezone);lines.push('DTSTART:'+stamp(start),'DTEND:'+stamp(new Date(start.getTime()+minutes*60000)));}else{const end=shiftDate(plan.date,1);if(!validCalendarDate(end))throw Error('Date out of range');lines.push('DTSTART;VALUE=DATE:'+plan.date.replaceAll('-',''),'DTEND;VALUE=DATE:'+end.replaceAll('-',''));}
 lines.push('SUMMARY:'+escape('SelfForge: '+t('Kế hoạch tuần')),'DESCRIPTION:'+escape(plan.action+'\n'+t(plan.completed?'Đã thực hiện':'Chưa thực hiện')+'\n'+timezone),'STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR');
 return {filename:'selfforge-week-plan-'+plan.week+'.ics',content:lines.map(fold).join('\r\n')+'\r\n'};
}
