import {validCalendarDate} from './dates.js';import {journalFields,JOURNAL_LIMIT} from './journalLimits.js';
export function journalDeletePayload(entry){
 if(!entry||!Number.isSafeInteger(entry.id)||entry.id<1||!validCalendarDate(entry.date))throw Error('Invalid saved journal');const expected={id:entry.id};
 for(const field of Object.keys(journalFields)){if(entry[field]!=null&&(typeof entry[field]!=='string'||entry[field].length>JOURNAL_LIMIT))throw Error('Invalid journal snapshot');expected[field]=entry[field]??'';}
 return {date:entry.date,expected};
}
