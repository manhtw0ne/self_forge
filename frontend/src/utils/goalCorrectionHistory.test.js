import test from 'node:test';import assert from 'node:assert/strict';import {readGoalCorrectionHistory} from './goalCorrectionHistory.js';
const record={id:5,kind:'CORRECTION',fromValue:10,toValue:4,targetValue:10,unit:'pages',fromStatus:'COMPLETED',toStatus:'ACTIVE',createdAt:'2026-10-15T02:00:00Z'};const response={goalId:1,items:[record],nextCursor:null};
test('correction history verifies goal ownership scope, ordering, state and strips unrelated fields',()=>{
 assert.equal(readGoalCorrectionHistory({...response,items:[{...record,email:'SECRET'}]},1).items[0].email,undefined);
 for(const change of [{goalId:2},{items:[record,record]},{items:[{...record,toValue:11}]},{items:[{...record,toStatus:'COMPLETED'}]},{nextCursor:5}])assert.throws(()=>readGoalCorrectionHistory({...response,...change},1));assert.throws(()=>readGoalCorrectionHistory(response,1,5));
});
test('correction pagination requires a full page and preserves historical target and unit',()=>{
 const items=Array.from({length:20},(_,index)=>({...record,id:25-index}));assert.equal(readGoalCorrectionHistory({goalId:1,items,nextCursor:6},1).nextCursor,6);assert.equal(readGoalCorrectionHistory(response,1).items[0].unit,'pages');assert.throws(()=>readGoalCorrectionHistory({goalId:1,items,nextCursor:7},1));
});

test('goal history validates addition/correction kinds and selected filter scope',()=>{
 const addition={...record,kind:'ADD',fromValue:0,toValue:5};assert.equal(readGoalCorrectionHistory({...response,items:[addition]},1,null,'ADD').items[0].kind,'ADD');assert.throws(()=>readGoalCorrectionHistory(response,1,null,'ADD'));assert.throws(()=>readGoalCorrectionHistory({...response,items:[{...record,kind:'UNKNOWN'}]},1));
});
