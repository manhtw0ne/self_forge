import {test} from 'node:test';import assert from 'node:assert/strict';
import {goalHistorySummary,goalHistoryPageExport} from './goalHistorySummary.js';
const row={id:8,kind:'ADD',fromValue:0,toValue:5,targetValue:10,unit:'pages',fromStatus:'ACTIVE',toStatus:'ACTIVE',createdAt:'2026-10-16T01:00:00Z'};
const data={goalId:1,items:[row,{...row,id:7,kind:'CORRECTION',fromValue:5,toValue:3},{...row,id:6,kind:'CORRECTION',fromValue:3,toValue:4},{...row,id:5,unit:'books',toValue:1}],nextCursor:null};
test('goal history summary separates recorded units and corrections from additions for this page only',()=>{
 assert.deepEqual(goalHistorySummary(data,1),{count:4,additions:2,corrections:2,groups:[{unit:'pages',added:5,increased:1,decreased:2},{unit:'books',added:1,increased:0,decreased:0}]});
 assert.equal(data.items[1].fromValue,5);assert.deepEqual(goalHistorySummary({goalId:1,items:[],nextCursor:null},1).groups,[]);
});
test('goal summary rejects wrong ownership/filter, decreasing additions and duplicate records',()=>{
 assert.throws(()=>goalHistorySummary(data,2));assert.throws(()=>goalHistorySummary(data,1,'ADD'));assert.throws(()=>goalHistorySummary(data,1,'UNKNOWN'));
 assert.throws(()=>goalHistorySummary({goalId:1,items:[{...row,fromValue:6,toValue:3}],nextCursor:null},1));
 assert.throws(()=>goalHistorySummary({...data,items:[row,row]},1));
});
test('CSV states its page and filter scope, preserves historical targets, and neutralizes formula cells',()=>{
 const file=goalHistoryPageExport({...data,items:[{...row,unit:'=EVIL()'}]},{id:1,name:'=SECRET()'},2,'ADD');
 assert.equal(file.filename,'selfforge-goal-1-history-page-2.csv');assert.ok(file.content.includes('Chỉ trang lịch sử đang xem'));assert.ok(file.content.includes('Cộng tiến độ'));assert.ok(file.content.includes("'=SECRET()"));assert.ok(file.content.includes("'=EVIL()"));assert.ok(file.content.includes(row.createdAt));assert.ok(!file.content.includes('userId'));
 assert.throws(()=>goalHistoryPageExport(data,{id:1,name:'Goal'},0));assert.throws(()=>goalHistoryPageExport(data,{id:2,name:'Other'},1));
});
