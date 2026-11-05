import {validCalendarDate} from './dates.js';
export function readEditableMood(value,date){
 if(!validCalendarDate(date)||!value||value.date!==date||!Number.isSafeInteger(value.id)||value.id<1||!Number.isInteger(value.score)||value.score<1||value.score>5||['note','emoji'].some(key=>value[key]!=null&&(typeof value[key]!=='string'||value[key].length>255)))throw Error('Invalid saved mood');return {id:value.id,date,score:value.score,note:value.note??'',emoji:value.emoji??''};
}
export function moodEditPayload(source,form){
 const saved=readEditableMood(source,source.date),score=Number(form.score);if(!Number.isInteger(score)||score<1||score>5||typeof form.note!=='string'||form.note.length>255)throw Error('Invalid mood edit');const emoji=['😢','😟','😐','😊','🤩'][score-1];return {date:saved.date,score,note:form.note,emoji,expected:{id:saved.id,score:saved.score,note:saved.note,emoji:saved.emoji}};
}

export function moodDeletePayload(source){const value=readEditableMood(source,source.date);return {date:value.date,expected:{id:value.id,score:value.score,note:value.note,emoji:value.emoji}};}
