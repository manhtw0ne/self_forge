import {validCalendarDate} from './dates.js';
import {challengeWindowDays} from './challengeWindow.js';
export function challengeNextStep(challenge,progress,today){
 if(!validCalendarDate(today)||!challengeWindowDays(challenge)||!progress||!Number.isInteger(progress.completedDays)||progress.completedDays<0||!Number.isInteger(challenge.targetDays)||challenge.targetDays<1||challenge.targetDays>challengeWindowDays(challenge)||progress.completedDays>challengeWindowDays(challenge)||!['ACTIVE','COMPLETED','ABANDONED'].includes(challenge.status))return null;
 const remaining=Math.max(0,challenge.targetDays-progress.completedDays);
 if(challenge.status==='ABANDONED')return {kind:'STOPPED',remaining};
 if(remaining===0)return {kind:'REACHED',remaining};
 if(today<challenge.startDate)return {kind:'UPCOMING',remaining};
 if(today>challenge.endDate)return {kind:'ENDED',remaining};
 const calendarDays=Math.round((Date.parse(challenge.endDate+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000)+1;
 return {kind:remaining>calendarDays?'SHORT_WINDOW':'IN_PROGRESS',remaining,calendarDays};
}
