import {test} from 'node:test';import assert from 'node:assert/strict';import {breakDurations,changeBreakDuration} from './pomodoroBreak.js';
test('changing break length resets only the chosen rest and returns no server session or reward fields',()=>{
 const previous={shortMinutes:5,longMinutes:15};assert.deepEqual(breakDurations(),previous);
 assert.deepEqual(changeBreakDuration(1,10,previous),{shortMinutes:10,longMinutes:15,secondsLeft:600,deadline:null,running:false});
 assert.deepEqual(changeBreakDuration(2,30,previous),{shortMinutes:5,longMinutes:30,secondsLeft:1800,deadline:null,running:false});assert.equal(previous.shortMinutes,5);
 assert.throws(()=>changeBreakDuration(0,25,previous));assert.throws(()=>changeBreakDuration(1,60,previous));
});
