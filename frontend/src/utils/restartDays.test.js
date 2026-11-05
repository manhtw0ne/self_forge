import test from 'node:test';import assert from 'node:assert/strict';import {readRestartDays,restartDayRows,restartDayRequest} from './restartDays.js';
const plan={name:'Read',reason:'BUSY',start:'2026-10-15',steps:['One','Two','Three'],version:2};const days={planVersion:2,version:1,tried:[true,false,false]};
test('restart day progress verifies plan revision and excludes unrelated fields',()=>{
 assert.deepEqual(readRestartDays({...days,email:'SECRET'},2),days);
 assert.throws(()=>readRestartDays(days,3));assert.throws(()=>readRestartDays({...days,tried:[1,false,false]},2));assert.throws(()=>readRestartDays({...days,version:-1},2));
 assert.deepEqual(restartDayRequest(days,2,true),{planVersion:2,expectedVersion:1,day:2,tried:true});assert.throws(()=>restartDayRequest(days,4,true));
});
test('restart day actions use account calendar dates and never imply check-in completion',()=>{
 const rows=restartDayRows(plan,days,'2026-10-16');assert.deepEqual(rows.map(row=>row.available),[true,true,false]);assert.equal(rows[2].date,'2026-10-17');assert.equal(rows[0].tried,true);assert.equal(rows[0].xp,undefined);
 assert.equal(restartDayRows(plan,days,'2026-10-14').some(row=>row.available),false);assert.equal(restartDayRows(plan,days,'2026-10-18').every(row=>row.available),true);
 assert.throws(()=>restartDayRows(plan,days,'2026-02-30'));
});
