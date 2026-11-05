import {profileTimezone,shiftDate,validCalendarDate} from './dates.js';
import {companionNextThreshold,companionStageForXp} from './companionProgression.js';

export const companionRhythmWindowDays=28;
export const companionRhythmMaximumForecastDays=365;

function estimatedDate(today,remaining,periodXp,nextThreshold){
 if(nextThreshold===null||periodXp===0)return null;
 const days=Math.ceil(remaining*companionRhythmWindowDays/periodXp);
 return days>companionRhythmMaximumForecastDays?null:shiftDate(today,days);
}

// Keep the client defensive: this card only displays a bounded summary and
// rejects a response whose dates, progression, or arithmetic do not agree.
export function readCompanionRhythm(value,today,timezone){
 const expectedStart=shiftDate(today,-(companionRhythmWindowDays-1));
 if(!value||value.windowStart!==expectedStart||value.observedThrough!==today||value.timezone!==profileTimezone(timezone)||value.periodDays!==companionRhythmWindowDays||
   ![value.periodXp,value.contributingDays,value.companionXp,value.stage,value.remainingXp].every(Number.isSafeInteger)||value.periodXp<0||value.contributingDays<0||value.contributingDays>companionRhythmWindowDays||value.companionXp<0||value.remainingXp<0)throw Error('Invalid companion rhythm');
 const stage=companionStageForXp(value.companionXp),nextThreshold=companionNextThreshold(stage);
 if(value.stage!==stage||value.nextThreshold!==nextThreshold)throw Error('Invalid companion rhythm progression');
 const remaining=nextThreshold===null?0:nextThreshold-value.companionXp;
 if(value.remainingXp!==remaining)throw Error('Invalid companion rhythm remaining XP');
 const estimate=estimatedDate(today,remaining,value.periodXp,nextThreshold);
 if(value.estimatedReachDate!==estimate||estimate!==null&&!validCalendarDate(estimate))throw Error('Invalid companion rhythm estimate');
 return {windowStart:expectedStart,observedThrough:today,timezone:profileTimezone(timezone),periodDays:companionRhythmWindowDays,periodXp:value.periodXp,contributingDays:value.contributingDays,companionXp:value.companionXp,stage,nextThreshold,remainingXp:remaining,estimatedReachDate:estimate};
}
