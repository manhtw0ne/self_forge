import test from 'node:test';import assert from 'node:assert/strict';import {challengeNextStep} from './challengeNextStep.js';
const challenge={habitId:1,status:'ACTIVE',startDate:'2028-02-27',endDate:'2028-03-04',targetDays:3};
test('challenge next steps distinguish inclusive calendar days from completed days',()=>{
 assert.deepEqual(challengeNextStep(challenge,{completedDays:1},'2028-02-29'),{kind:'IN_PROGRESS',remaining:2,calendarDays:5});
 assert.deepEqual(challengeNextStep(challenge,{completedDays:1},'2028-03-04'),{kind:'SHORT_WINDOW',remaining:2,calendarDays:1});
 assert.deepEqual(challengeNextStep(challenge,{completedDays:2},'2028-03-04'),{kind:'IN_PROGRESS',remaining:1,calendarDays:1});
 assert.equal(challengeNextStep(challenge,{completedDays:1},'2028-02-26').kind,'UPCOMING');
 assert.equal(challengeNextStep(challenge,{completedDays:1},'2028-03-05').kind,'ENDED');
});
test('challenge guidance preserves stopped state and never treats missing or invalid evidence as failure',()=>{
 assert.equal(challengeNextStep({...challenge,status:'ABANDONED'},{completedDays:3},'2028-03-05').kind,'STOPPED');
 assert.equal(challengeNextStep(challenge,{completedDays:3},'2028-03-05').kind,'REACHED');
 for(const count of [-1,1.5,8,NaN,'2'])assert.equal(challengeNextStep(challenge,{completedDays:count},'2028-03-01'),null);
 assert.equal(challengeNextStep(challenge,null,'2028-03-01'),null);
 assert.equal(challengeNextStep(challenge,{completedDays:0},'2028-02-30'),null);
 assert.equal(challengeNextStep({...challenge,targetDays:8},{completedDays:0},'2028-03-01'),null);
 assert.equal(challengeNextStep({...challenge,status:'UNKNOWN'},{completedDays:0},'2028-03-01'),null);
});
