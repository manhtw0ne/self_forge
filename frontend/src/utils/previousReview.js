import {validCalendarDate,calendarWeekStart,shiftDate} from './dates.js';
export function previousReviewWeek(week){
 if(!validCalendarDate(week)||week<'0001-01-01'||calendarWeekStart(week)!==week)throw Error('Invalid review week');
 return week<'0001-01-08'?null:shiftDate(week,-7);
}
export function previousReviewPlan(reviews,week){
 if(!Array.isArray(reviews))throw Error('Invalid review history');const previous=previousReviewWeek(week);if(!previous)return null;
 const matches=reviews.filter(row=>row?.weekStart===previous);if(!matches.length)return null;if(matches.length!==1)throw Error('Ambiguous review source');
 const row=matches[0];if(!Number.isSafeInteger(row.id)||row.id<1||(row.nextWeekPlan!=null&&(typeof row.nextWeekPlan!=='string'||row.nextWeekPlan.length>2000)))throw Error('Invalid previous review plan');
 return {id:row.id,weekStart:previous,targetWeek:week,plan:row.nextWeekPlan??''};
}
export function appendReviewText(form,field,text){
 if(!['wins','improvements','nextWeekPlan'].includes(field)||typeof form?.[field]!=='string'||form[field].length>2000||typeof text!=='string'||!text.trim())throw Error('Invalid review insertion');
 const content=text.trim(),current=form[field];
 if(current.trim()===content||current.startsWith(content+'\n\n')||current.endsWith('\n\n'+content)||current.includes('\n\n'+content+'\n\n'))return current;
 const result=current+(current?'\n\n':'')+content;if(result.length>2000)throw Error('Review limit');return result;
}
export function previousReviewQuestion(source,week,t=(value,params)=>value.replace('{week}',params.week)){
 if(!source||source.weekStart!==previousReviewWeek(week)||source.targetWeek!==week||typeof source.plan!=='string'||!source.plan.trim())throw Error('No previous plan');
 return t('Kế hoạch từ tổng kết tuần {week} đã được thực hiện đến đâu? Điều gì nên giữ lại, điều chỉnh hoặc bỏ?',{week:source.weekStart});
}
