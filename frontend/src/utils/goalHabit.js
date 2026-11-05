export const GOAL_HABIT_PENDING = 'sf:goal-habit-pending';
const notify=()=>{try{if(typeof window!=='undefined')window.dispatchEvent(new Event(GOAL_HABIT_PENDING));}catch{/* Optional refresh. */}};
import { validCalendarDate } from './dates.js';
import { goalSnapshot } from './goalForm.js';
const key=owner=>{if(!Number.isSafeInteger(owner)||owner<=0)throw Error('Invalid owner');return `sf_goal_habit:${owner}`;};
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export function goalHabitPayload(form) {
 if(!form||typeof form.name!=='string'||!form.name.trim()||form.name.length>255||typeof form.description!=='string'||form.description.length>255||
    !['EASY','MEDIUM','HARD'].includes(form.difficulty)||!Number.isInteger(Number(form.targetPerWeek))||Number(form.targetPerWeek)<1||Number(form.targetPerWeek)>7)throw Error('Invalid habit');
 return {name:form.name.trim(),description:form.description.trim(),difficulty:form.difficulty,targetPerWeek:Number(form.targetPerWeek)};
}
function validate(value){
 if(!value||!Number.isSafeInteger(value.goalId)||value.goalId<=0||!uuid.test(value.requestId)||value.expected?.id!==value.goalId||
    typeof value.expected.name!=='string'||value.expected.name.length>255||!Number.isInteger(value.expected.targetValue)||value.expected.targetValue<1||
    !Number.isInteger(value.expected.currentValue)||value.expected.currentValue<0||!['ACTIVE','COMPLETED','ABANDONED'].includes(value.expected.status)||
    (value.expected.deadline!=null&&!validCalendarDate(value.expected.deadline)))throw Error('Invalid pending goal habit');
 const action=value.action||'CREATE';
 if(!['CREATE','LINK'].includes(action)||(action==='LINK'&&(!Number.isSafeInteger(value.habitId)||value.habitId<=0)))throw Error('Invalid action');
 return {goalId:value.goalId,requestId:value.requestId,action,...(action==='LINK'?{habitId:value.habitId}:{habit:goalHabitPayload(value.habit)}),expected:goalSnapshot(value.expected)};
}
export function readGoalHabit(storage,owner){const raw=storage.getItem(key(owner));return raw?validate(JSON.parse(raw)):null;}
export function createGoalHabit(storage,owner,goalId,habit,expected,post,makeId){return applyGoalHabit(storage,owner,goalId,{action:'CREATE',habit},expected,post,makeId);}
export async function applyGoalHabit(storage,owner,goalId,proposal,expected,post,makeId=()=>crypto.randomUUID()){
 const prior=readGoalHabit(storage,owner);
 if(prior&&prior.goalId!==goalId)throw Error('Another goal has a pending request');
 if(prior&&prior.action!==proposal.action)throw Error("Another action has a pending request");
 const payload=validate(prior||{...proposal,goalId,expected,requestId:makeId()});
 try{storage.setItem(key(owner),JSON.stringify(payload));notify();}catch{throw Error('Goal habit request not sent');}
 let response;
 try{response=await post(payload);if(!Number.isSafeInteger(response.data?.id)||response.data.id<=0||typeof response.data.name!=='string'||(payload.action==='LINK'&&response.data.id!==payload.habitId))throw Error('Invalid creation response');}catch(error){
  if([400,403,404,409,422].includes(error.response?.status)){try{storage.removeItem(key(owner));notify();}catch{/* Preserve original failure. */}}
  throw error;
 }
 try{storage.removeItem(key(owner));notify();return {response,pending:null};}catch{return {response,pending:payload};}
}
