import test from 'node:test';import assert from 'node:assert/strict';import {dailyHabitView,isHabitScheduledOn,dailyCompletionSummary} from './dailyHabitView.js';
const rows=[{habitId:1,todayStatus:null},{habitId:2,todayStatus:'COMPLETED'},{habitId:3,todayStatus:'SKIPPED'},{habitId:4,todayStatus:'FAILED'}];
test('daily habit filter distinguishes unrecorded from completed, skipped and failed',()=>{
 const result=dailyHabitView(rows,'PENDING');assert.deepEqual(result.rows.map(row=>row.habitId),[1]);assert.deepEqual(result.counts,{ALL:4,PENDING:1,RECORDED:3,REST:0});assert.deepEqual(dailyHabitView(rows,'RECORDED').rows.map(row=>row.habitId),[2,3,4]);assert.equal(result.counts.ALL,result.counts.PENDING+result.counts.RECORDED);
});
test('daily filters preserve source order and never mutate or create check-ins',()=>{
 assert.deepEqual(dailyHabitView(rows).rows,rows);assert.notEqual(dailyHabitView(rows).rows,rows);assert.equal(rows[0].todayStatus,null);assert.equal(dailyHabitView([], 'PENDING').rows.length,0);assert.throws(()=>dailyHabitView(rows,'UNKNOWN'));
});
test('daily view puts only scheduled habits in the normal action list and preserves an exceptional recorded check-in',()=>{
 const scheduled=[
  {habitId:1,targetPerWeek:3,scheduledDays:'MON,WED,FRI',todayStatus:null},
  {habitId:2,targetPerWeek:3,scheduledDays:'MON,WED,FRI',todayStatus:'COMPLETED'},
  {habitId:3,targetPerWeek:1,scheduledDays:'SAT',todayStatus:null},
 ];
 const monday=dailyHabitView(scheduled,'ALL',null,'2026-11-02');
 assert.deepEqual(monday.rows.map(row=>row.habitId),[1,2]);
 assert.equal(monday.counts.REST,1);
 assert.deepEqual(dailyHabitView(scheduled,'REST',null,'2026-11-02').rows.map(row=>row.habitId),[3]);
 assert.deepEqual(dailyHabitView(scheduled,'PENDING',null,'2026-11-02').pendingRows.map(row=>row.habitId),[1]);
 assert.equal(isHabitScheduledOn(scheduled[0],'2026-11-02'),true);
 assert.equal(isHabitScheduledOn(scheduled[2],'2026-11-02'),false);
});
test('invalid or absent client schedule stays compatible with a legacy weekly target',()=>{
 assert.equal(isHabitScheduledOn({targetPerWeek:2,scheduledDays:'NOT,A,SCHEDULE'},'2026-11-03'),true);
 assert.equal(isHabitScheduledOn({targetPerWeek:2},'2026-11-04'),false);
 assert.throws(()=>isHabitScheduledOn({},'not-a-date'));
});
test('completion celebration ignores scheduled rest but never celebrates an empty day',()=>{
 assert.equal(dailyCompletionSummary([{scheduledToday:true,todayStatus:'COMPLETED'},{scheduledToday:false,todayStatus:null}]).allDone,true);
 assert.equal(dailyCompletionSummary([{scheduledToday:true,todayStatus:'COMPLETED'},{scheduledToday:true,todayStatus:'SKIPPED'}]).allDone,false);
 assert.equal(dailyCompletionSummary([{scheduledToday:false,todayStatus:null}]).allDone,false);
 assert.throws(()=>dailyCompletionSummary(null));
});
