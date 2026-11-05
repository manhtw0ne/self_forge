import {test} from 'node:test';import assert from 'node:assert/strict';import {readGoalDailyActivity,goalDailySummary,goalDailyExport} from './goalDailyActivity.js';
const row={date:'2026-10-16',unit:'pages',additions:2,corrections:1,added:10,increased:0,decreased:3};const data={goalId:8,fromDate:'2026-10-10',toDate:'2026-10-16',timezone:'Asia/Ho_Chi_Minh',items:[row,{...row,unit:'books',added:1}]};
test('daily goal activity preserves historical units and accepts an empty period',()=>{assert.equal(readGoalDailyActivity(data,8,7).items.length,2);assert.deepEqual(readGoalDailyActivity({...data,items:[]},8,7).items,[]);assert.equal(data.items[0].unit,'pages');});
test('daily goal activity rejects mismatched scope, duplicate units per day and unsafe values',()=>{assert.throws(()=>readGoalDailyActivity(data,9,7));assert.throws(()=>readGoalDailyActivity(data,8,30));for(const items of [[row,row],[{...row,date:'2026-10-09'}],[{...row,added:-1}],[{...row,added:Number.MAX_SAFE_INTEGER+1}]])assert.throws(()=>readGoalDailyActivity({...data,items},8,7));});

test('period summary counts distinct days and keeps signed corrections separate by historical unit',()=>{
 const value={...data,items:[row,{...row,date:'2026-10-15',additions:1,corrections:2,added:2,increased:1,decreased:20},{...row,unit:'books',added:1,decreased:0}]};
 const summary=goalDailySummary(value,8,7);assert.equal(summary.activeDays,2);assert.equal(summary.additions,5);assert.equal(summary.corrections,4);
 assert.deepEqual(summary.groups.find(g=>g.unit==='pages'),{unit:'pages',added:12,increased:1,decreased:23,net:-10});assert.equal(summary.groups.find(g=>g.unit==='books').net,1);
 assert.deepEqual(goalDailySummary({...data,items:[]},8,7),{activeDays:0,additions:0,corrections:0,groups:[]});
});
test('period CSV includes every day and scope, escapes formulas and excludes unrelated metadata',()=>{
 const file=goalDailyExport({...data,email:'secret@example.com',items:[{...row,unit:'=FORMULA()'},{...row,date:'2026-10-15'}]},8,7,true);
 assert.ok(file.filename.includes('2026-10-10-2026-10-16'));assert.ok(file.content.includes('All recorded changes'));assert.ok(file.content.includes('Asia/Ho_Chi_Minh'));assert.ok(file.content.includes("'=FORMULA()"));assert.ok(file.content.includes('2026-10-15'));assert.ok(!file.content.includes('secret@example.com'));assert.throws(()=>goalDailyExport(data,9,7));
});
test('period totals reject unsafe arithmetic instead of showing rounded figures',()=>{
 const value={...data,items:[{...row,added:Number.MAX_SAFE_INTEGER},{...row,date:'2026-10-15',added:1}]};assert.throws(()=>goalDailySummary(value,8,7));assert.throws(()=>goalDailyExport(value,8,7));
});
