import {activityMonth} from './monthlyActivity.js';
import {validCalendarDate,shiftDate,profileTimezone} from './dates.js';
import {encodeCsv} from './csv.js';
export function readCategoryActivity(value,month,today,timezone){
 if(!validCalendarDate(month+'-01')||month>activityMonth(today)||month<activityMonth(today,-23))throw Error('Invalid category month');
 const next=new Date(month+'-01T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);const end=shiftDate(next.toISOString().slice(0,10),-1),through=end<today?end:today;
 if(!value||value.month!==month||value.observedThrough!==through||value.timezone!==profileTimezone(timezone)||!Array.isArray(value.categories))throw Error('Invalid category activity');
 const ids=new Set(),totals={completed:0,failed:0,skipped:0,checkIns:0};
 const categories=value.categories.map(row=>{
  if(!row||row.categoryId!==null&&(!Number.isSafeInteger(row.categoryId)||row.categoryId<1)||ids.has(row.categoryId)||typeof row.name!=='string'||row.name.length>255||typeof row.systemDefault!=='boolean'||(row.categoryId===null&&(row.name!==''||row.systemDefault))||row.categoryId!==null&&!row.name.trim()||!Number.isSafeInteger(row.habits)||row.habits<1)throw Error('Invalid category group');ids.add(row.categoryId);
  for(const key of Object.keys(totals)){if(!Number.isSafeInteger(row[key])||row[key]<0)throw Error('Invalid category counts');totals[key]+=row[key];}
  if(row.checkIns!==row.completed+row.failed+row.skipped||row.checkIns<row.habits||row.checkIns>row.habits*Number(through.slice(-2)))throw Error('Invalid observed category counts');
  return {categoryId:row.categoryId,name:row.name,systemDefault:row.systemDefault,habits:row.habits,completed:row.completed,failed:row.failed,skipped:row.skipped,checkIns:row.checkIns};
 });
 if(Object.keys(totals).some(key=>!Number.isSafeInteger(totals[key])||value[key]!==totals[key]))throw Error('Mismatched category totals');
 return {month,observedThrough:through,timezone:value.timezone,...totals,categories};
}
export function categoryActivityName(row,t=value=>value){return row.categoryId===null?t('Không có danh mục'):row.systemDefault?t(row.name):row.name;}
export function categoryActivityExport(data,t=value=>value){
 return {filename:'selfforge-categories-'+data.month+'.csv',content:encodeCsv([
  [t('Tháng'),data.month,t('Quan sát đến ngày'),data.observedThrough,t('Múi giờ'),data.timezone],
  [t('Phân nhóm theo danh mục hiện tại, không phải danh mục tại thời điểm check-in.')],
  [t('Danh mục'),t('Thói quen có check-in'),t('Hoàn thành'),t('Thất bại'),t('Bỏ qua'),t('Tổng lượt đã ghi')],
  ...data.categories.map(row=>[categoryActivityName(row,t),row.habits,row.completed,row.failed,row.skipped,row.checkIns])
 ])};
}
