import test from 'node:test';import assert from 'node:assert/strict';import {focusHabitFollowUp} from './focusHabitFollowUp.js';import {dailyHabitView} from './dailyHabitView.js';
const session={id:1,habitId:7,durationMinutes:25,completed:true,startedAt:'2026-10-15T00:00:00Z'};
test('completed linked focus sessions provide explicit navigation without creating check-ins',()=>{
 assert.deepEqual(focusHabitFollowUp({...session,note:'SECRET'}),{sessionId:1,checkInPath:'/?habit=7#today-habits',statsPath:'/stats?habit=7'});assert.equal(focusHabitFollowUp({...session,completed:false}),null);assert.equal(focusHabitFollowUp({...session,habitId:null}),null);assert.throws(()=>focusHabitFollowUp({...session,habitId:0}));
});
test('targeted daily view never substitutes another habit or hides the recorded source status',()=>{
 const rows=[{habitId:1,todayStatus:null},{habitId:7,todayStatus:'COMPLETED'}];const selected=dailyHabitView(rows,'ALL',{id:7});assert.deepEqual(selected.rows,[rows[1]]);assert.equal(selected.counts.RECORDED,1);assert.equal(dailyHabitView(rows,'ALL',{id:99}).rows.length,0);assert.equal(dailyHabitView(rows,'ALL',{id:null}).rows.length,0);assert.equal(rows[1].todayStatus,'COMPLETED');
});
