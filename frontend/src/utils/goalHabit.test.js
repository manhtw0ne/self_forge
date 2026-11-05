import test from 'node:test';
import assert from 'node:assert/strict';
import { goalHabitPayload,createGoalHabit,applyGoalHabit,readGoalHabit } from './goalHabit.js';
const id='12345678-1234-1234-1234-123456789abc';
const habit={name:'Read five minutes',description:'After breakfast',difficulty:'EASY',targetPerWeek:3};
const expected={id:1,name:'Read books',targetValue:12,currentValue:0,status:'ACTIVE'};
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
test('lost response retries immutable payload and request ID even if input changes',async()=>{
 const storage=store();let calls=[];
 await assert.rejects(createGoalHabit(storage,7,1,habit,expected,async body=>{calls.push(body);throw Error('network');},()=>id));
 const result=await createGoalHabit(storage,7,1,{...habit,name:'Changed'},expected,async body=>{calls.push(body);return {data:{id:9,name:habit.name}};},()=>{throw Error('No new ID');});
 assert.deepEqual(calls[0],calls[1]);assert.equal(result.response.data.id,9);assert.equal(readGoalHabit(storage,7),null);
});
test('another goal cannot consume a pending request and blocked storage sends nothing',async()=>{
 const storage=store();await assert.rejects(createGoalHabit(storage,7,1,habit,expected,async()=>{throw Error('network');},()=>id));
 let sent=0;await assert.rejects(createGoalHabit(storage,7,2,habit,{...expected,id:2},async()=>{sent++;},()=>id));
 await assert.rejects(createGoalHabit({getItem:()=>null,setItem(){throw Error('blocked');}},7,1,habit,expected,async()=>{sent++;},()=>id));assert.equal(sent,0);
});
test('stale goal response clears rejected request, while unparseable success remains pending',async()=>{
 const storage=store();await assert.rejects(createGoalHabit(storage,7,1,habit,expected,async()=>{throw {response:{status:409}};},()=>id));assert.equal(readGoalHabit(storage,7),null);
 await assert.rejects(createGoalHabit(storage,7,1,habit,expected,async()=>({data:{}}),()=>id));assert.equal(readGoalHabit(storage,7).requestId,id);
});
test('confirmed creation remains success if local cleanup fails',async()=>{
 const storage=store();storage.removeItem=()=>{throw Error('blocked');};
 const result=await createGoalHabit(storage,7,1,habit,expected,async()=>({data:{id:9,name:habit.name}}),()=>id);
 assert.equal(result.response.data.id,9);assert.equal(result.pending.requestId,id);
});
test('preview payload validates weekly targets and strips unrelated fields',()=>{
 assert.deepEqual(goalHabitPayload({...habit,targetPerWeek:'3',token:'SECRET'}),habit);
 for(const value of [{...habit,targetPerWeek:8},{...habit,targetPerWeek:1.5},{...habit,name:' '},{...habit,description:'x'.repeat(256)}])assert.throws(()=>goalHabitPayload(value));
});

test('existing habit link persists immutable selection and cannot be consumed by creation',async()=>{
 const storage=store();let sent=[];
 await assert.rejects(applyGoalHabit(storage,7,1,{action:'LINK',habitId:8,secret:'drop'},expected,async p=>{sent.push(p);throw Error('network');},()=>id));
 assert.equal(readGoalHabit(storage,7).habitId,8);assert.equal(readGoalHabit(storage,7).secret,undefined);
 await assert.rejects(createGoalHabit(storage,7,1,habit,expected,async()=>{throw Error('Must not send');},()=>id),/Another action/);
 const result=await applyGoalHabit(storage,7,1,{action:'LINK',habitId:99},expected,async p=>{sent.push(p);return {data:{id:8,name:'Existing'}};},()=>{throw Error('No new ID');});
 assert.deepEqual(sent[0],sent[1]);assert.equal(result.response.data.id,8);assert.equal(readGoalHabit(storage,7),null);
});
test('invalid existing habit ID never reaches server',async()=>{
 let sent=0;
 for(const habitId of [0,-1,1.5,null,'8'])await assert.rejects(applyGoalHabit(store(),7,1,{action:'LINK',habitId},expected,async()=>sent++,()=>id));
 assert.equal(sent,0);
});

test('a mismatched linked habit response keeps the request for verification',async()=>{
 const storage=store();await assert.rejects(applyGoalHabit(storage,7,1,{action:'LINK',habitId:8},expected,async()=>({data:{id:9,name:'Wrong habit'}}),()=>id));
 assert.equal(readGoalHabit(storage,7).habitId,8);
});
