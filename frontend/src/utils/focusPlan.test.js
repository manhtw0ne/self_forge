import test from 'node:test';import assert from 'node:assert/strict';import {focusPlan,focusLink,readFocusLink,focusHabits} from './focusPlan.js';
test('focus proposal respects budget and energy without inferring habit completion',()=>{
 assert.equal(focusPlan(60,'LOW').focusMinutes,25);assert.equal(focusPlan(60,'HIGH').focusMinutes,60);
 assert.equal(focusPlan(30,'MEDIUM').focusMinutes,30);assert.equal(focusPlan(20,'HIGH').focusMinutes,null);
 assert.equal(focusPlan(5,'LOW').smallStepMinutes,5);
 for(const budget of ['',null,4,241,1.5])assert.throws(()=>focusPlan(budget,'LOW'));
});
test('focus links validate duration and habit and reject ambiguous URL input',()=>{
 assert.equal(focusLink(45,7),'/pomodoro?focus=45&habit=7');assert.deepEqual(readFocusLink('focus=45&habit=7'),{minutes:45,habitId:7});
 for(const query of ['focus=5','focus=121','focus=25&focus=60','focus=25&habit=0','focus=25&habit=7&habit=8','focus=bad','focus=25&habit=9007199254740992'])assert.equal(readFocusLink(query),null);
});

test('focus choices use due Dashboard habit IDs and exclude completed or scheduled-rest habits',()=>{
 assert.deepEqual(focusHabits([{habitId:7,name:'Read',scheduledToday:true,todayStatus:null},{habitId:8,name:'Done',scheduledToday:true,todayStatus:'COMPLETED'},{habitId:9,name:'Rest day',scheduledToday:false,todayStatus:null},{id:10,name:'Wrong shape',scheduledToday:true}]),[{id:7,name:'Read'}]);
});
