import test from 'node:test';import assert from 'node:assert/strict';import {habitPath,readHabitTarget,targetedHabits} from './habitNavigation.js';
test('habit navigation rejects ambiguous and unsafe IDs without selecting a different habit',()=>{
 assert.equal(habitPath('/habits',12),'/habits?habit=12');assert.deepEqual(readHabitTarget('?habit=12'),{id:12});assert.equal(readHabitTarget('?other=1'),null);
 for(const search of ['?habit=1&habit=2','?habit=0','?habit=-1','?habit=1x','?habit=9007199254740993','?habit='])assert.deepEqual(readHabitTarget(search),{id:null});
 assert.throws(()=>habitPath('/unknown',1));assert.throws(()=>habitPath('/stats',0));
});
test('target selection includes inactive owned habits and never falls back to another source',()=>{
 const active=[{id:1,active:true}],inactive=[{id:2,active:false}];assert.deepEqual(targetedHabits(active,inactive,{id:2}),inactive);assert.deepEqual(targetedHabits(active,inactive,{id:9}),[]);assert.deepEqual(targetedHabits(active,inactive,{id:null}),[]);assert.equal(targetedHabits(active,inactive,null),null);
});
