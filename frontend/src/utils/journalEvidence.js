import {validCalendarDate,todayInTimezone,profileTimezone} from './dates.js';import {JOURNAL_LIMIT,journalFields} from './journalLimits.js';
export function journalCheckInEvidence(value,date){
 if(!validCalendarDate(date)||!Array.isArray(value))throw Error('Invalid journal evidence');const ids=new Set(),habits=new Set();
 return value.map(row=>{if(!row||!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||!Number.isSafeInteger(row.habitId)||row.habitId<1||habits.has(row.habitId)||row.date!==date||typeof row.habitName!=='string'||!['COMPLETED','FAILED','SKIPPED'].includes(row.status))throw Error('Invalid check-in source');ids.add(row.id);habits.add(row.habitId);return {id:row.id,habitId:row.habitId,name:row.habitName.replace(/[\r\n]+/g,' '),status:row.status};});
}
export function journalFocusEvidence(value,date,timezone){
 if(!validCalendarDate(date)||value?.date!==date||value.timezone!==profileTimezone(timezone)||!Array.isArray(value.sessions))throw Error('Invalid focus evidence');const ids=new Set();let minutes=0;
 for(const row of value.sessions){if(!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||!Number.isInteger(row.durationMinutes)||row.durationMinutes<25||row.durationMinutes>120||typeof row.startedAt!=='string'||!Number.isFinite(Date.parse(row.startedAt))||todayInTimezone(timezone,new Date(row.startedAt))!==date)throw Error('Invalid focus source');ids.add(row.id);minutes+=row.durationMinutes;}
 return {count:ids.size,minutes,sourceIds:[...ids]};
}
export function appendJournalEvidence(form,field,text){
 if(!Object.hasOwn(journalFields,field)||typeof form[field]!=='string'||typeof text!=='string'||!text.trim())throw Error('Invalid journal insertion');const line=text.trim();if(form[field].split('\n').some(value=>value.trim()===line))return form[field];const next=form[field]+(form[field]?'\n':'')+line;if(next.length>JOURNAL_LIMIT)throw Error('Journal limit');return next;
}
