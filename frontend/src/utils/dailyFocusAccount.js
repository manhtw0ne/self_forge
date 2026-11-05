import {validCalendarDate} from './dates.js';
import {dailyFocusPlan} from './dailyFocusPlan.js';

const energies=new Set(['LOW','MEDIUM','HIGH']);

export function readDailyFocusAccount(value,today){
 if(value===null||value==='')return null;
 if(!validCalendarDate(today)||!value||value.date!==today||!Number.isInteger(value.budget)||value.budget<5||value.budget>240||!energies.has(value.energy)||!Number.isSafeInteger(value.version)||value.version<1||!Array.isArray(value.habitIds)||value.habitIds.length<1||value.habitIds.length>3||new Set(value.habitIds).size!==value.habitIds.length||value.habitIds.some(id=>!Number.isSafeInteger(id)||id<1))throw Error('Invalid saved daily focus plan');
 return {date:value.date,budget:value.budget,energy:value.energy,habitIds:[...value.habitIds],version:value.version};
}

// Keep the server representation at the edge of the app. Planning helpers use
// the same validated draft shape whether it came from this browser or the account.
export function dailyFocusAccountDraft(value,today){
 const plan=readDailyFocusAccount(value,today);
 return plan===null?null:{version:1,date:plan.date,budget:plan.budget,energy:plan.energy,ids:[...plan.habitIds]};
}

export function dailyFocusAccountPayload(budget,energy,habitIds,habits,expectedVersion){
 dailyFocusPlan(budget,energy,habitIds,habits);
 if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0)throw Error('Invalid daily focus version');
 return {budget:Number(budget),energy,habitIds:[...habitIds],expectedVersion};
}
