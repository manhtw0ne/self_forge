import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyFocusCoachPayload,readDailyFocusCoachPlan,readDailyFocusCoachStatus} from './dailyFocusCoach.js';

const habits=[{habitId:1,name:'Read',scheduledToday:true,todayStatus:null},{habitId:2,name:'Draw',scheduledToday:true,todayStatus:null}];

test('daily focus coach sends only an explicit validated choice and consent',()=>{
 assert.deepEqual(dailyFocusCoachPayload({budget:'60',energy:'MEDIUM',ids:[2,1],habits,consent:true,language:'en'}),{budget:60,energy:'MEDIUM',habitIds:[2,1],consent:true,language:'en'});
 for(const value of [{consent:false,language:'vi'},{consent:true,language:'fr'},{consent:true,language:'vi',ids:[1,1]}])assert.throws(()=>dailyFocusCoachPayload({budget:'60',energy:'MEDIUM',ids:[1,2],habits,...value}));
});

test('daily focus coach only accepts a complete priority order from the selected habits',()=>{
 assert.deepEqual(readDailyFocusCoachStatus({available:true,limit:3,remaining:2}),{available:true,limit:3,remaining:2});
 assert.deepEqual(readDailyFocusCoachPlan({headline:'Start with drawing.',priorityHabitIds:[2,1]},[1,2]),{headline:'Start with drawing.',priorityHabitIds:[2,1]});
 for(const value of [{available:true,limit:3,remaining:4},{available:'yes',limit:3,remaining:2}])assert.throws(()=>readDailyFocusCoachStatus(value));
 for(const value of [{headline:'Missing',priorityHabitIds:[1]},{headline:'Duplicate',priorityHabitIds:[1,1]},{headline:'Foreign',priorityHabitIds:[1,3]}])assert.throws(()=>readDailyFocusCoachPlan(value,[1,2]));
});
