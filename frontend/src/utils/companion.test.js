import test from 'node:test';import assert from 'node:assert/strict';import {readCompanion,companionPayload,companionProgress} from './companion.js';
import {companionEvolutionThresholds,companionNextThreshold,companionProgressForXp,companionProgressionVersion,companionStageCount,companionStageForXp,companionStageThreshold} from './companionProgression.js';
const base={available:true,species:'CHON',name:'Leaf',visible:true,version:1,xp:5,stage:1,nextThreshold:100,countedCheckIns:1,legacyExcluded:0,pendingMilestone:null,progressionVersion:1};
test('the frontend progression contract owns the version, boundaries, and percentage',()=>{
 assert.equal(companionProgressionVersion,1);assert.equal(companionStageCount,3);assert.deepEqual(companionEvolutionThresholds(),[100,500]);
 assert.deepEqual([0,99,100,499,500].map(companionStageForXp),[1,1,2,2,3]);
 assert.equal(companionStageThreshold(1),0);assert.equal(companionNextThreshold(1),100);assert.equal(companionNextThreshold(2),500);assert.equal(companionNextThreshold(3),null);
 assert.equal(companionProgressForXp(50),50);assert.equal(companionProgressForXp(300),50);assert.equal(companionProgressForXp(500),100);
 for(const value of [-1,1.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>companionStageForXp(value));
});
test('companion response verifies stage thresholds and strips unrelated private fields',()=>{
 const value=readCompanion({...base,email:'SECRET'});assert.equal(value.email,undefined);assert.equal(companionProgress(base),5);
 const legacy={...base};delete legacy.pendingMilestone;assert.equal(readCompanion(legacy).pendingMilestone,null);
 assert.equal(readCompanion({...base,xp:100,stage:2,nextThreshold:500}).stage,2);
 assert.equal(readCompanion({...base,xp:100,stage:2,nextThreshold:500,pendingMilestone:2}).pendingMilestone,2);
 assert.equal(companionProgress({...base,xp:500,stage:3,nextThreshold:null}),100);
 for(const value of [{...base,xp:100},{...base,stage:3},{...base,xp:-1},{...base,countedCheckIns:6},{...base,nextThreshold:500},{...base,pendingMilestone:2},{...base,visible:false,pendingMilestone:2},{...base,progressionVersion:2}])assert.throws(()=>readCompanion(value));
});
test('companion choices carry only cosmetic preferences and reviewed revision',()=>{
 assert.deepEqual(companionPayload({...base,xp:9999,name:' Leaf '},1),{species:'CHON',name:'Leaf',visible:true,expectedVersion:1});
 for(const species of ['CHON','CHIM','KY_GIONG'])assert.equal(companionPayload({...base,species},0).species,species);
 assert.throws(()=>companionPayload({...base,species:'UNKNOWN'},0));assert.throws(()=>companionPayload({...base,name:'x'.repeat(41)},0));assert.throws(()=>companionPayload(base,null));
});
