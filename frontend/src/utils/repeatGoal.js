import {goalPayload} from './goalForm.js';
export function repeatGoalForm(source){
 if(!source||!Number.isSafeInteger(source.id)||source.id<1||!['COMPLETED','ABANDONED'].includes(source.status))throw Error('Invalid ended goal');
 const form={name:source.name,description:source.description||'',targetValue:source.targetValue,unit:source.unit||'',deadline:''};goalPayload(form);return form;
}
