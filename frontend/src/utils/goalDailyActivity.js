import {encodeCsv} from './csv.js';
import {validCalendarDate,shiftDate} from './dates.js';
export function readGoalDailyActivity(value,goalId,days){
 if(![7,30,90].includes(days)||value?.goalId!==goalId||!validCalendarDate(value.fromDate)||!validCalendarDate(value.toDate)||shiftDate(value.fromDate,days-1)!==value.toDate||typeof value.timezone!=='string'||!Array.isArray(value.items))throw Error('Invalid goal activity');
 new Intl.DateTimeFormat('en',{timeZone:value.timezone});
 const seen=new Set();for(const row of value.items){const key=JSON.stringify([row.date,row.unit]);if(!validCalendarDate(row.date)||row.date<value.fromDate||row.date>value.toDate||typeof row.unit!=='string'||row.unit.length>255||seen.has(key)||!['additions','corrections','added','increased','decreased'].every(k=>Number.isSafeInteger(row[k])&&row[k]>=0)||row.additions+row.corrections===0)throw Error('Invalid activity row');seen.add(key);}
 return {...value,items:[...value.items].sort((a,b)=>b.date.localeCompare(a.date)||a.unit.localeCompare(b.unit))};
}

export function goalDailySummary(value,goalId,days){
 const data=readGoalDailyActivity(value,goalId,days);const dates=new Set();const groups=new Map();let additions=0,corrections=0;
 const sum=(a,b)=>{const result=a+b;if(!Number.isSafeInteger(result))throw Error('Activity total too large');return result;};
 for(const row of data.items){dates.add(row.date);additions=sum(additions,row.additions);corrections=sum(corrections,row.corrections);if(!groups.has(row.unit))groups.set(row.unit,{unit:row.unit,added:0,increased:0,decreased:0,net:0});const group=groups.get(row.unit);for(const key of ['added','increased','decreased'])group[key]=sum(group[key],row[key]);group.net=sum(sum(group.added,group.increased),-group.decreased);}
 return {activeDays:dates.size,additions,corrections,groups:[...groups.values()]};
}
export function goalDailyExport(value,goalId,days,en=false){
 const data=readGoalDailyActivity(value,goalId,days);goalDailySummary(data,goalId,days);
 return {filename:'selfforge-goal-'+goalId+'-activity-'+data.fromDate+'-'+data.toDate+'.csv',content:encodeCsv([
  [en?'Scope':'Phạm vi',en?'All recorded changes in the selected period':'Toàn bộ thay đổi ghi nhận trong khoảng đã chọn',data.fromDate,data.toDate,data.timezone],
  [en?'Note':'Lưu ý',en?'Historical units remain separate. No records does not mean failure. Not XP or current total progress.':'Giữ riêng đơn vị lịch sử. Không có bản ghi không phải thất bại. Không phải XP hay tổng tiến độ hiện tại.'],
  en?['Date','Historical unit','Addition records','Correction records','Added','Correction increase','Correction decrease']:['Ngày','Đơn vị khi ghi nhận','Lượt cộng','Lượt điều chỉnh','Cộng thêm','Điều chỉnh tăng','Điều chỉnh giảm'],
  ...data.items.map(row=>[row.date,row.unit,row.additions,row.corrections,row.added,row.increased,row.decreased])
 ])};
}
