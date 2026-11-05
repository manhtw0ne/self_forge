import test from 'node:test';import assert from 'node:assert/strict';import {goalMilestones} from './goalMilestones.js';
const goal={targetValue:100,currentValue:31,status:'ACTIVE'};
test('milestones derive next remaining amount and recalculate after corrections without mutating goals',()=>{
 const result=goalMilestones(goal);assert.deepEqual(result.milestones.map(row=>row.value),[25,50,75,100]);assert.equal(result.next.value,50);assert.equal(result.next.remaining,19);assert.equal(result.milestones[0].reached,true);
 assert.equal(goalMilestones({...goal,currentValue:10}).next.value,25);assert.equal(goal.currentValue,31);
 assert.equal(goalMilestones({...goal,currentValue:130}).next,null);
 for(const status of ['ABANDONED','COMPLETED'])assert.equal(goalMilestones({...goal,status}).next,null);
});
test('small and large targets have unique bounded increasing milestones ending at the target',()=>{
 for(const targetValue of [1,2,3,4,7,11,2147483647]){
 const result=goalMilestones({...goal,targetValue,currentValue:0});const rows=result.milestones;
 assert.equal(new Set(rows.map(row=>row.value)).size,rows.length);assert.ok(rows.every(row=>row.value>=1&&row.value<=targetValue));assert.equal(rows.at(-1).value,targetValue);assert.equal(rows.at(-1).percent,100);assert.ok(rows.every((row,index)=>!index||row.value>rows[index-1].value));assert.equal(result.next.remaining,rows[0].value);
 }
 for(const value of [null,{...goal,targetValue:0},{...goal,currentValue:-1},{...goal,targetValue:2.5},{...goal,status:'UNKNOWN'}])assert.throws(()=>goalMilestones(value));
});
