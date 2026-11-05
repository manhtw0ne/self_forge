import {readGoalCorrectionHistory} from './goalCorrectionHistory.js';
import {validCalendarDate,todayInTimezone} from './dates.js';
export function readGoalDayHistory(value,goalId,date,beforeId=null){
 if(!validCalendarDate(date)||value?.date!==date||typeof value.timezone!=='string')throw Error('Invalid goal day');
 new Intl.DateTimeFormat('en',{timeZone:value.timezone});
 const data=readGoalCorrectionHistory(value,goalId,beforeId);
 if(data.items.some(row=>todayInTimezone(value.timezone,new Date(row.createdAt))!==date))throw Error('Record outside selected day');
 return {...data,date,timezone:value.timezone};
}
