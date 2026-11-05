import {readServerRestart} from './restartPlan.js';
import {shiftDate,validCalendarDate} from './dates.js';
export function readRestartDays(value,planVersion){
 if(!Number.isSafeInteger(planVersion)||planVersion<1||!value||value.planVersion!==planVersion||!Number.isSafeInteger(value.version)||value.version<0||!Array.isArray(value.tried)||value.tried.length!==3||value.tried.some(day=>typeof day!=='boolean'))throw Error('Invalid restart days');
 return {planVersion,version:value.version,tried:[...value.tried]};
}
export function restartDayRows(plan,value,today){
 const saved=readServerRestart(plan);if(!saved||!validCalendarDate(today))throw Error('Invalid plan date');
 const days=readRestartDays(value,saved.version);
 return saved.steps.map((action,index)=>{const date=shiftDate(saved.start,index);return {day:index+1,date,action,tried:days.tried[index],available:date<=today};});
}
export function restartDayRequest(value,day,tried){
 const saved=readRestartDays(value,value?.planVersion);if(!Number.isInteger(day)||day<1||day>3||typeof tried!=='boolean')throw Error('Invalid day request');
 return {planVersion:saved.planVersion,expectedVersion:saved.version,day,tried};
}
