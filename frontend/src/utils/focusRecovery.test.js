import test from 'node:test';import assert from 'node:assert/strict';import {readFocusSession,focusRecovery,confirmFocusStart} from './focusRecovery.js';
const session={id:8,habitId:3,durationMinutes:45,completed:false,startedAt:'2026-10-14T10:00:00Z'};
test('recovery restores server identity and remaining custom duration, without auto-start or new request',()=>{
 const state=focusRecovery(session,'RESUME',Date.parse('2026-10-14T10:15:00Z'));
 assert.equal(state.secondsLeft,1800);assert.equal(state.sessionId,8);assert.equal(state.focusMinutes,45);assert.equal(state.running,false);assert.equal(state.selectedHabit,'3');
 assert.equal(focusRecovery(session,'RESUME',Date.parse('2026-10-14T11:00:00Z')).secondsLeft,0);
});
test('repeat copies configuration without copying earned completion or session identity',()=>{
 const state=focusRecovery({...session,completed:true},'REPEAT');assert.equal(state.sessionId,null);assert.equal(state.secondsLeft,2700);assert.equal(state.running,false);
 assert.throws(()=>focusRecovery(session,'REPEAT'));assert.throws(()=>focusRecovery({...session,completed:true},'RESUME'));
});
test('responses require the selected session and valid duration, ownership fields and clock data',()=>{
 assert.throws(()=>readFocusSession(session,9));
 for(const value of [{...session,durationMinutes:24},{...session,habitId:0},{...session,startedAt:'bad'},{...session,completed:'false'}])assert.throws(()=>readFocusSession(value));
 assert.deepEqual(readFocusSession({...session,email:'SECRET'},8),session);
});
test('start confirmation rejects mismatched server payload and preserves pending request for retry',()=>{
 assert.deepEqual(confirmFocusStart(session,{habitId:3,durationMinutes:45}),session);
 assert.throws(()=>confirmFocusStart(session,{habitId:4,durationMinutes:45}));assert.throws(()=>confirmFocusStart(session,{habitId:3,durationMinutes:25}));
});
