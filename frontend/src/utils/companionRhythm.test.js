import test from 'node:test';
import assert from 'node:assert/strict';
import {readCompanionRhythm} from './companionRhythm.js';

const today='2028-03-03',timezone='Asia/Ho_Chi_Minh';
const base={windowStart:'2028-02-05',observedThrough:today,timezone,periodDays:28,periodXp:70,contributingDays:6,companionXp:50,stage:1,nextThreshold:100,remainingXp:50,estimatedReachDate:'2028-03-23'};

test('companion rhythm verifies a bounded estimate from the exact recent calendar window',()=>{
 assert.deepEqual(readCompanionRhythm(base,today,timezone),{...base});
 assert.equal(readCompanionRhythm({...base,companionXp:500,stage:3,nextThreshold:null,remainingXp:0,estimatedReachDate:null},today,timezone).estimatedReachDate,null);
 assert.equal(readCompanionRhythm({...base,periodXp:0,estimatedReachDate:null},today,timezone).estimatedReachDate,null);
});

test('companion rhythm rejects fabricated dates, progression, and forecast arithmetic',()=>{
 for(const value of [
  {...base,windowStart:'2028-02-06'}, {...base,timezone:'UTC'}, {...base,periodDays:27},
  {...base,contributingDays:29}, {...base,companionXp:100}, {...base,remainingXp:49},
  {...base,estimatedReachDate:'2028-03-22'}, {...base,periodXp:1,estimatedReachDate:'2028-03-23'},
  {...base,periodXp:0,estimatedReachDate:'2028-03-23'}, {...base,estimatedReachDate:'2028-02-30'}
 ]) assert.throws(()=>readCompanionRhythm(value,today,timezone));
});
