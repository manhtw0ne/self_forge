import test from 'node:test';
import assert from 'node:assert/strict';
import {readWeekPlan,writeWeekPlan,weekPlanExport,weeklyInsightExport,readServerWeekPlan,weekSavePayload} from './weekPlan.js';
const week='2026-10-19',form={action:'Đọc 5 phút\nSau bữa sáng',date:week,time:'08:15'};
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};
test('week drafts isolate owners and weeks and retain Unicode without extra fields',()=>{
 const store=storage();writeWeekPlan(store,1,week,{...form,token:'SECRET'});
 assert.deepEqual(readWeekPlan(store,1,week),form);
 assert.equal(readWeekPlan(store,10,week),null);assert.equal(readWeekPlan(store,1,'2026-10-26'),null);
});
test('invalid schedule and storage failures stay explicit; export never pretends to apply a plan',()=>{
 const store=storage();
 for(const value of [{...form,date:'2026-10-26'},{...form,time:'25:00'},{...form,action:'a'.repeat(1001)}])assert.throws(()=>writeWeekPlan(store,1,week,value));
 assert.throws(()=>writeWeekPlan({setItem(){throw Error('blocked');}},1,week,form));
 const file=weekPlanExport(week,form);assert.match(file.text,/Đọc 5 phút\nSau bữa sáng/);assert.match(file.text,/Chưa tạo thói quen/);
 assert.throws(()=>weekPlanExport(week,{...form,action:' '}));
});
test('summary export includes evidence, excludes arbitrary private fields and checks totals',()=>{
 const snapshot={version:1,weekStart:'2026-10-12',weekEnd:'2026-10-18',observedThrough:'2026-10-13',timezone:'Asia/Ho_Chi_Minh',completed:1,failed:0,skipped:0,focusSessions:0,focusMinutes:0,suggestion:'KEEP_SMALL_STEP',evidence:[{id:4,date:'2026-10-12',status:'COMPLETED'}],focusSourceIds:[],email:'SECRET'};
 const file=weeklyInsightExport(snapshot);assert.match(file.text,/#4/);assert.ok(!file.text.includes('SECRET'));
 assert.throws(()=>weeklyInsightExport({...snapshot,completed:9}));
});

test('saved weekly action validates matching week, revision, status and allowlisted payload',()=>{
 assert.deepEqual(weekSavePayload({...form,completed:true,token:'SECRET'},week,0),{...form,expectedVersion:0});
 assert.deepEqual(readServerWeekPlan({...form,week,version:2,completed:true,email:'SECRET'},week),{...form,week,version:2,completed:true});
 assert.equal(readServerWeekPlan('',week),null);
 for(const value of [{...form,week,version:0,completed:false},{...form,week,version:1,completed:'true'},{...form,week:'2026-10-26',version:1,completed:false}])assert.throws(()=>readServerWeekPlan(value,week));
 assert.throws(()=>weekSavePayload(form,week,null));assert.throws(()=>weekSavePayload(form,'2026-10-20',0));assert.throws(()=>weekSavePayload({...form,action:' '},week,0));
});
