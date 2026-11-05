import test from 'node:test';import assert from 'node:assert/strict';import {plannedGoalProgress,plannedGoalDeadline,progressPrefill} from './goalPlanActions.js';
const goal={name:'Read',status:'ACTIVE',targetValue:12,currentValue:2,deadline:'2026-10-19',unit:'books'};
test('goal plan actions suggest only today and respect personal session capacity',()=>{
 assert.equal(plannedGoalProgress(goal,'2026-10-14',[1,3,5]),4);assert.equal(plannedGoalProgress(goal,'2026-10-14',[1,3,5],2),2);assert.equal(plannedGoalProgress(goal,'2026-10-13',[1,3,5]),null);assert.equal(plannedGoalProgress({...goal,status:'COMPLETED'},'2026-10-14',[1,3,5]),null);assert.equal(goal.currentValue,2);
});
test('deadline proposal is calculated without mutating goal and pending retries keep their immutable amount',()=>{
 assert.equal(plannedGoalDeadline(goal,'2026-10-13',[1,3,5],2),'2026-10-23');assert.equal(goal.deadline,'2026-10-19');assert.equal(progressPrefill({amount:7},2),7);assert.equal(progressPrefill(null,2),2);assert.throws(()=>progressPrefill(null,0));assert.throws(()=>plannedGoalDeadline(goal,'2026-10-13',[],2));
});
