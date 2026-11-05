import {validCalendarDate,shiftDate,profileTimezone} from './dates.js';
import {journalFields,JOURNAL_LIMIT} from './journalLimits.js';
export function readJournalMonth(value,month,today,timezone){
 if(!validCalendarDate(today)||!validCalendarDate(month+'-01')||month<'0001-01'||month>today.slice(0,7))throw Error('Invalid journal month');
 const next=new Date(month+'-01T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);const end=shiftDate(next.toISOString().slice(0,10),-1),through=end<today?end:today;
 if(value?.month!==month||value.observedThrough!==through||value.timezone!==profileTimezone(timezone)||!Array.isArray(value.items)||value.items.length>31)throw Error('Invalid month snapshot');
 const ids=new Set();let previous='';const items=value.items.map(row=>{if(!row||!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||!validCalendarDate(row.date)||row.date.slice(0,7)!==month||row.date>through||row.date<=previous)throw Error('Invalid monthly journal');ids.add(row.id);previous=row.date;const result={date:row.date};for(const key of Object.keys(journalFields)){if(row[key]!=null&&(typeof row[key]!=='string'||row[key].length>JOURNAL_LIMIT))throw Error('Invalid journal content');result[key]=row[key]??'';}return result;});
 return {month,observedThrough:through,timezone:value.timezone,items};
}
export function journalMonthExport(snapshot,format='txt',en=false){
 if(!snapshot||!Array.isArray(snapshot.items)||!snapshot.items.length||!['txt','json'].includes(format))throw Error('No monthly journal to export');
 const labels=en?{win:'What went well',obstacle:'Obstacle',lesson:'Lesson',tomorrowFocus:'Tomorrow’s focus'}:journalFields;
 const metadata={version:1,month:snapshot.month,observedThrough:snapshot.observedThrough,timezone:snapshot.timezone,items:snapshot.items.map(row=>Object.fromEntries(['date',...Object.keys(journalFields)].map(key=>[key,row[key]])))};
 const content=format==='json'?JSON.stringify(metadata,null,2):['SelfForge — '+(en?'Saved monthly journal copy':'Bản sao nhật ký đã lưu theo tháng'),snapshot.month+' · '+snapshot.timezone,(en?'Observed through: ':'Dữ liệu đến ngày: ')+snapshot.observedThrough,(en?'Saved entries only. Unsaved drafts are excluded.':'Chỉ gồm bài đã lưu, không gồm bản nháp chưa lưu.'),...metadata.items.map(row=>[row.date,...Object.entries(labels).map(([key,label])=>label+'\n'+row[key])].join('\n\n'))].join('\n\n--------------------\n\n');
 return {filename:'selfforge-journal-'+snapshot.month+'.'+format,content,mime:format==='json'?'application/json;charset=utf-8':'text/plain;charset=utf-8'};
}
