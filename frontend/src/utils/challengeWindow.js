import {validCalendarDate,shiftDate} from './dates.js';
export function challengeWindow(target,window,today){
 const targetDays=Number(target),windowDays=Number(window??target);if(!validCalendarDate(today)||!Number.isInteger(targetDays)||targetDays<1||!Number.isInteger(windowDays)||windowDays<targetDays||windowDays>365)throw Error('Invalid challenge window');
 const endDate=shiftDate(today,windowDays-1);if(!validCalendarDate(endDate))throw Error('Invalid challenge end');return {targetDays,windowDays,startDate:today,endDate};
}
export function challengeWindowDays(challenge){
 if(!validCalendarDate(challenge?.startDate)||!validCalendarDate(challenge.endDate)||challenge.endDate<challenge.startDate)return null;const days=Math.round((Date.parse(challenge.endDate+'T00:00:00Z')-Date.parse(challenge.startDate+'T00:00:00Z'))/86400000)+1;return days>=1&&days<=365?days:null;
}
