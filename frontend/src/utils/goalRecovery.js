import {validCalendarDate,shiftDate} from './dates.js';
export function goalRecovery(goal,today,days){
 if(!validCalendarDate(today)||today<'0001-01-01'||![7,14,30].includes(days))throw Error('Invalid recovery period');
 if(!goal||goal.status!=='ACTIVE'||!validCalendarDate(goal.deadline)||goal.deadline>=today||!Number.isSafeInteger(goal.targetValue)||goal.targetValue<1||goal.targetValue>2147483647||!Number.isSafeInteger(goal.currentValue)||goal.currentValue<0||goal.currentValue>=goal.targetValue)return null;
 const deadline=shiftDate(today,days-1);if(!validCalendarDate(deadline))throw Error('Recovery date out of range');
 const remaining=goal.targetValue-goal.currentValue;
 return {deadline,days,remaining,perDay:Math.ceil(remaining/days),overdueDays:Math.round((Date.parse(today+'T00:00:00Z')-Date.parse(goal.deadline+'T00:00:00Z'))/86400000)};
}
