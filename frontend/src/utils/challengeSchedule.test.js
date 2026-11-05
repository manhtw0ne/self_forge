import test from 'node:test';import assert from 'node:assert/strict';import {challengeDraftSchedule,challengeStartPreset} from './challengeSchedule.js';import {challengePayload,createChallengeSafely} from './pendingChallenge.js';
test('challenge scheduling uses inclusive future windows and account calendar presets',()=>{
 const form={habitId:'1',name:'Read',description:'',targetDays:3,windowDays:7,startDate:'2028-02-28'};
 const result=challengeDraftSchedule(form,'2028-02-20');assert.equal(result.endDate,'2028-03-05');assert.equal(challengePayload({...form,startDate:result.startDate}).startDate,'2028-02-28');
 assert.equal(challengeDraftSchedule({...form,startDate:''},'2028-02-20').startDate,'2028-02-20');
 assert.equal(challengeStartPreset('TOMORROW','2028-02-29'),'2028-03-01');assert.equal(challengeStartPreset('MONDAY','2028-02-28'),'2028-03-06');assert.equal(challengeStartPreset('MONDAY','2028-03-05'),'2028-03-06');
 assert.throws(()=>challengeDraftSchedule(form,'2028-03-01'));assert.throws(()=>challengeDraftSchedule({...form,startDate:'9999-12-31'},'2028-02-20'));assert.throws(()=>challengeDraftSchedule({...form,startDate:'invalid'},'2028-02-20'));
});
test('scheduled challenge retries retain the original start date after the account day changes',async()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const payload=challengePayload({habitId:'1',name:'Read',description:'',targetDays:3,windowDays:7,startDate:'2028-02-28'}),requestId='12345678-1234-1234-1234-123456789abc';
 await assert.rejects(createChallengeSafely(storage,1,payload,async()=>{throw Error('offline');},()=>requestId));let sent;
 await createChallengeSafely(storage,1,{...payload,startDate:'2028-03-01'},async value=>{sent=value;return {};});assert.equal(sent.startDate,'2028-02-28');assert.equal(sent.requestId,requestId);assert.equal(sent.windowDays,7);
});
