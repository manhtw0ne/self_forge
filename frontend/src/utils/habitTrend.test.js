import test from 'node:test';import assert from 'node:assert/strict';import {readTrendHabits,readHabitTrend} from './habitTrend.js';
const today='2026-10-15',counts={completed:0,failed:0,skipped:0};const base={habitId:5,habitName:'Read',days:7,start:'2026-10-09',end:today,previousStart:'2026-10-02',previousEnd:'2026-10-08',current:{...counts,completed:1},previous:{...counts,failed:1},currentFocus:{sessions:0,minutes:0},previousFocus:{sessions:0,minutes:0},evidence:[{id:1,date:'2026-10-08',status:'FAILED'},{id:2,date:today,status:'COMPLETED'}]};
test('habit trend counts only evidence and distinguishes unrecorded days',()=>{
 const value=readHabitTrend({...base,note:'SECRET'},5,7,today);assert.equal(value.calendar.length,7);assert.equal(value.calendar.filter(row=>row.status==='UNRECORDED').length,6);assert.equal(value.current.failed,0);assert.equal(value.calendar[6].checkInId,2);assert.equal(value.note,undefined);
 for(const change of [{habitId:6},{end:'2026-10-16'},{current:{...counts,completed:2}},{evidence:[...base.evidence,base.evidence[0]]},{evidence:[{id:3,date:'2026-10-01',status:'COMPLETED'}]}])assert.throws(()=>readHabitTrend({...base,...change},5,7,today));
});
test('habit picker includes inactive owned records without duplicates or private data',()=>{
 assert.deepEqual(readTrendHabits([{id:1,name:'Read',active:true,note:'SECRET'}],[{id:2,name:'Run',active:false}]),[{id:1,name:'Read',active:true},{id:2,name:'Run',active:false}]);assert.throws(()=>readTrendHabits([{id:1,name:'Read',active:true}],[{id:1,name:'Again',active:false}]));
});

test('focus totals are separate from check-ins and reject impossible or private fields',()=>{
 const value=readHabitTrend({...base,currentFocus:{sessions:2,minutes:70,note:'SECRET'},previousFocus:{sessions:1,minutes:25}},5,7,today);
 assert.deepEqual(value.currentFocus,{sessions:2,minutes:70});assert.equal(value.current.completed,1);
 for(const currentFocus of [{sessions:-1,minutes:0},{sessions:0,minutes:25},{sessions:1,minutes:24},{sessions:1,minutes:121},{sessions:1.5,minutes:50}])assert.throws(()=>readHabitTrend({...base,currentFocus},5,7,today));
});
