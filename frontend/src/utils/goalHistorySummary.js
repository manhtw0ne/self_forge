import {readGoalCorrectionHistory} from './goalCorrectionHistory.js';
import {encodeCsv} from './csv.js';
const labels={ALL:'Tất cả',ADD:'Cộng tiến độ',CORRECTION:'Điều chỉnh số lượng'};
export function goalHistorySummary(data,goalId,kind='ALL'){
 if(!Object.hasOwn(labels,kind))throw Error('Invalid history filter');
 const rows=readGoalCorrectionHistory(data,goalId,null,kind==='ALL'?null:kind).items;
 const groups=new Map();let additions=0,corrections=0;
 for(const row of rows){const delta=row.toValue-row.fromValue;if(row.kind==='ADD'&&delta<0)throw Error('Invalid addition');
  if(!groups.has(row.unit))groups.set(row.unit,{unit:row.unit,added:0,increased:0,decreased:0});const group=groups.get(row.unit);
  if(row.kind==='ADD'){additions++;group.added+=delta;}else{corrections++;group.increased+=Math.max(0,delta);group.decreased+=Math.max(0,-delta);}
 }
 return {count:rows.length,additions,corrections,groups:[...groups.values()]};
}
export function goalHistoryPageExport(data,goal,page,kind='ALL',t=value=>value){
 if(!Number.isSafeInteger(goal?.id)||goal.id<1||typeof goal.name!=='string'||!goal.name.trim()||goal.name.length>255||!Number.isSafeInteger(page)||page<1)throw Error('Invalid history export');
 goalHistorySummary(data,goal.id,kind);
 const rows=readGoalCorrectionHistory(data,goal.id).items;
 return {filename:'selfforge-goal-'+goal.id+'-history-page-'+page+'.csv',content:encodeCsv([
  [t('Phạm vi'),t('Chỉ trang lịch sử đang xem'),t('Trang'),page,t('Loại thay đổi'),t(labels[kind])],
  [t('Mục tiêu'),t('Thời điểm ghi nhận (UTC)'),t('Loại thay đổi'),t('Trước thay đổi'),t('Sau thay đổi'),t('Chỉ tiêu khi ghi nhận'),t('Đơn vị khi ghi nhận'),t('Trạng thái trước'),t('Trạng thái sau')],
  ...rows.map(row=>[goal.name,row.createdAt,t(labels[row.kind]),row.fromValue,row.toValue,row.targetValue,row.unit,t(row.fromStatus==='COMPLETED'?'Đã hoàn thành':'Đang thực hiện'),t(row.toStatus==='COMPLETED'?'Đã hoàn thành':'Đang thực hiện')])
 ])};
}
