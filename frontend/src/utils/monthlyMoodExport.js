import {monthlyMood} from './monthlyMood.js';import {shiftDate} from './dates.js';import {encodeCsv} from './csv.js';
export function monthlyMoodExport(value,{month,today,timezone},t=text=>text){
 const data=monthlyMood(value,month,today,timezone),entries=new Map(data.entries.map(row=>[row.date,row.score]));
 const rows=[['Tháng','Múi giờ','Dữ liệu đến ngày','Ngày','Mức tâm trạng (1–5)','Trạng thái ghi nhận'].map(t),...Array.from({length:data.observedDays},(_,index)=>{const date=shiftDate(data.startDate,index),score=entries.get(date);return [month,value.timezone,data.observedThrough,date,score??'',t(score===undefined?'Chưa ghi nhận':'Đã ghi nhận')];})];
 return {filename:'selfforge-mood-'+month+'.csv',text:encodeCsv(rows),mime:'text/csv;charset=utf-8'};
}
