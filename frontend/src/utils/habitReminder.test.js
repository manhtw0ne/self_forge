import test from 'node:test';import assert from 'node:assert/strict';import {defaultHabitReminderDays,scheduledHabitReminderDays,reminderDaysFitHabit,habitReminderPayload,matchingReminder,createHabitReminder} from './habitReminder.js';import {readPendingReminder} from './pendingReminder.js';
const form={time:'08:15',days:['FRI','MON'],message:'Read five minutes'};const uuid='12345678-1234-1234-1234-123456789abc';
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('first reminder uses only a valid habit schedule and otherwise remains safe for every day',()=>{
 assert.deepEqual(defaultHabitReminderDays('SUN,WED,FRI'),['WED','FRI','SUN']);
 assert.deepEqual(defaultHabitReminderDays('MON,MON'),['MON','TUE','WED','THU','FRI','SAT','SUN']);
 assert.deepEqual(defaultHabitReminderDays(null),['MON','TUE','WED','THU','FRI','SAT','SUN']);
 assert.deepEqual(scheduledHabitReminderDays('SUN,WED,FRI'),['WED','FRI','SUN']);
 assert.equal(scheduledHabitReminderDays('MON,MON'),null);
 assert.equal(reminderDaysFitHabit(['MON','FRI'],'MON,FRI'),true);
 assert.equal(reminderDaysFitHabit(['MON','TUE'],'MON,FRI'),false);
});
test('habit shortcut sanitizes payload, canonicalizes weekdays and detects matching enabled schedules',()=>{
 const payload=habitReminderPayload(7,{...form,email:'SECRET'});assert.deepEqual(payload,{habitId:7,reminderTime:'08:15',daysOfWeek:'MON,FRI',message:form.message});
 assert.equal(matchingReminder([{habitId:7,enabled:true,reminderTime:'08:15:00',daysOfWeek:'FRI,MON'}],payload),true);
 assert.equal(matchingReminder([{habitId:7,enabled:false,reminderTime:'08:15',daysOfWeek:'MON,FRI'}],payload),false);
 for(const value of [{...form,days:[]},{...form,days:['MON','MON']},{...form,days:['BAD']},{...form,time:'24:00'},{...form,message:'x'.repeat(256)}])assert.throws(()=>habitReminderPayload(7,value));
});
test('retry retains original habit and schedule, blocks another habit and clears only confirmed success',async()=>{
 const store=storage();let first;await assert.rejects(createHabitReminder(store,1,7,form,async p=>{first=p;throw Error('network');},()=>uuid));
 let sent=0;await assert.rejects(createHabitReminder(store,1,8,form,async()=>sent++,()=>uuid),/Another habit/);assert.equal(sent,0);
 await createHabitReminder(store,1,7,{...form,time:'09:00'},async p=>{assert.deepEqual(p,first);return {data:{id:4,habitId:7,reminderTime:'08:15:00',daysOfWeek:'MON,FRI'}};});
 assert.equal(readPendingReminder(store,1),null);
});
test('wrong response habit keeps pending request and private stored fields are stripped',async()=>{
 const store=storage();await assert.rejects(createHabitReminder(store,1,7,form,async()=>({data:{id:4,habitId:8}}),()=>uuid));assert.equal(readPendingReminder(store,1).habitId,7);
 store.setItem('sf_reminder_create:1',JSON.stringify({...readPendingReminder(store,1),secret:'DROP'}));assert.equal(readPendingReminder(store,1).secret,undefined);
});
