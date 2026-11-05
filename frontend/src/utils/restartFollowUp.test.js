import test from 'node:test';import assert from 'node:assert/strict';import {restartFollowUp,reviewFromRecordedDays} from './restartFollowUp.js';
const plan={name:'Read',reason:'BUSY',start:'2026-10-12',steps:['Read two pages','Repeat','Review'],version:3};const review={planVersion:3,version:2,daysTried:2,decision:'KEEP',note:'Private reflection'};
test('next restart cycle is only a draft based on a saved review of an ended plan',()=>{
 const result=restartFollowUp({...plan,email:'SECRET'},review,'2026-10-15');assert.equal(result.start,'2026-10-15');assert.deepEqual(result.steps,plan.steps);assert.equal(result.version,undefined);assert.equal(result.note,undefined);assert.equal(result.email,undefined);
 assert.equal(restartFollowUp(plan,{...review,decision:'PAUSE'},'2026-10-15'),null);
 assert.throws(()=>restartFollowUp(plan,review,'2026-10-14'));assert.throws(()=>restartFollowUp(plan,{...review,planVersion:2},'2026-10-15'));assert.throws(()=>restartFollowUp(plan,null,'2026-10-15'));
 assert.equal(plan.start,'2026-10-12');
});
test('easier and harder drafts keep context while requiring user review of new steps',()=>{
 for(const decision of ['EASIER','HARDER']){const draft=restartFollowUp(plan,{...review,decision},'2026-10-15');assert.equal(draft.name,plan.name);assert.equal(draft.steps.length,3);assert.notEqual(draft.steps[0],plan.steps[0]);assert.ok(draft.steps.every(step=>step.length<=500));}
 assert.throws(()=>restartFollowUp(plan,review,'9999-12-30'));
});
test('recorded day count is copied only for the same plan and preserves current review text',()=>{
 const form={daysTried:'',decision:'EASIER',note:'Keep this text'};
 assert.deepEqual(reviewFromRecordedDays(form,{planVersion:3,version:2,tried:[true,false,true]},3),{daysTried:2,decision:'EASIER',note:'Keep this text'});
 assert.throws(()=>reviewFromRecordedDays(form,{planVersion:2,version:2,tried:[true,false,true]},3));assert.equal(form.daysTried,'');
});
