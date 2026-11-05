import test from 'node:test';
import assert from 'node:assert/strict';
import { readHabitGoalLinks,focusedGoal } from './habitGoalLinks.js';
import { selectGoals } from './goalList.js';
const row={habitId:2,goalId:1,name:'Đọc sách',status:'ACTIVE',currentValue:2,targetValue:12,unit:'cuốn',deadline:'2026-12-31'};
test('goal metadata groups by habit and excludes arbitrary private properties',()=>{
 const result=readHabitGoalLinks([{...row,email:'SECRET'},{...row,goalId:3,status:'COMPLETED'}]);
 assert.equal(result.get(2).length,2);assert.ok(!JSON.stringify([...result]).includes('SECRET'));assert.equal(result.get(9),undefined);
});
test('invalid or duplicate metadata cannot become misleading goal links',()=>{
 for(const rows of [[row,row],[{...row,habitId:-1}],[{...row,status:'unknown'}],[{...row,deadline:'2026-02-30'}]])assert.throws(()=>readHabitGoalLinks(rows));
});
test('deep links select only numeric safe IDs and compose with owned goal filters',()=>{
 assert.equal(focusedGoal('?goal=1'),1);
 for(const search of ['?goal=0','?goal=1&goal=2','?goal=1e2','?goal=https://example.com','?goal=9007199254740992',''])assert.equal(focusedGoal(search),null);
 assert.deepEqual(selectGoals([{id:1,name:'One',status:'ACTIVE'},{id:2,name:'Two',status:'COMPLETED'}],{goalId:2}).map(g=>g.id),[2]);
 assert.deepEqual(selectGoals([{id:1,name:'One',status:'ACTIVE'}],{goalId:2}),[]);
});
