import {dailyFocusDraft} from './dailyFocusDraft.js';
import {dailyFocusPlan} from './dailyFocusPlan.js';
import {readFocusSession} from './focusRecovery.js';
import {todayInTimezone} from './dates.js';
export function dailyFocusContinuation(draft,session,owned,today,timezone){
 const saved=dailyFocusDraft(draft),completed=readFocusSession(session);
 if(saved.date!==today||!completed.completed||completed.habitId===null||todayInTimezone(timezone,new Date(completed.startedAt))!==today)return null;
 if(!Array.isArray(owned)||owned.some(row=>!Number.isSafeInteger(row.id)||row.id<1||typeof row.name!=='string'))throw Error('Invalid owned habits');
 // This is evidence for a plan that was already chosen today. The Pomodoro
 // API has ownership/active facts rather than Dashboard schedule fields, so
 // carry an explicit due marker into the shared planner contract.
 const available=owned.filter(row=>row.active===true).map(row=>({habitId:row.id,name:row.name,scheduledToday:true,todayStatus:null}));
 const plan=dailyFocusPlan(saved.budget,saved.energy,saved.ids,available);
 const index=plan.sessions.findIndex(row=>row.id===completed.habitId&&row.minutes===completed.durationMinutes);
 if(index<0)return null;
 return {position:index+1,total:plan.sessions.length,current:plan.sessions[index],next:plan.sessions[index+1]??null,unallocated:plan.unallocated};
}
