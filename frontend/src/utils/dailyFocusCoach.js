import {dailyFocusPlan} from './dailyFocusPlan.js';

const energies=new Set(['LOW','MEDIUM','HIGH']);

export function readDailyFocusCoachStatus(value){
 if(!value||typeof value.available!=='boolean'||!Number.isInteger(value.limit)||value.limit<0||value.limit>100||!Number.isInteger(value.remaining)||value.remaining<0||value.remaining>value.limit)throw Error('Invalid daily focus coach status');
 return {available:value.available,limit:value.limit,remaining:value.remaining};
}

export function dailyFocusCoachPayload({budget,energy,ids,habits,consent,language}){
 dailyFocusPlan(budget,energy,ids,habits);
 if(!consent||!['vi','en'].includes(language)||!energies.has(energy))throw Error('Invalid daily focus coach request');
 return {budget:Number(budget),energy,habitIds:[...ids],consent:true,language};
}

export function readDailyFocusCoachPlan(value,selectedIds){
 if(!value||typeof value.headline!=='string'||!value.headline.trim()||value.headline.trim().length>280||!Array.isArray(value.priorityHabitIds)||!Array.isArray(selectedIds)||selectedIds.length<1||selectedIds.length>3||value.priorityHabitIds.length!==selectedIds.length)throw Error('Invalid daily focus coach plan');
 const ids=value.priorityHabitIds;
 if(ids.some(id=>!Number.isSafeInteger(id)||id<1)||new Set(ids).size!==ids.length||new Set(selectedIds).size!==selectedIds.length||!ids.every(id=>selectedIds.includes(id)))throw Error('Invalid daily focus coach plan');
 return {headline:value.headline.trim(),priorityHabitIds:[...ids]};
}
