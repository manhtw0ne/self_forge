import test from 'node:test';import assert from 'node:assert/strict';import {reminderWeek} from './reminderWeek.js';
const row={id:1,enabled:true,habitActive:true,habitName:'Đọc sách',reminderTime:'07:00',daysOfWeek:'MON,WED,FRI',habitScheduledDays:'MON,WED,FRI',message:'PRIVATE'};
test('weekly reminder preview uses calendar weekdays across month boundaries and excludes paused schedules',()=>{
 const result=reminderWeek([row,{...row,id:2,enabled:false},{...row,id:3,habitActive:false}],'2028-02-28');assert.equal(result.total,3);assert.equal(result.excluded,2);assert.deepEqual(result.days.filter(day=>day.rows.length).map(day=>day.date),['2028-02-28','2028-03-01','2028-03-03']);assert.equal(result.days.length,7);assert.equal(result.days[0].rows[0].message,undefined);assert.equal(row.message,'PRIVATE');
});
test('overlap counts distinct minute slots and sorts reminders without altering records',()=>{
 const result=reminderWeek([{...row,id:4,reminderTime:'08:00'},row,{...row,id:2,reminderTime:'07:00:30'}],'2028-02-28');assert.equal(result.total,9);assert.equal(result.overlapMinutes,3);assert.deepEqual(result.days[0].rows.map(value=>value.id),[1,2,4]);assert.deepEqual(result.days[0].rows.map(value=>value.overlap),[true,true,false]);
});
test('invalid reminder sources cannot masquerade as an empty schedule',()=>{
 for(const rows of [[row,row],[{...row,reminderTime:'25:00'}],[{...row,daysOfWeek:'MON,MON'}],[{...row,daysOfWeek:'UNKNOWN'}],[{...row,habitScheduledDays:'MON,MON'}]])assert.throws(()=>reminderWeek(rows,'2028-02-28'));assert.throws(()=>reminderWeek([],'invalid'));assert.equal(reminderWeek([],'2028-03-12').days[6].date,'2028-03-18');
});
test('weekly reminder preview omits habit rest days',()=>{
 const result=reminderWeek([{...row,habitScheduledDays:'MON,FRI'}],'2028-02-28');assert.equal(result.total,2);assert.deepEqual(result.days.filter(day=>day.rows.length).map(day=>day.date),['2028-02-28','2028-03-03']);
});
