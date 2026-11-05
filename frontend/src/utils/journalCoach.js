import {validCalendarDate} from './dates.js';
const fields=['win','obstacle','lesson','tomorrowFocus'];
export const JOURNAL_COACH_FIELD_LIMIT=1200;
export const JOURNAL_COACH_TOTAL_LIMIT=4000;

function text(value,maximum=500){
 if(typeof value!=='string'||!value.trim()||value.trim().length>maximum)throw Error('Invalid journal coach text');
 return value.trim();
}

export function journalCoachEligibility(form){
 if(!form||fields.some(field=>typeof form[field]!=='string'))return {ok:false,reason:'invalid'};
 const values=Object.fromEntries(fields.map(field=>[field,form[field].trim()]));
 const total=fields.reduce((count,field)=>count+values[field].length,0);
 if(total===0)return {ok:false,reason:'empty'};
 if(fields.some(field=>values[field].length>JOURNAL_COACH_FIELD_LIMIT)||total>JOURNAL_COACH_TOTAL_LIMIT)return {ok:false,reason:'limit'};
 return {ok:true,values,total};
}

export function readJournalCoachStatus(value){
 if(!value||typeof value.available!=='boolean'||!Number.isInteger(value.limit)||value.limit<0||value.limit>100||!Number.isInteger(value.remaining)||value.remaining<0||value.remaining>value.limit)throw Error('Invalid journal coach status');
 return {available:value.available,limit:value.limit,remaining:value.remaining};
}

export function journalCoachPayload(form,consent,language){
 const eligibility=journalCoachEligibility(form);
 if(!eligibility.ok||consent!==true||!['vi','en'].includes(language))throw Error('Invalid journal coach request');
 return {...eligibility.values,consent:true,language};
}

export function readJournalCoachReflection(value){
 if(!value||typeof value!=='object')throw Error('Invalid journal coach reflection');
 return {reflection:text(value.reflection),question:text(value.question),tomorrowAction:text(value.tomorrowAction)};
}

const storageKey=(owner,date)=>{
 if(!Number.isSafeInteger(owner)||owner<1||!validCalendarDate(date))throw Error('Invalid journal coach draft owner');
 return `sf_journal_coach:${owner}:${date}`;
};

function savedSource(form,language){
 const payload=journalCoachPayload(form,true,language);
 return Object.fromEntries([...fields.map(field=>[field,payload[field]]),['language',payload.language]]);
}

export function readSavedJournalCoachReflection(storage,owner,date,form,language){
 const raw=storage.getItem(storageKey(owner,date));
 if(raw===null)return null;
 const saved=JSON.parse(raw);
 if(!saved||saved.version!==1||!saved.source||typeof saved.source!=='object')throw Error('Invalid saved journal coach reflection');
 const source=savedSource(form,language);
 if([...fields,'language'].some(field=>saved.source[field]!==source[field]))return null;
 return readJournalCoachReflection(saved.advice);
}

export function writeSavedJournalCoachReflection(storage,owner,date,form,language,advice){
 const source=savedSource(form,language),clean=readJournalCoachReflection(advice);
 storage.setItem(storageKey(owner,date),JSON.stringify({version:1,source,advice:clean}));
 return clean;
}

export function removeSavedJournalCoachReflection(storage,owner,date){storage.removeItem(storageKey(owner,date));}
