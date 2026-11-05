import { validCalendarDate, shiftDate } from './dates.js';
export function readWeeklyInsight(value, week) {
 if (!validCalendarDate(week) || !value || value.weekEnd !== shiftDate(week,6) || value.version !== 1 || value.weekStart !== week || !validCalendarDate(value.weekEnd) ||
     !validCalendarDate(value.observedThrough) || value.observedThrough < week || value.observedThrough > value.weekEnd ||
     !['FIRST_CHECK_IN','SMALLER_STEP','REVIEW_SCHEDULE','KEEP_SMALL_STEP'].includes(value.suggestion) ||
     !Array.isArray(value.evidence) || !Array.isArray(value.focusSourceIds) ||
     !['completed','failed','skipped','focusSessions','focusMinutes'].every(key => Number.isSafeInteger(value[key]) && value[key] >= 0)) throw Error('Invalid summary');
 const ids=new Set(); const counts={COMPLETED:0,FAILED:0,SKIPPED:0};
 for(const row of value.evidence) {
  if(!Number.isSafeInteger(row.id) || row.id<=0 || ids.has(row.id) || !Object.hasOwn(counts,row.status) ||
     !validCalendarDate(row.date) || row.date<week || row.date>value.observedThrough) throw Error('Invalid evidence');
  ids.add(row.id);counts[row.status]++;
 }
 if(counts.COMPLETED!==value.completed || counts.FAILED!==value.failed || counts.SKIPPED!==value.skipped ||
    value.focusSourceIds.length!==value.focusSessions || new Set(value.focusSourceIds).size!==value.focusSessions ||
    value.focusSourceIds.some(id=>!Number.isSafeInteger(id)||id<=0))throw Error('Invalid totals');
 const expectedSuggestion=value.evidence.length===0?'FIRST_CHECK_IN':value.failed>=2?'SMALLER_STEP':value.skipped>=2?'REVIEW_SCHEDULE':'KEEP_SMALL_STEP';
 if(value.suggestion!==expectedSuggestion)throw Error('Unsupported suggestion');
 return value;
}
