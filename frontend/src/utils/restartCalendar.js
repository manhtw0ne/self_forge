import {readServerRestart} from './restartPlan.js';
import {shiftDate,validCalendarDate} from './dates.js';
const escape=value=>String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const encoder=new TextEncoder();
function fold(line){let output='',bytes=0;for(const char of line){const size=encoder.encode(char).length;if(bytes+size>75){output+='\r\n ';bytes=1;}output+=char;bytes+=size;}return output;}
export function restartCalendar(value,owner,includeDetails=false,en=false,now=new Date()){
 const plan=readServerRestart(value);if(!plan||!Number.isSafeInteger(owner)||owner<1||typeof includeDetails!=='boolean'||!Number.isFinite(now.getTime())||!/^\d{4}-/.test(now.toISOString()))throw Error('Invalid restart calendar');
 const stamp=now.toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SelfForge//RestartPlan//EN','CALSCALE:GREGORIAN'];
 for(let index=0;index<3;index++){
  const date=shiftDate(plan.start,index),end=shiftDate(date,1);if(!validCalendarDate(end))throw Error('Calendar date out of range');
  lines.push('BEGIN:VEVENT','UID:restart-'+owner+'-'+plan.version+'-'+index+'@selfforge.local','SEQUENCE:0','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+date.replaceAll('-',''),'DTEND;VALUE=DATE:'+end.replaceAll('-',''),'SUMMARY:'+escape('SelfForge: '+(en?'Start again — day ':'Bắt đầu lại — ngày ')+(index+1)+'/3'));
  lines.push('DESCRIPTION:'+escape((includeDetails?plan.name+'\n'+plan.steps[index]+'\n':'')+(en?'Personal three-day plan. No automatic check-in or XP.':'Kế hoạch ba ngày tự chọn. Không tự check-in hoặc cộng XP.')),'CLASS:PRIVATE','TRANSP:TRANSPARENT','STATUS:CONFIRMED','END:VEVENT');
 }
 lines.push('END:VCALENDAR');return {filename:'selfforge-restart-'+plan.start+'-v'+plan.version+'.ics',content:lines.map(fold).join('\r\n')+'\r\n'};
}
