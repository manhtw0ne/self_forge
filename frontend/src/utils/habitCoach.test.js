import test from 'node:test';
import assert from 'node:assert/strict';
import {habitCoachPayload,readHabitCoachHabits,readHabitCoachReply,readHabitCoachStatus} from './habitCoach.js';

const habits=[{id:2,name:'Read',difficulty:'EASY',targetPerWeek:4,active:true}];

test('habit coach sends only an explicit question, selected habit identity and consent',()=>{
 assert.deepEqual(habitCoachPayload({question:' Why do I miss this? ',habitId:2,consent:true,language:'en'}),{question:'Why do I miss this?',habitId:2,consent:true,language:'en'});
 assert.throws(()=>habitCoachPayload({question:'no',habitId:2,consent:true,language:'en'}));
 assert.throws(()=>habitCoachPayload({question:'Why do I miss this?',habitId:2,consent:false,language:'vi'}));
 assert.deepEqual(readHabitCoachHabits(habits),[{id:2,name:'Read',difficulty:'EASY',targetPerWeek:4}]);
 assert.throws(()=>readHabitCoachHabits([{...habits[0],active:false}]));
});

test('habit coach validates status and a bounded two-part reply',()=>{
 assert.deepEqual(readHabitCoachStatus({available:true,limit:3,remaining:2}),{available:true,limit:3,remaining:2});
 assert.deepEqual(readHabitCoachReply({answer:'Try a smaller start.',experiment:'Read one page after breakfast for three days.'}),{answer:'Try a smaller start.',experiment:'Read one page after breakfast for three days.'});
 assert.throws(()=>readHabitCoachStatus({available:true,limit:3,remaining:4}));
 assert.throws(()=>readHabitCoachReply({answer:'Missing experiment'}));
});
