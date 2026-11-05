import test from 'node:test';import assert from 'node:assert/strict';import {readCompanionHistory} from './companionHistory.js';
const row={id:3,checkInId:8,habitName:'Read',date:'2026-10-14',changedAt:'2026-10-14T10:00:00Z',delta:10,reason:'COMPLETED'};
test('history strips private fields and validates the direction of companion point changes',()=>{
 assert.deepEqual(readCompanionHistory({items:[{...row,note:'SECRET',email:'SECRET'}],nextCursor:null}).items,[row]);
 assert.equal(readCompanionHistory({items:[{...row,delta:-10,reason:'REVERSED'}]}).items[0].delta,-10);
 for(const value of [{...row,delta:-10},{...row,reason:'REVERSED'},{...row,delta:0},{...row,date:'2026-02-30'},{...row,changedAt:'bad'}])assert.throws(()=>readCompanionHistory({items:[value]}));
});
test('history accepts only decreasing unique IDs and a cursor matching the last of twenty rows',()=>{
 const items=Array.from({length:20},(_,i)=>({...row,id:30-i}));assert.equal(readCompanionHistory({items,nextCursor:11}).nextCursor,11);
 assert.throws(()=>readCompanionHistory({items,nextCursor:12}));assert.throws(()=>readCompanionHistory({items:[row,row]}));assert.throws(()=>readCompanionHistory({items:[row],nextCursor:3}));
});
