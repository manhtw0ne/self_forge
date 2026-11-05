import {readWeeklyInsight} from './weeklyInsight.js';

export function readWeeklyCoachStatus(value){
 if(!value||typeof value.available!=='boolean'||value.journalsIncluded!==false||!Number.isInteger(value.limit)||value.limit<0||value.limit>100||!Number.isInteger(value.remaining)||value.remaining<0||value.remaining>value.limit)throw Error('Invalid coach status');
 return {available:value.available,journalsIncluded:false,limit:value.limit,remaining:value.remaining};
}

export function weeklyCoachPayload(snapshot,consent,language){
 readWeeklyInsight(snapshot,snapshot?.weekStart);
 if(consent!==true||!['vi','en'].includes(language))throw Error('Invalid coach request');
 return {weekStart:snapshot.weekStart,consent:true,language};
}

export function weeklyCoachFeedbackPayload(snapshot,{helpfulnessRating=null,followUpDecision=null}={},language){
 readWeeklyInsight(snapshot,snapshot?.weekStart);
 if(!['vi','en'].includes(language)||(helpfulnessRating===null&&followUpDecision===null))throw Error('Invalid coach feedback');
 if(helpfulnessRating!==null&&(!Number.isInteger(helpfulnessRating)||helpfulnessRating<1||helpfulnessRating>5))throw Error('Invalid coach helpfulness rating');
 if(followUpDecision!==null&&!['WILL_TRY','NOT_NOW'].includes(followUpDecision))throw Error('Invalid coach follow-up decision');
 return {weekStart:snapshot.weekStart,language,helpfulnessRating,followUpDecision};
}

function text(value,maximum){
 if(typeof value!=='string'||!value.trim()||value.trim().length>maximum)throw Error('Invalid coach text');
 return value.trim();
}

export function readWeeklyCoachAdvice(value,snapshot){
 readWeeklyInsight(snapshot,snapshot?.weekStart);
 if(!value||!Array.isArray(value.observations)||value.observations.length<1||value.observations.length>3||!Array.isArray(value.experiments)||value.experiments.length<1||value.experiments.length>3)throw Error('Invalid coach response');
 const allowed=new Set(snapshot.evidence.map(row=>row.habitId));const seen=new Set();
 const observations=value.observations.map(row=>{
  if(!Number.isSafeInteger(row?.habitId)||row.habitId<1||!allowed.has(row.habitId)||seen.has(row.habitId))throw Error('Invalid coach observation');
  seen.add(row.habitId);return {habitId:row.habitId,text:text(row.text,420)};
 });
 const helpfulnessRating=value.helpfulnessRating??null,followUpDecision=value.followUpDecision??null;
 if(helpfulnessRating!==null&&(!Number.isInteger(helpfulnessRating)||helpfulnessRating<1||helpfulnessRating>5))throw Error('Invalid coach helpfulness rating');
 if(followUpDecision!==null&&!['WILL_TRY','NOT_NOW'].includes(followUpDecision))throw Error('Invalid coach follow-up decision');
 return {headline:text(value.headline,280),observations,experiments:value.experiments.map(item=>text(item,280)),helpfulnessRating,followUpDecision};
}
