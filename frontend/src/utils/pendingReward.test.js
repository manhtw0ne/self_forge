import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRewardSafely,readPendingReward} from './pendingReward.js';
const id='12345678-1234-1234-1234-123456789abc',form={name:'Break',description:'Tea',xpCost:20};
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('reward retry preserves original request after lost response and isolates accounts',async()=>{
 const state=storage();let original;
 await assert.rejects(createRewardSafely(state,1,form,async p=>{original=p;throw Error('offline');},()=>id));
 assert.equal(readPendingReward(state,2),null);
 const result=await createRewardSafely(state,1,{...form,name:'Changed'},async p=>{assert.deepEqual(p,original);return {id:5};});
 assert.equal(result.pending,null);assert.equal(readPendingReward(state,1),null);
});
test('reward storage failure prevents sending; conflicts retain request for explicit review',async()=>{
 let calls=0;await assert.rejects(createRewardSafely({...storage(),setItem:()=>{throw Error('blocked');}},1,form,()=>calls++,()=>id));assert.equal(calls,0);
 const state=storage();await assert.rejects(createRewardSafely(state,1,form,async()=>{throw {response:{status:409}};},()=>id));assert.equal(readPendingReward(state,1).name,'Break');
 const result=await createRewardSafely({...state,removeItem:()=>{throw Error('blocked');}},1,form,async()=>({id:1}));assert.equal(result.pending.requestId,id);
});
