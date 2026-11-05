import {readServerWeekPlan} from './weekPlan.js';
import {calendarWeekStart,validCalendarDate} from './dates.js';
export function weekPlanFocusLink(value,minutes=25){
 const plan=readServerWeekPlan(value,value?.week);if(!plan||plan.completed||!Number.isInteger(minutes)||minutes<25||minutes>120)throw Error('Invalid weekly focus proposal');
 return '/pomodoro?'+new URLSearchParams({focus:String(minutes),week:plan.week,planVersion:String(plan.version)});
}
export function readWeekPlanFocus(search){
 const params=new URLSearchParams(search);if(!params.has('week')&&!params.has('planVersion'))return null;
 const week=params.get('week'),version=params.get('planVersion'),focus=params.get('focus');
 if(['week','planVersion','focus'].some(key=>params.getAll(key).length!==1)||params.has('habit')||!validCalendarDate(week)||calendarWeekStart(week)!==week||!/^\d+$/.test(version??'')||!/^\d+$/.test(focus??'')||!Number.isSafeInteger(Number(version))||Number(version)<1||Number(focus)<25||Number(focus)>120)return {invalid:true};
 return {week,version:Number(version),minutes:Number(focus),invalid:false};
}
export function verifiedWeekPlanFocus(value,target){if(!target||target.invalid)throw Error('Invalid weekly focus link');const plan=readServerWeekPlan(value,target.week);if(!plan||plan.version!==target.version||plan.completed)throw Error('Weekly plan changed');return plan;}
