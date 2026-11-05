import {focusPlan,focusHabits} from './focusPlan.js';
export function dailyFocusPlan(budget,energy,selectedIds,habits){
 const preference=focusPlan(budget,energy),minutes=Number(budget);
 if(!Array.isArray(selectedIds)||selectedIds.length<1||selectedIds.length>3||new Set(selectedIds).size!==selectedIds.length||!Array.isArray(habits))throw Error('Choose one to three available habits');
 const owned=focusHabits(habits);
 const chosen=selectedIds.map(id=>{if(!Number.isSafeInteger(id)||id<1)throw Error('Invalid habit');const habit=owned.find(row=>row.id===id);if(!habit)throw Error('Habit is no longer available');return habit;});
 if(!preference.focusMinutes)return {budget:minutes,focusMinutes:0,breakMinutes:0,unusedMinutes:minutes-Math.min(5,minutes),smallStep:{...chosen[0],minutes:Math.min(5,minutes)},sessions:[],unallocated:chosen.slice(1)};
 // Reserve at least 25 minutes for every allocated habit and five minutes between sessions.
 const count=Math.min(chosen.length,Math.floor((minutes+5)/30));
 const breaks=(count-1)*5,available=minutes-breaks,cap={LOW:25,MEDIUM:45,HIGH:60}[energy];
 let remaining=available;const sessions=[];
 for(let index=0;index<count;index++){
  const duration=Math.min(cap,remaining-(count-index-1)*25);
  sessions.push({...chosen[index],minutes:duration,breakBefore:index===0?0:5});remaining-=duration;
 }
 return {budget:minutes,focusMinutes:sessions.reduce((total,row)=>total+row.minutes,0),breakMinutes:breaks,unusedMinutes:remaining,smallStep:null,sessions,unallocated:chosen.slice(count)};
}
