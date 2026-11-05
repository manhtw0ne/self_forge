import {validCalendarDate} from './dates.js';
const dateOnly=value=>validCalendarDate(value)&&value>='0001-01-01';
export function journalDateLink(date){if(!dateOnly(date))throw Error('Invalid journal date');return '/journal?'+new URLSearchParams({date});}
export function readJournalDateTarget(search,today){
 if(!dateOnly(today))throw Error('Invalid account date');const params=new URLSearchParams(search),values=params.getAll('date');if(!values.length)return null;
 if(values.length!==1||!dateOnly(values[0])||values[0]>today)return {invalid:true};return {date:values[0]};
}
