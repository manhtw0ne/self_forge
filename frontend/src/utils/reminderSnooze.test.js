import {test} from 'node:test';import assert from 'node:assert/strict';
import {readReminderSnoozes,writeReminderSnoozes,snoozeReminder,applyReminderSnoozes} from './reminderSnooze.js';
const item={id:1,habitId:2,reminderTime:'08:00:00',daysOfWeek:'FRI',time:'08:00',due:true,habitName:'PRIVATE_NAME',message:'PRIVATE_MESSAGE'};
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('snooze persists exact scoped metadata without private text and becomes due again at its deadline',()=>{
 const now=new Date('2026-10-16T08:00:00Z'),state=memory(),items=snoozeReminder([],item,10,'2026-10-16','UTC',now);writeReminderSnoozes(state,1,'2026-10-16','UTC',items);
 const loaded=readReminderSnoozes(state,1,'2026-10-16','UTC');assert.deepEqual(loaded,items);assert.equal(readReminderSnoozes(state,2,'2026-10-16','UTC').length,0);assert.equal(readReminderSnoozes(state,1,'2026-10-17','UTC').length,0);
 assert.equal(applyReminderSnoozes([item],loaded,'UTC',new Date('2026-10-16T08:09:59Z'))[0].due,false);assert.equal(applyReminderSnoozes([item],loaded,'UTC',new Date('2026-10-16T08:10:00Z'))[0].due,true);
 assert.ok(!JSON.stringify(loaded).includes('PRIVATE'));assert.equal(item.due,true);
});
test('changed schedules and completed habits cannot inherit a stale snooze',()=>{
 const now=new Date('2026-10-16T08:00:00Z'),items=snoozeReminder([],item,30,'2026-10-16','UTC',now);
 for(const changed of [{...item,reminderTime:'07:00:00'},{...item,habitId:99},{...item,daysOfWeek:'MON,FRI'}])assert.equal(applyReminderSnoozes([changed],items,'UTC',now)[0].snoozed,false);
 assert.deepEqual(applyReminderSnoozes([],items,'UTC',now),[]);assert.equal(applyReminderSnoozes([item],items,'UTC',new Date('2026-10-17T08:00:00Z'))[0].snoozed,false);
});
test('snooze uses elapsed minutes across DST and rejects crossing the account calendar day',()=>{
 const before=new Date('2026-11-01T05:55:00Z'),result=snoozeReminder([],item,10,'2026-11-01','America/New_York',before);assert.equal(result[0].until-before.getTime(),600000);assert.equal(applyReminderSnoozes([item],result,'America/New_York',before)[0].effectiveTime,'01:05');assert.equal(applyReminderSnoozes([{...item,due:false}],result,'America/New_York',new Date(result[0].until))[0].due,true);
 assert.throws(()=>snoozeReminder([],item,10,'2026-10-16','Asia/Ho_Chi_Minh',new Date('2026-10-16T16:55:00Z')));
 assert.throws(()=>snoozeReminder([],{...item,due:false},10,'2026-10-16','UTC',new Date('2026-10-16T08:00:00Z')));
 assert.throws(()=>snoozeReminder([],item,11,'2026-10-16','UTC',new Date('2026-10-16T08:00:00Z')));
});
test('due reminders remain ahead of snoozed items and storage failures are surfaced',()=>{
 const now=new Date('2026-10-16T08:00:00Z'),items=snoozeReminder([],item,10,'2026-10-16','UTC',now);
 assert.deepEqual(applyReminderSnoozes([item,{...item,id:3,time:'08:05',due:true}],items,'UTC',now).map(row=>row.id),[3,1]);
 assert.throws(()=>writeReminderSnoozes({setItem:()=>{throw Error('blocked');}},1,'2026-10-16','UTC',items));
 const state=memory();writeReminderSnoozes(state,1,'2026-10-16','UTC',items);assert.throws(()=>readReminderSnoozes(state,1,'2026-10-16','Asia/Ho_Chi_Minh'));
});
