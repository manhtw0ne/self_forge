import {validCalendarDate} from './dates.js';
import {encodeCsv} from './csv.js';
export function challengePeriod(row,today){
 if(!validCalendarDate(today)||!validCalendarDate(row?.startDate)||!validCalendarDate(row.endDate)||row.startDate>row.endDate)return 'UNKNOWN';
 return today<row.startDate?'UPCOMING':today>row.endDate?'ENDED':'CURRENT';
}
const text=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
export function selectChallenges(rows,{today,status='ALL',habit='ALL',period='ALL',query='',sort='default'}){
 const words=text(query).trim().split(/\s+/).filter(Boolean);
 const result=rows.filter(row=>(status==='ALL'||row.status===status)&&(habit==='ALL'||String(row.habitId)===String(habit))&&(period==='ALL'||challengePeriod(row,today)===period)&&words.every(word=>text([row.name,row.habitName,row.description].join(' ')).includes(word)));
 if(sort==='start'||sort==='end')result.sort((a,b)=>String(a[sort==='start'?'startDate':'endDate']??'9999-12-31').localeCompare(String(b[sort==='start'?'startDate':'endDate']??'9999-12-31'))||a.id-b.id);
 if(sort==='name')result.sort((a,b)=>text(a.name).localeCompare(text(b.name))||a.id-b.id);
 return result;
}
export function challengeListExport(rows,today,t=value=>value){
 if(!validCalendarDate(today)||!Array.isArray(rows))throw Error('Invalid challenge list');const ids=new Set();
 const lines=rows.map(row=>{if(!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||typeof row.name!=='string'||typeof row.habitName!=='string'||!Number.isInteger(row.targetDays)||row.targetDays<1||row.targetDays>365||!['ACTIVE','COMPLETED','ABANDONED'].includes(row.status)||challengePeriod(row,today)==='UNKNOWN')throw Error('Invalid challenge');ids.add(row.id);
 return [row.name,row.habitName,row.startDate,row.endDate,row.targetDays,t({ACTIVE:'Đang chạy',COMPLETED:'Hoàn thành',ABANDONED:'Đã dừng thử thách'}[row.status]),t({UPCOMING:'Chưa đến ngày bắt đầu',CURRENT:'Trong khoảng thực hiện',ENDED:'Đã hết khoảng thực hiện'}[challengePeriod(row,today)])];});
 return {filename:'selfforge-challenges-'+today+'.csv',content:encodeCsv([[t('Thử thách'),t('Thói quen'),t('Ngày bắt đầu'),t('Ngày kết thúc'),t('Số ngày hoàn thành cần đạt'),t('Trạng thái'),t('Khoảng thời gian')],...lines])};
}
