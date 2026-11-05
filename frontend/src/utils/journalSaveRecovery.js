import {validCalendarDate} from './dates.js';
import {JOURNAL_LIMIT,journalFields} from './journalLimits.js';

function text(value){return value==null?'':value;}

// A matching server copy is confirmation of the final desired state, never proof about request ordering.
export function journalSaveConfirmed(entry,date,submitted){
 if(!entry||!Number.isSafeInteger(entry.id)||entry.id<1||entry.date!==date||!validCalendarDate(date)||!submitted)return false;
 return Object.keys(journalFields).every(field=>typeof submitted[field]==='string'&&submitted[field].length<=JOURNAL_LIMIT&&typeof text(entry[field])==='string'&&text(entry[field]).length<=JOURNAL_LIMIT&&text(entry[field])===submitted[field]);
}
