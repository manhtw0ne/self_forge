import test from 'node:test';import assert from 'node:assert/strict';import {todayWeekPlanReminder as remind} from './weekPlanReminder.js';
const plan={week:'2026-10-12',date:'2026-10-12',action:'Read two pages',time:'00:01',completed:false,version:1};
test('weekly plan reminders use account date and due time at the calendar boundary',()=>{
 assert.deepEqual(remind({...plan,note:'SECRET'},'2026-10-12','Asia/Ho_Chi_Minh',new Date('2026-10-11T17:01:00Z')),{stale:false,item:{action:plan.action,time:'00:01',due:true}});
 assert.equal(remind(plan,'2026-10-12','Asia/Ho_Chi_Minh',new Date('2026-10-11T17:00:00Z')).item.due,false);
 assert.deepEqual(remind(plan,'2026-10-11','Asia/Ho_Chi_Minh',new Date('2026-10-11T17:00:00Z')),{stale:true,item:null});
});
test('completed, other-day, undated-time and absent plans do not generate recurring reminders',()=>{
 const now=new Date('2026-10-12T12:00:00Z');for(const value of [null,{...plan,completed:true},{...plan,date:'2026-10-13'},{...plan,time:''}])assert.equal(remind(value,'2026-10-12','UTC',now).item,null);
 assert.throws(()=>remind({...plan,week:'2026-10-05'},'2026-10-12','UTC',now));assert.throws(()=>remind({...plan,time:'25:00'},'2026-10-12','UTC',now));
});
