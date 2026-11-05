import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectRewards,rewardListPage,repeatRewardForm} from './rewardList.js';
const rows=[{id:3,name:'Đọc sách',description:'Cuối tuần',xpCost:50,claimed:false},{id:2,name:'Trà',description:'Thư giãn',xpCost:20,claimed:true},{id:1,name:'Phim',description:'Cuối tuần',xpCost:20,claimed:false}];
test('reward search supports Vietnamese without accents and combines budget/status without spending XP',()=>{
 assert.deepEqual(selectRewards(rows,{query:'doc cuoi'}).map(r=>r.id),[3]);
 assert.deepEqual(selectRewards(rows,{status:'AFFORDABLE',xp:20}).map(r=>r.id),[1]);
 assert.equal(selectRewards(rows,{status:'AFFORDABLE',xp:0}).length,0);
 assert.deepEqual(selectRewards(rows,{status:'CLAIMED'}).map(r=>r.id),[2]);
 assert.deepEqual(selectRewards(rows,{status:'UNCLAIMED',query:'cuoi',sort:'CHEAPEST'}).map(r=>r.id),[1,3]);
 assert.deepEqual(selectRewards(rows,{sort:'EXPENSIVE'}).map(r=>r.id),[3,2,1]);
 assert.deepEqual(rows.map(r=>r.id),[3,2,1]);
});
test('reward pages clamp after deleting or claiming the last matching row',()=>{
 const many=Array.from({length:25},(_,i)=>({id:i+1}));
 assert.equal(rewardListPage(many,2).items[0].id,13);
 assert.equal(rewardListPage(many,3).items.length,1);
 assert.deepEqual(rewardListPage(many.slice(0,12),3),{items:many.slice(0,12),page:1,pages:1,total:12});
 assert.deepEqual(rewardListPage([],3),{items:[],page:1,pages:1,total:0});
 assert.throws(()=>rewardListPage(many,0));
});

test('repeat claimed reward copies editable fields only and never reuses identity or claim state',()=>{
 const original={...rows[1],claimedAt:'2026-10-16T01:00:00Z',requestId:'old'};
 assert.deepEqual(repeatRewardForm(original),{name:'Trà',description:'Thư giãn',xpCost:20});
 assert.equal(original.claimed,true);
 assert.throws(()=>repeatRewardForm(rows[0]));
 assert.throws(()=>repeatRewardForm({...original,xpCost:0}));
 assert.throws(()=>repeatRewardForm({...original,id:null}));
});
