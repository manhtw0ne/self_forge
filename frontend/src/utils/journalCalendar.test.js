import test from 'node:test';import assert from 'node:assert/strict';import {journalMonth,shiftJournalMonth} from './journalCalendar.js';
test('journal calendar aligns Monday-first leap months and distinguishes saved, empty and future dates',()=>{
 const calendar=journalMonth('2028-02',['2028-02-01','2028-02-15','2028-01-31'],'2028-02-20');assert.equal(calendar.offset,1);assert.equal(calendar.days.length,29);assert.equal(calendar.count,2);assert.equal(calendar.days[0].saved,true);assert.equal(calendar.days[19].future,false);assert.equal(calendar.days[20].future,true);assert.equal(calendar.days[1].saved,false);
 assert.equal(journalMonth('2029-02',[],'2029-03-01').days.length,28);assert.equal(journalMonth('9999-12',[],'9999-12-31').days.length,31);
});
test('journal calendar rejects stale future dates and duplicate sources and bounds month navigation',()=>{
 for(const dates of [['2028-02-21'],['2028-02-01','2028-02-01'],['bad']])assert.throws(()=>journalMonth('2028-02',dates,'2028-02-20'));
 assert.throws(()=>journalMonth('2028-03',[],'2028-02-20'));assert.throws(()=>journalMonth('0000-01',[],'2028-02-20'));
 assert.equal(shiftJournalMonth('2028-01',-1,'2028-02-20'),'2027-12');assert.equal(shiftJournalMonth('2027-12',1,'2028-02-20'),'2028-01');assert.equal(shiftJournalMonth('2028-02',1,'2028-02-20'),null);assert.equal(shiftJournalMonth('0001-01',-1,'2028-02-20'),null);assert.equal(shiftJournalMonth('9999-12',1,'9999-12-31'),null);
});
