import test from 'node:test';import assert from 'node:assert/strict';import {goalFocusHabits} from './goalFocus.js';import {focusPlan,focusLink,readFocusLink} from './focusPlan.js';
const row=(id,active=true)=>({id,active,name:'Habit '+id});
test('goal focus uses only linked active owned habits and deduplicates retries',()=>{
 assert.deepEqual(goalFocusHabits([row(1),row(1),row(2),row(9)],[row(1),row(2,false),row(3)]),[{id:1,name:'Habit 1'}]);
 assert.deepEqual(goalFocusHabits([row(1)],[row(1)],row(4)),[{id:1,name:'Habit 1'},{id:4,name:'Habit 4'}]);
 assert.equal(goalFocusHabits([],[],row(4,false)).length,0);
 assert.throws(()=>goalFocusHabits([{id:1}],[]));assert.throws(()=>goalFocusHabits([],null));
});
test('goal focus proposal preserves habit and duration without starting a session',()=>{
 const selected=goalFocusHabits([row(7)],[row(7)])[0];const plan=focusPlan(40,'HIGH');
 assert.deepEqual(readFocusLink(new URL(focusLink(plan.focusMinutes,selected.id),'https://example.test').search),{minutes:40,habitId:7});
 assert.equal(focusPlan(10,'LOW').focusMinutes,null);
});
