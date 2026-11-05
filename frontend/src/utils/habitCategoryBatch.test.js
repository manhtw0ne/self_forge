import {test} from 'node:test';import assert from 'node:assert/strict';
import {categoryBatchPayload,readCategoryBatch,applyCategoryBatch} from './habitCategoryBatch.js';
const habits=[{id:1,categoryId:null,active:true},{id:2,categoryId:3,active:false}],categories=[{id:3},{id:4}];
const memory=()=>{const rows=new Map();return {getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)};};
test('batch category preview freezes exact category baselines and changes no other habit fields',()=>{
 assert.deepEqual(categoryBatchPayload(habits,[2,1],4,categories),{categoryId:4,items:[{habitId:2,expected:{categoryId:3}},{habitId:1,expected:{categoryId:null}}]});assert.equal(habits[1].active,false);
 assert.equal(categoryBatchPayload(habits,[1],null,categories).categoryId,null);
 for(const ids of [[],[1,1],[99],Array.from({length:51},(_,i)=>i+1)])assert.throws(()=>categoryBatchPayload(habits,ids,4,categories));assert.throws(()=>categoryBatchPayload(habits,[1],99,categories));
});
test('lost batch response survives reload and retries original selection under the same account',async()=>{
 const state=memory(),body=categoryBatchPayload(habits,[1,2],4,categories);await assert.rejects(applyCategoryBatch(state,1,body,async()=>{throw Error('offline');}));assert.deepEqual(readCategoryBatch(state,1),body);assert.equal(readCategoryBatch(state,2),null);
 const result=await applyCategoryBatch(state,1,categoryBatchPayload(habits,[1],null,categories),async payload=>{assert.deepEqual(payload,body);return {};});assert.equal(result.pending,null);assert.equal(readCategoryBatch(state,1),null);
});
test('blocked storage prevents batch mutation and conflicts retain the pending snapshot',async()=>{
 const body=categoryBatchPayload(habits,[1],4,categories);let calls=0;await assert.rejects(applyCategoryBatch({...memory(),setItem:()=>{throw Error('blocked');}},1,body,()=>calls++));assert.equal(calls,0);
 const state=memory();await assert.rejects(applyCategoryBatch(state,1,body,async()=>{throw {response:{status:409}};}));assert.deepEqual(readCategoryBatch(state,1),body);
});
