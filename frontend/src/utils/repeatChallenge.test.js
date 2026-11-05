import {test} from 'node:test';import assert from 'node:assert/strict';
import {repeatChallengeDraft} from './repeatChallenge.js';
const original={id:7,habitId:2,name:'Đọc mỗi ngày',description:'Sách mới',targetDays:5,startDate:'2028-02-27',endDate:'2028-03-04',status:'ACTIVE',completedDays:4,requestId:'old'};
const habits=[{id:2,active:true}];
test('repeat ended challenge preserves its inclusive calendar window, never old IDs or progress',()=>{
 const draft=repeatChallengeDraft(original,{completedDays:4},habits,'2028-03-05');
 assert.deepEqual(draft,{habitId:'2',name:original.name,description:original.description,targetDays:5,windowDays:7,startDate:'2028-03-05'});
 assert.equal(original.completedDays,4);assert.equal(original.status,'ACTIVE');
 assert.equal(repeatChallengeDraft(original,{completedDays:4},habits,'2028-03-05','LIGHT').targetDays,3);
 assert.equal(repeatChallengeDraft(original,{completedDays:4},habits,'2028-03-05','LIGHT').windowDays,7);
});
test('only reached, stopped or ended challenges on active habits can prepare a new round',()=>{
 assert.equal(repeatChallengeDraft(original,{completedDays:5},habits,'2028-03-01').targetDays,5);
 assert.equal(repeatChallengeDraft({...original,status:'ABANDONED'},{completedDays:0},habits,'2028-03-01').targetDays,5);
 assert.throws(()=>repeatChallengeDraft(original,{completedDays:0},habits,'2028-03-01'));
 assert.throws(()=>repeatChallengeDraft(original,{completedDays:4},[{id:2,active:false}],'2028-03-05'));
 assert.throws(()=>repeatChallengeDraft(original,{completedDays:4},[{id:3,active:true}],'2028-03-05'));
 assert.throws(()=>repeatChallengeDraft(original,null,habits,'2028-03-05'));
});
test('invalid dates, overlong text, unknown modes and overflowing future windows are rejected',()=>{
 for(const [row,date,mode]of [[original,'2028-02-30','SAME'],[{...original,name:'x'.repeat(256)},'2028-03-05','SAME'],[original,'2028-03-05','AUTO'],[original,'9999-12-31','SAME']])assert.throws(()=>repeatChallengeDraft(row,{completedDays:5},habits,date,mode));
});
