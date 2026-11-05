import test from 'node:test';import assert from 'node:assert/strict';import {goalCorrectionPayload,goalCorrectionStatus} from './goalCorrection.js';
const goal={id:1,name:'Read',description:'',unit:'pages',deadline:null,targetValue:10,currentValue:10,status:'COMPLETED'};
test('absolute goal corrections capture the reviewed snapshot and allow reopening at zero',()=>{
 const body=goalCorrectionPayload({...goal,email:'SECRET'},0);assert.equal(body.currentValue,0);assert.equal(body.expected.currentValue,10);assert.equal(body.expected.email,undefined);assert.equal(goalCorrectionStatus(goal,4),'ACTIVE');assert.equal(goalCorrectionStatus(goal,10),'COMPLETED');assert.equal(body.amount,undefined);assert.equal(goal.currentValue,10);
});
test('correction preview rejects blank, fractional, out-of-target or abandoned values',()=>{
 for(const value of ['',null,-1,1.5,11,Infinity])assert.throws(()=>goalCorrectionPayload(goal,value));assert.throws(()=>goalCorrectionPayload({...goal,status:'ABANDONED'},4));
});
