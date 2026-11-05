import test from 'node:test';
import assert from 'node:assert/strict';
import {restartSteps,writeRestartPlan,readRestartPlan,restartExport,readServerRestart,restartDay,savedRestartExport,restartSavePayload,restartReviewPayload,readRestartReview} from './restartPlan.js';
const plan={name:'Đọc sách',reason:'BUSY',start:'2028-02-28',steps:['Đọc 2 phút','Lặp lại','Đánh giá']};
test('restart plans keep exactly three editable days including leap day',()=>{
 const exported=restartExport(plan);assert.match(exported.text,/2028-02-29/);assert.match(exported.text,/2028-03-01/);
 for(const reason of ['BUSY','HARD','FORGOT','REST'])assert.equal(restartSteps(reason).length,3);
 assert.throws(()=>restartSteps('UNKNOWN'));assert.match(exported.text,/không tự thay lịch, XP hoặc streak/);
});
test('draft ownership, private field stripping and storage errors are enforced',()=>{
 const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 writeRestartPlan(storage,1,{...plan,token:'SECRET'});assert.deepEqual(readRestartPlan(storage,1),plan);assert.equal(readRestartPlan(storage,10),null);
 assert.ok(!map.get('sf_restart_plan:1').includes('SECRET'));
 assert.throws(()=>writeRestartPlan({setItem(){throw Error('blocked');}},1,plan));
});
test('invalid dates, oversized text and incomplete export are rejected',()=>{
 const store={setItem(){}};
 for(const value of [{...plan,start:'2026-02-30'},{...plan,steps:['one']},{...plan,name:'x'.repeat(256)},{...plan,steps:['x'.repeat(501),'two','three']}])assert.throws(()=>writeRestartPlan(store,1,value));
 assert.throws(()=>restartExport({...plan,steps:['','','']}));
});

test('server plans require a positive version and complete actions',()=>{
 assert.deepEqual(readServerRestart({...plan,version:3}),{...plan,version:3});
 assert.equal(readServerRestart(''),null);
 assert.throws(()=>readServerRestart({...plan,version:0}));
 assert.throws(()=>readServerRestart({...plan,version:1,steps:['','','']}));
});

test('saved plan shows account-day action without inferring completion',()=>{
 const saved={...plan,version:1};
 assert.deepEqual(restartDay(saved,'2028-02-29'),{state:'active',date:'2028-02-29',day:2,action:'Lặp lại',name:'Đọc sách'});
 assert.equal(restartDay(saved,'2028-02-27').state,'scheduled');
 assert.equal(restartDay(saved,'2028-03-01').day,3);
 assert.equal(restartDay(saved,'2028-03-02').state,'ended');
 assert.equal(restartDay(null,'2028-02-28'),null);
});

test('saved export labels the loaded version and excludes other data',()=>{
 const file=savedRestartExport({...plan,version:5,email:'SECRET'});
 assert.match(file.text,/Phiên bản: 5/);assert.ok(!file.text.includes('SECRET'));assert.match(file.filename,/restart-saved/);
 assert.throws(()=>savedRestartExport(null));
});

test('save payload requires reviewed version and valid complete input before sending',()=>{
 assert.deepEqual(restartSavePayload(plan,0),{...plan,expectedVersion:0});
 for(const version of [null,-1,1.5])assert.throws(()=>restartSavePayload(plan,version));
 assert.throws(()=>restartSavePayload({...plan,start:''},0));
 assert.throws(()=>restartSavePayload({...plan,steps:['','','']},0));
});

test('restart review validates self-reported days and keeps plan and review versions separate',()=>{
 const draft={daysTried:'2',decision:'EASIER',note:'Five minutes was manageable',email:'SECRET'};
 assert.deepEqual(restartReviewPayload(draft,4,0),{planVersion:4,expectedVersion:0,daysTried:2,decision:'EASIER',note:draft.note});
 assert.deepEqual(readRestartReview({...draft,daysTried:2,planVersion:4,version:1},4),{planVersion:4,version:1,daysTried:2,decision:'EASIER',note:draft.note});
 for(const daysTried of ['',null,-1,4,1.5])assert.throws(()=>restartReviewPayload({...draft,daysTried},4,0));
 assert.throws(()=>readRestartReview({...draft,planVersion:3,version:1},4));
 assert.throws(()=>restartReviewPayload({...draft,note:'x'.repeat(501)},4,0));
 assert.throws(()=>restartReviewPayload({...draft,decision:'UNKNOWN'},4,0));
});
