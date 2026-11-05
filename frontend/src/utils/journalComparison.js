import {validCalendarDate} from './dates.js';
import {journalFields,JOURNAL_LIMIT} from './journalLimits.js';
export function journalComparisonDates(first,second,today){
 if(!validCalendarDate(today)||today<'0001-01-01'||![first,second].every(date=>validCalendarDate(date,today)&&date>='0001-01-01')||first===second)throw Error('Chọn hai ngày khác nhau, không ở tương lai.');
 return [first,second].sort();
}
export function readJournalComparison(values,dates,today){
 const ordered=journalComparisonDates(dates[0],dates[1],today);
 if(!Array.isArray(values)||values.length!==2)throw Error('Invalid journal comparison');
 const ids=new Set();const rows=dates.map((date,index)=>{
  const value=values[index];if(!value||value.date!==date||!Number.isSafeInteger(value.id)||value.id<1||ids.has(value.id))throw Error('Invalid journal source');ids.add(value.id);
  const fields={};for(const field of Object.keys(journalFields)){if(value[field]!=null&&(typeof value[field]!=='string'||value[field].length>JOURNAL_LIMIT))throw Error('Invalid journal field');fields[field]=value[field]??'';}
  return {id:value.id,date,...fields};
 });
 return ordered.map(date=>rows.find(row=>row.date===date));
}
export function journalComparisonQuestion(rows,t=(value,params)=>value.replace('{from}',params.from).replace('{to}',params.to)){
 if(!Array.isArray(rows)||rows.length!==2||!validCalendarDate(rows[0]?.date)||!validCalendarDate(rows[1]?.date)||rows[0].date>=rows[1].date)throw Error('Invalid comparison question');
 return t('Nhìn lại nhật ký {from} và {to}: trở ngại nào đã thay đổi, điều gì đã giúp mình, và một việc nhỏ nào nên thử tiếp?',{from:rows[0].date,to:rows[1].date});
}
