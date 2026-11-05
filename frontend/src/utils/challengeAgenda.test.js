import test from 'node:test';import assert from 'node:assert/strict';import {challengeAgenda} from './challengeAgenda.js';
const make=(id,extra={})=>({id,habitId:12,name:'Read',habitName:'Reading',status:'ACTIVE',startDate:'2028-02-27',endDate:'2028-03-04',targetDays:3,completedDays:1,...extra});
test('dashboard challenge agenda groups calendar windows and links only habits available today',()=>{
 const rows=[make(2),make(1,{endDate:'2028-03-02'}),make(3,{startDate:'2028-03-05',endDate:'2028-03-11'}),make(4,{startDate:'2028-02-20',endDate:'2028-02-26'}),make(5,{status:'COMPLETED',completedDays:3}),make(6,{status:'ABANDONED'})];
 const result=challengeAgenda(rows,'2028-03-01',[{habitId:12,todayStatus:'COMPLETED'}]);assert.deepEqual(result.current.map(row=>row.id),[1,2]);assert.equal(result.upcoming.length,1);assert.equal(result.ended.length,1);assert.equal(result.current[0].canCheckIn,true);assert.equal(result.current[0].todayStatus,'COMPLETED');assert.equal(result.current[0].remaining,2);assert.equal(result.current[0].calendarDays,2);
 assert.equal(challengeAgenda([make(1)],'2028-03-01',[{habitId:99}]).current[0].canCheckIn,false);assert.deepEqual(rows.map(row=>row.id),[2,1,3,4,5,6]);
});
test('dashboard challenge agenda rejects malformed evidence rather than showing invented progress',()=>{
 for(const rows of [[make(1),make(1)],[make(1,{completedDays:8})],[make(0)],[make(1,{habitId:-1})],[make(1,{status:'UNKNOWN'})],[make(1,{startDate:'2028-02-30'})]])assert.throws(()=>challengeAgenda(rows,'2028-03-01',[]));
 assert.throws(()=>challengeAgenda({},'2028-03-01',[]));assert.throws(()=>challengeAgenda([],'invalid',[]));assert.deepEqual(challengeAgenda([],'2028-03-01',[]),{current:[],upcoming:[],ended:[]});
 const result=challengeAgenda([{...make(1),email:'private',description:'private'}],'2028-03-04',[]);assert.equal(result.current[0].kind,'SHORT_WINDOW');assert.equal(result.current[0].email,undefined);assert.equal(result.current[0].description,undefined);
});
