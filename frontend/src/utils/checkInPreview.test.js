import test from 'node:test';import assert from 'node:assert/strict';import {readCheckInPreview} from './checkInPreview.js';
const ready={checkInId:8,fromStatus:'COMPLETED',toStatus:'SKIPPED',allowed:true,reason:'READY',accountDelta:-10,companionDelta:-10,companionXpBefore:105,companionXpAfter:95,stageBefore:2,stageAfter:1,companionProgressionVersion:1};
test('preview checks matching source and exact companion arithmetic and stage boundaries',()=>{
 assert.deepEqual(readCheckInPreview({...ready,note:'SECRET'},8,'COMPLETED','SKIPPED'),ready);
 assert.throws(()=>readCheckInPreview(ready,9,'COMPLETED','SKIPPED'));
 for(const value of [{...ready,companionXpAfter:100},{...ready,stageAfter:2},{...ready,accountDelta:undefined},{...ready,reason:'LEGACY'},{...ready,companionProgressionVersion:2}])assert.throws(()=>readCheckInPreview(value,8,'COMPLETED','SKIPPED'));
});
test('blocked requests expose no guessed effects, while hidden companions have null fields',()=>{
 const blocked={...ready,allowed:false,reason:'INSUFFICIENT_XP',accountDelta:null,companionDelta:null,companionXpBefore:null,companionXpAfter:null,stageBefore:null,stageAfter:null};
 assert.equal(readCheckInPreview(blocked,8,'COMPLETED','SKIPPED').allowed,false);
 assert.throws(()=>readCheckInPreview({...blocked,accountDelta:-10},8,'COMPLETED','SKIPPED'));
 assert.equal(readCheckInPreview({...ready,companionDelta:null,companionXpBefore:null,companionXpAfter:null,stageBefore:null,stageAfter:null},8,'COMPLETED','SKIPPED').companionDelta,null);
});
