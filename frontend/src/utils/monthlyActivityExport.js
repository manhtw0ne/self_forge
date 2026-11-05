import {readMonthlyActivity,readMonthlyHabitActivity} from './monthlyActivity.js';import {encodeCsv} from './csv.js';
export function monthlyActivityExport(value,{kind,month,today,timezone},t=text=>text){
 if(!['days','habits'].includes(kind))throw Error('Invalid monthly export');const data={...readMonthlyActivity(value,month,today,timezone),...readMonthlyHabitActivity(value)};
 const metrics=['completed','failed','skipped','focusSessions','focusMinutes'],labels=['Hoàn thành','Thất bại','Bỏ qua','Phiên tập trung','Phút tập trung'];let rows;
 if(kind==='days')rows=[['Tháng','Múi giờ','Dữ liệu đến ngày','Ngày',...labels].map(t),...data.days.map(row=>[month,data.timezone,data.observedThrough,row.date,...metrics.map(key=>row[key])])];
 else rows=[['Tháng','Múi giờ','Dữ liệu đến ngày','Loại hoạt động','Mã thói quen','Thói quen','Trạng thái hiện tại',...labels].map(t),...data.habits.map(row=>[month,data.timezone,data.observedThrough,t('Gắn thói quen'),row.habitId,row.habitName,t(row.active?'Đang hoạt động':'Đã tạm dừng'),...metrics.map(key=>row[key])]),...(data.unlinkedFocusSessions>0?[[month,data.timezone,data.observedThrough,t('Không gắn thói quen'),'',t('Phiên tự do'),'',0,0,0,data.unlinkedFocusSessions,data.unlinkedFocusMinutes]]:[])];
 return {filename:'selfforge-month-'+kind+'-'+month+'.csv',text:encodeCsv(rows),mime:'text/csv;charset=utf-8'};
}
