import {test} from 'node:test';import assert from 'node:assert/strict';import {reminderSnapshot,reminderEditPayload,readLatestReminder} from './reminderEdit.js';
const saved={id:3,habitId:2,reminderTime:'09:30:15',daysOfWeek:'MON,TUE',message:'Old',enabled:true,secret:'PRIVATE'};
test('editing a message preserves unchanged reminder seconds and freezes the full expected snapshot',()=>{
 const body=reminderEditPayload({reminderTime:'09:30',daysOfWeek:'MON,TUE',message:'New'},saved);assert.equal(body.reminderTime,'09:30:15');assert.equal(body.expected.message,'Old');assert.equal(body.expected.enabled,true);assert.equal(body.expected.secret,undefined);assert.equal(saved.message,'Old');
 assert.equal(reminderEditPayload({reminderTime:'10:00',daysOfWeek:'MON',message:''},saved).reminderTime,'10:00');
});
test('latest reminder reads are scoped to the requested ID and exclude unrelated metadata',()=>{
 const latest=readLatestReminder(saved,3);assert.equal(latest.secret,undefined);assert.equal(latest.habitId,2);assert.throws(()=>readLatestReminder(saved,4));assert.throws(()=>readLatestReminder({...saved,habitId:0},3));assert.equal(reminderSnapshot({...saved,message:null}).message,'');
});
test('malformed clocks, days, messages and missing enabled snapshots cannot become updates',()=>{
 for(const change of [{reminderTime:'25:00'},{daysOfWeek:''},{daysOfWeek:'MON,INVALID'},{message:'x'.repeat(256)},{enabled:null}])assert.throws(()=>reminderSnapshot({...saved,...change}));
 assert.throws(()=>reminderEditPayload({reminderTime:'09:30',daysOfWeek:'',message:''},saved));
});
