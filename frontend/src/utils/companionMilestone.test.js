import test from 'node:test';import assert from 'node:assert/strict';import {pendingCompanionMilestone} from './companionMilestone.js';
const value=(xp,pending=null)=>({available:true,species:'CHON',name:'Leaf',visible:true,version:1,xp,stage:xp>=500?3:xp>=100?2:1,nextThreshold:xp>=500?null:xp>=100?500:100,countedCheckIns:1,legacyExcluded:0,pendingMilestone:pending,progressionVersion:1});
test('only a server-pending milestone can produce a celebration on any device',()=>{
 assert.equal(pendingCompanionMilestone(value(95)),null);
 assert.deepEqual(pendingCompanionMilestone(value(105,2)),{species:'CHON',name:'Leaf',stage:2,xp:105,threshold:100});
 assert.deepEqual(pendingCompanionMilestone(value(500,3)),{species:'CHON',name:'Leaf',stage:3,xp:500,threshold:500});
});
test('malformed, hidden or ahead-of-progress server milestone responses fail closed',()=>{
 assert.throws(()=>pendingCompanionMilestone(value(95,2)));
 assert.throws(()=>pendingCompanionMilestone({...value(500,3),visible:false}));
 assert.throws(()=>pendingCompanionMilestone({...value(500,3),stage:2}));
});
