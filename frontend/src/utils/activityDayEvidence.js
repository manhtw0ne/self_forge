import {journalCheckInEvidence,journalFocusEvidence} from './journalEvidence.js';
export function activityDayEvidence(checkIns,focus,expected,timezone){
 const checks=journalCheckInEvidence(checkIns,expected.date),summary=journalFocusEvidence(focus,expected.date,timezone);
 const totals={completed:checks.filter(row=>row.status==='COMPLETED').length,failed:checks.filter(row=>row.status==='FAILED').length,skipped:checks.filter(row=>row.status==='SKIPPED').length,focusSessions:summary.count,focusMinutes:summary.minutes};
 const sessions=focus.sessions.map(row=>{if(row.habitId!==null&&(!Number.isSafeInteger(row.habitId)||row.habitId<1))throw Error('Invalid focus habit');return {id:row.id,habitId:row.habitId,durationMinutes:row.durationMinutes,startedAt:row.startedAt};});
 return {date:expected.date,checks,sessions,...totals,matches:Object.keys(totals).every(key=>totals[key]===expected[key])};
}
