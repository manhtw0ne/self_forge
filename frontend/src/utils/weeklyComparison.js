import {readWeeklyInsight} from './weeklyInsight.js';import {shiftDate,calendarWeekStart} from './dates.js';
export const weeklyComparisonMetrics={completed:'Lượt check-in hoàn thành',failed:'Lượt check-in thất bại',skipped:'Lượt check-in bỏ qua',focusSessions:'Phiên tập trung hoàn thành',focusMinutes:'Phút tập trung đã ghi nhận'};
export function weeklyComparison(current,previous){
 for(const value of [current,previous]){
  readWeeklyInsight(value,value?.weekStart);
  if(calendarWeekStart(value.weekStart)!==value.weekStart||typeof value.timezone!=='string'||!value.timezone||value.focusMinutes<value.focusSessions*25||value.focusMinutes>value.focusSessions*120)throw Error('Invalid weekly comparison');
 }
 if(previous.weekStart!==shiftDate(current.weekStart,-7)||current.timezone!==previous.timezone||previous.observedThrough!==previous.weekEnd)throw Error('Mismatched weeks');
 const oldCheckIns=new Set(previous.evidence.map(row=>row.id)),oldFocus=new Set(previous.focusSourceIds);
 if(current.evidence.some(row=>oldCheckIns.has(row.id))||current.focusSourceIds.some(id=>oldFocus.has(id)))throw Error('Overlapping evidence');
 const complete=current.observedThrough===current.weekEnd;
 return {complete,timezone:current.timezone,current:{start:current.weekStart,end:current.observedThrough},previous:{start:previous.weekStart,end:previous.observedThrough},metrics:Object.entries(weeklyComparisonMetrics).map(([key,label])=>({key,label,current:current[key],previous:previous[key],delta:complete?current[key]-previous[key]:null}))};
}
export function weeklyComparisonExport(value,t=text=>text){
 const lines=[t('So sánh hai tuần liền kề'),value.previous.start+' → '+value.previous.end,value.current.start+' → '+value.current.end,value.timezone,t(value.complete?'Hai tuần đã đủ ngày; chênh lệch chỉ phản ánh số lượt đã ghi nhận.':'Tuần đang xem chưa đủ ngày; không tính chênh lệch với tuần đủ bảy ngày.'),''];
 for(const row of value.metrics)lines.push(t(row.label)+': '+row.previous+' → '+row.current+(row.delta===null?'':' ('+(row.delta>0?'+':'')+row.delta+')'));
 lines.push('',t('Không có check-in không được tính là thất bại. Số lượt tăng hoặc giảm không tự giải thích nguyên nhân.'));
 return {filename:'selfforge-week-comparison-'+value.current.start+'.txt',text:lines.join('\n')};
}
