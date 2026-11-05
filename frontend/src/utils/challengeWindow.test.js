import test from 'node:test';import assert from 'node:assert/strict';import {challengeWindow,challengeWindowDays} from './challengeWindow.js';import {challengePayload,createChallengeSafely,readPendingChallenge} from './pendingChallenge.js';
test('flexible challenge window separates completion target from calendar duration across leap day',()=>{
 const value=challengeWindow(3,7,'2028-02-27');assert.equal(value.endDate,'2028-03-04');assert.equal(challengeWindowDays(value),7);assert.equal(value.targetDays,3);assert.equal(challengeWindow(7,null,'2026-10-15').windowDays,7);
 for(const [target,window] of [[5,3],[0,7],[3,366],[3,1.5],[3,'']])assert.throws(()=>challengeWindow(target,window,'2026-10-15'));
});
test('pending flexible challenge preserves both values and strips unrelated private fields',async()=>{
 const map=new Map();const storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
 const form=challengePayload({habitId:'1',name:'Read',description:'',targetDays:'3',windowDays:'7',startDate:'2026-10-15'});let original;
 await assert.rejects(createChallengeSafely(storage,1,form,async payload=>{original=payload;throw Error('timeout');},()=> '12345678-1234-1234-1234-123456789abc'));
 const key='sf_challenge_create:1';storage.setItem(key,JSON.stringify({...JSON.parse(storage.getItem(key)),email:'SECRET'}));assert.equal(readPendingChallenge(storage,1).email,undefined);assert.equal(readPendingChallenge(storage,1).startDate,'2026-10-15');
 assert.equal(readPendingChallenge(storage,1).windowDays,7);await createChallengeSafely(storage,1,{...form,windowDays:14},async payload=>{assert.deepEqual(payload,original);});
 assert.throws(()=>challengePayload({...form,windowDays:2}));
});
