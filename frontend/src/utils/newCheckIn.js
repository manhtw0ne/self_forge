import {validCalendarDate} from './dates.js';
export function newCheckInPayload(habitId,date,status,note,today){if(!Number.isSafeInteger(habitId)||habitId<1||!validCalendarDate(date)||date!==today||!['COMPLETED','SKIPPED','FAILED'].includes(status)||typeof note!=='string'||note.length>255)throw Error('Invalid new check-in');return {habitId,date,status,note};}
