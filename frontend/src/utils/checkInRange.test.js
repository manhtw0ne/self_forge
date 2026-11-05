import {test} from 'node:test';import assert from 'node:assert/strict';import {checkInRangeQuery,checkInRangePreset,readCheckInRange} from './checkInRange.js';
const scope={query:'100%_',status:'FAILED',fromDate:'2026-10-01',toDate:'2026-10-16'},row={id:30,habitId:2,habitName:'Read',date:'2026-10-16',status:'FAILED',note:'100%_ saved'};
const response={...scope,timezone:'UTC',items:[row],nextCursor:null};const read=(value,before=null)=>readCheckInRange(value,scope,'2026-10-16','UTC',before);
test('check-in range search validates inclusive boundaries without requiring text or inferring missing days',()=>{
 assert.equal(checkInRangeQuery(' ','ALL','2026-10-01','2026-10-16','2026-10-16').query,'');assert.deepEqual(checkInRangePreset(7,'2026-10-16'),{fromDate:'2026-10-10',toDate:'2026-10-16'});
 for(const change of [['x'.repeat(101),'ALL','2026-10-01','2026-10-16'],['','BAD','2026-10-01','2026-10-16'],['','ALL','2026-10-16','2026-10-17'],['','ALL','2025-10-01','2026-10-16']])assert.throws(()=>checkInRangeQuery(...change,'2026-10-16'));
 assert.equal(read({...response,items:[]}).items.length,0);
});
test('check-in range pages enforce date/ID cursor ordering and full-page next cursors',()=>{
 const items=Array.from({length:20},(_,index)=>({...row,id:30-index}));const result=read({...response,items,nextCursor:{date:row.date,id:11}});assert.equal(result.nextCursor.id,11);
 assert.equal(read({...response,items:[{...row,id:10}]},result.nextCursor).items[0].id,10);
 assert.throws(()=>read(response,{date:row.date,id:30}));assert.throws(()=>read({...response,items:[row,row]}));assert.throws(()=>read({...response,nextCursor:{date:row.date,id:30}}));
});
test('results verify frozen query/status/date/timezone scope and expose only source fields',()=>{
 const result=read({...response,items:[{...row,email:'PRIVATE',scoreImpact:-100}]});assert.equal(result.items[0].email,undefined);assert.equal(result.items[0].scoreImpact,undefined);assert.equal(result.items[0].note,row.note);
 for(const change of [{query:'different'},{status:'ALL'},{timezone:'Asia/Ho_Chi_Minh'},{items:[{...row,status:'COMPLETED'}]},{items:[{...row,date:'2026-09-30'}]},{items:[{...row,note:'x'.repeat(256)}]}])assert.throws(()=>read({...response,...change}));
});
