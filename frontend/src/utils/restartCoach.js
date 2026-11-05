import {restartReasons} from './restartPlan.js';

function text(value,maximum){
 if(typeof value!=='string'||!value.trim()||value.trim().length>maximum)throw Error('Invalid restart coach text');
 return value.trim();
}

export function readRestartCoachStatus(value){
 if(!value||typeof value.available!=='boolean'||!Number.isInteger(value.limit)||value.limit<0||value.limit>100||!Number.isInteger(value.remaining)||value.remaining<0||value.remaining>value.limit)throw Error('Invalid restart coach status');
 return {available:value.available,limit:value.limit,remaining:value.remaining};
}

export function restartCoachPayload(form,consent,language){
 if(!form||!Object.hasOwn(restartReasons,form.reason)||consent!==true||!['vi','en'].includes(language))throw Error('Invalid restart coach request');
 return {name:text(form.name,255),reason:form.reason,consent:true,language};
}

export function readRestartCoachDraft(value){
 if(!value||!Array.isArray(value.steps)||value.steps.length!==3)throw Error('Invalid restart coach draft');
 return {steps:value.steps.map(step=>text(step,500))};
}

const storageKey=owner=>{
 if(!Number.isSafeInteger(owner)||owner<1)throw Error('Invalid restart coach owner');
 return `sf_restart_coach:${owner}`;
};

function savedRequest(form,language){
 const request=restartCoachPayload(form,true,language);
 return {name:request.name,reason:request.reason,language:request.language};
}

export function readSavedRestartCoachDraft(storage,owner,form,language){
 const raw=storage.getItem(storageKey(owner));
 if(raw===null)return null;
 const saved=JSON.parse(raw);
 if(!saved||saved.version!==1||!saved.request||typeof saved.request!=='object')throw Error('Invalid saved restart coach draft');
 const request=savedRequest(form,language);
 if(saved.request.name!==request.name||saved.request.reason!==request.reason||saved.request.language!==request.language)return null;
 return readRestartCoachDraft(saved.draft);
}

export function writeSavedRestartCoachDraft(storage,owner,form,language,draft){
 const request=savedRequest(form,language),clean=readRestartCoachDraft(draft);
 storage.setItem(storageKey(owner),JSON.stringify({version:1,request,draft:clean}));
 return clean;
}

export function removeSavedRestartCoachDraft(storage,owner){storage.removeItem(storageKey(owner));}
