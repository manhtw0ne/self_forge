import test from 'node:test';
import assert from 'node:assert/strict';
import {goalCoachPayload,readGoalCoachPlan,readGoalCoachStatus} from './goalCoach.js';

const goal={id:8,name:'Read books',description:'Finish twelve books',targetValue:12,currentValue:2,unit:'books',deadline:'2026-12-31'};
const plan={headline:'Start with one small reading block.',steps:['Choose one book for this month.'],habits:[{name:'Read one page',description:'Read after breakfast.',difficulty:'EASY',targetPerWeek:3}]};
test('goal coach sends only confirmation and language after locally validating the visible goal',()=>{
 assert.deepEqual(goalCoachPayload(goal,true,'vi'),{consent:true,language:'vi'});
 assert.throws(()=>goalCoachPayload(goal,false,'vi'));
 assert.throws(()=>goalCoachPayload({...goal,currentValue:99},true,'vi'));
});
test('goal coach plan has bounded editable habit suggestions',()=>{
 assert.deepEqual(readGoalCoachStatus({available:true,limit:3,remaining:3}),{available:true,limit:3,remaining:3});
 assert.throws(()=>readGoalCoachStatus({available:true,limit:-1,remaining:0}));
 assert.equal(readGoalCoachPlan(plan).habits[0].targetPerWeek,3);
 assert.throws(()=>readGoalCoachPlan({...plan,habits:[{...plan.habits[0],difficulty:'EXTREME'}]}));
 assert.throws(()=>readGoalCoachPlan({...plan,steps:[]}));
});
