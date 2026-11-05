import test from 'node:test';import assert from 'node:assert/strict';import {goalRecovery} from './goalRecovery.js';
const goal={status:'ACTIVE',deadline:'2028-02-28',targetValue:100,currentValue:31};
test('overdue proposals preserve recorded work and use inclusive account calendar windows',()=>{
 const result=goalRecovery(goal,'2028-03-01',7);assert.deepEqual(result,{deadline:'2028-03-07',days:7,remaining:69,perDay:10,overdueDays:2});
 assert.equal(goalRecovery({...goal,deadline:'2028-02-20'},'2028-02-23',7).deadline,'2028-02-29');
 assert.equal(goalRecovery(goal,'2028-12-30',14).deadline,'2029-01-12');assert.equal(goalRecovery(goal,'2028-03-01',30).perDay,3);
 assert.equal(goal.currentValue,31);assert.equal(goal.deadline,'2028-02-28');
});
test('recovery does not propose changes for ended, undated, current or invalid goals',()=>{
 for(const changes of [{status:'COMPLETED'},{status:'ABANDONED'},{deadline:null},{deadline:'2028-03-01'},{deadline:'2028-03-02'},{currentValue:100},{currentValue:101},{currentValue:-1},{targetValue:0},{targetValue:1.5}])assert.equal(goalRecovery({...goal,...changes},'2028-03-01',14),null);
 for(const days of [0,1,15,365,'14'])assert.throws(()=>goalRecovery(goal,'2028-03-01',days));
 assert.throws(()=>goalRecovery(goal,'invalid',14));assert.throws(()=>goalRecovery(goal,'9999-12-31',30));
});
