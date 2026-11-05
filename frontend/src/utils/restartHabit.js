import {restartSteps,restartPayload} from './restartPlan.js';
export function restartHabitDraft(habit,reason,today,t=value=>value){
 if(!habit||!Number.isSafeInteger(habit.id)||habit.id<1||typeof habit.name!=='string'||!habit.name.trim()||habit.name.length>255)throw Error('Invalid source habit');
 return restartPayload({name:habit.name,reason,start:today,steps:restartSteps(reason,t)});
}

export function restartPlanPath(habitId){
 if(!Number.isSafeInteger(habitId)||habitId<1)throw Error('Invalid source habit');
 return '/?restartHabit='+habitId+'#dashboard-restart';
}

/** A restart invitation must be based on saved setbacks, never absent check-ins. */
export function shouldOfferRestart(habit){
 return habit?.scheduledToday===true&&!habit.todayStatus&&Number.isSafeInteger(habit.recordedSetbacksThisWeek)&&habit.recordedSetbacksThisWeek>=2;
}

export function readRestartHabitTarget(search){
 const params=new URLSearchParams(search),values=params.getAll('restartHabit');
 if(values.length!==1||!/^\d+$/.test(values[0]))return null;
 const id=Number(values[0]);
 return Number.isSafeInteger(id)&&id>0?id:null;
}
