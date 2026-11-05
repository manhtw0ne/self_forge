import {encodeCsv} from './csv.js';
import {challengeHistory} from './challengeHistory.js';
const dayLabels={COMPLETED:'Hoàn thành',FAILED:'Thất bại',SKIPPED:'Bỏ qua',UNRECORDED:'Chưa ghi nhận',UPCOMING:'Chưa tới ngày'};
const challengeLabels={ACTIVE:'Đang chạy',COMPLETED:'Hoàn thành',ABANDONED:'Đã dừng thử thách'};
export function challengeExport(challenge,evidence,today,t=value=>value){
 if(!Number.isSafeInteger(challenge?.id)||challenge.id<1||!Number.isSafeInteger(challenge.habitId)||challenge.habitId<1||typeof challenge.name!=='string'||!challenge.name.trim()||typeof challenge.habitName!=='string'||!challengeLabels[challenge.status]||!Number.isInteger(challenge.targetDays)||challenge.targetDays<1)throw Error('Invalid challenge export');
 const rows=challengeHistory(evidence,challenge,today);if(challenge.targetDays>rows.length)throw Error('Invalid challenge target');
 const completed=rows.filter(row=>row.status==='COMPLETED').length;
 const status=challenge.status==='ABANDONED'?'ABANDONED':completed>=challenge.targetDays?'COMPLETED':'ACTIVE';
 const header=['Thử thách','Thói quen','Trạng thái thử thách','Ngày bắt đầu','Ngày kết thúc','Số ngày cần hoàn thành','Số ngày đã hoàn thành','Ngày xuất','Ngày','Trạng thái check-in','Tính vào tiến độ'];
 const csv=encodeCsv([header.map(t),...rows.map(row=>[challenge.name,challenge.habitName,t(challengeLabels[status]),challenge.startDate,challenge.endDate,challenge.targetDays,completed,today,row.date,t(dayLabels[row.status]),row.status==='COMPLETED'?1:0])]);
 return {filename:'selfforge-challenge-'+challenge.id+'-'+today+'.csv',text:csv,mime:'text/csv;charset=utf-8'};
}
