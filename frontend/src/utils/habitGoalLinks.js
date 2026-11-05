import { validCalendarDate } from './dates.js';
export function readHabitGoalLinks(rows){
 if(!Array.isArray(rows))throw Error('Invalid links');
 const result=new Map();const pairs=new Set();
 for(const row of rows){
  if(!Number.isSafeInteger(row.habitId)||row.habitId<=0||!Number.isSafeInteger(row.goalId)||row.goalId<=0||typeof row.name!=='string'||!row.name.trim()||
   !['ACTIVE','COMPLETED','ABANDONED'].includes(row.status)||!Number.isInteger(row.currentValue)||row.currentValue<0||!Number.isInteger(row.targetValue)||row.targetValue<1||
   (row.unit!=null&&typeof row.unit!=='string')||(row.deadline!=null&&!validCalendarDate(row.deadline)))throw Error('Invalid goal link');
  const pair=`${row.habitId}:${row.goalId}`;if(pairs.has(pair))throw Error('Duplicate goal link');pairs.add(pair);
  if(!result.has(row.habitId))result.set(row.habitId,[]);
  result.get(row.habitId).push({goalId:row.goalId,name:row.name,status:row.status,currentValue:row.currentValue,targetValue:row.targetValue,unit:row.unit||'',deadline:row.deadline||null});
 }
 return result;
}
export function focusedGoal(search){
 const params=new URLSearchParams(search);const values=params.getAll('goal');
 if(values.length!==1||!/^\d+$/.test(values[0]))return null;
 const id=Number(values[0]);return Number.isSafeInteger(id)&&id>0?id:null;
}
