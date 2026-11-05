import test from 'node:test';
import assert from 'node:assert/strict';
import { readWeeklyInsight } from './weeklyInsight.js';
const week='2026-10-12';
const snapshot={version:1,weekStart:week,weekEnd:'2026-10-18',observedThrough:'2026-10-13',completed:1,failed:0,skipped:0,focusSessions:1,focusMinutes:25,suggestion:'KEEP_SMALL_STEP',evidence:[{id:1,date:week,status:'COMPLETED'}],focusSourceIds:[9]};
test('accepts sourced counts and rejects fabricated totals and foreign week snapshots',()=>{
 assert.equal(readWeeklyInsight(snapshot,week),snapshot);
 assert.throws(()=>readWeeklyInsight({...snapshot,completed:2},week));
 assert.throws(()=>readWeeklyInsight(snapshot,'2026-10-05'));
 assert.throws(()=>readWeeklyInsight({...snapshot,focusSessions:2},week));
});
test('rejects duplicate, future or unknown evidence and invalid counters',()=>{
 for(const change of [{evidence:[...snapshot.evidence,...snapshot.evidence]}, {evidence:[{id:1,date:'2026-10-14',status:'COMPLETED'}]}, {focusMinutes:-1}, {suggestion:'invented'}])assert.throws(()=>readWeeklyInsight({...snapshot,...change},week));
});
