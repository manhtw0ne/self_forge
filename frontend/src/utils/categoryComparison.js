import {readCategoryActivity,categoryActivityName} from './categoryActivity.js';
import {encodeCsv} from './csv.js';
export function categoryComparison(first,second,today,timezone){
 if(!first||!second||first.month>=second.month)throw Error('Choose two different chronological months');
 const before=readCategoryActivity(first,first.month,today,timezone),after=readCategoryActivity(second,second.month,today,timezone);
 const groups=new Map();for(const row of before.categories)groups.set(row.categoryId,{categoryId:row.categoryId,before:row,after:null});for(const row of after.categories){if(!groups.has(row.categoryId))groups.set(row.categoryId,{categoryId:row.categoryId,before:null,after:null});groups.get(row.categoryId).after=row;}
 const rows=[...groups.values()].map(group=>({...group,completedDelta:(group.after?.completed??0)-(group.before?.completed??0),recordedDelta:(group.after?.checkIns??0)-(group.before?.checkIns??0)})).sort((a,b)=>Math.abs(b.completedDelta)-Math.abs(a.completedDelta)||(a.categoryId??0)-(b.categoryId??0));
 return {before,after,rows,completedDelta:after.completed-before.completed,recordedDelta:after.checkIns-before.checkIns};
}
export function categoryComparisonExport(comparison,en=false){
 const label=row=>row?categoryActivityName(row,v=>v==='Không có danh mục'?(en?'Uncategorized':v):v):'';
 return {filename:'selfforge-category-comparison-'+comparison.before.month+'-'+comparison.after.month+'.csv',content:encodeCsv([
  [en?'Earlier month':'Tháng trước',comparison.before.month,en?'Observed through':'Quan sát đến',comparison.before.observedThrough],
  [en?'Later month':'Tháng sau',comparison.after.month,en?'Observed through':'Quan sát đến',comparison.after.observedThrough,comparison.after.timezone],
  [en?'Current category assignments; recorded check-ins only. Missing entries are not failures. Different month lengths and partial months affect comparisons.':'Phân nhóm theo danh mục hiện tại; chỉ tính check-in đã ghi. Thiếu bản ghi không phải thất bại. Độ dài tháng và tháng chưa kết thúc ảnh hưởng so sánh.'],
  en?['Category','Earlier completed','Later completed','Completed change','Earlier failed','Later failed','Earlier skipped','Later skipped','Earlier recorded','Later recorded']:['Danh mục','Hoàn thành tháng trước','Hoàn thành tháng sau','Chênh lệch hoàn thành','Thất bại tháng trước','Thất bại tháng sau','Bỏ qua tháng trước','Bỏ qua tháng sau','Đã ghi tháng trước','Đã ghi tháng sau'],
  ...comparison.rows.map(row=>[label(row.after??row.before),row.before?.completed??0,row.after?.completed??0,row.completedDelta,row.before?.failed??0,row.after?.failed??0,row.before?.skipped??0,row.after?.skipped??0,row.before?.checkIns??0,row.after?.checkIns??0])
 ])};
}
