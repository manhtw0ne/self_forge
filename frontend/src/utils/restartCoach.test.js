import test from 'node:test';
import assert from 'node:assert/strict';
import {readRestartCoachDraft,readRestartCoachStatus,restartCoachPayload,readSavedRestartCoachDraft,writeSavedRestartCoachDraft,removeSavedRestartCoachDraft} from './restartCoach.js';

const form={name:'Read books',reason:'BUSY',start:'2026-10-17',steps:['','','']};
test('restart coach sends only its named activity, selected reason, consent and language',()=>{
 assert.deepEqual(restartCoachPayload(form,true,'vi'),{name:'Read books',reason:'BUSY',consent:true,language:'vi'});
 assert.throws(()=>restartCoachPayload(form,false,'vi'));
 assert.throws(()=>restartCoachPayload({...form,reason:'UNKNOWN'},true,'vi'));
});
test('restart coach accepts exactly three editable steps',()=>{
 assert.deepEqual(readRestartCoachStatus({available:true,limit:3,remaining:2}),{available:true,limit:3,remaining:2});
 assert.throws(()=>readRestartCoachStatus({available:true,limit:3,remaining:4}));
 assert.equal(readRestartCoachDraft({steps:['One','Two','Three']}).steps.length,3);
 assert.throws(()=>readRestartCoachDraft({steps:['One','Two']}));
 assert.throws(()=>readRestartCoachDraft({steps:['One','Two','x'.repeat(501)]}));
});
test('restart coach draft stays in this tab for the exact account, activity, reason and language',()=>{
 const values=new Map(),storage={getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const draft={steps:['Start small','Repeat','Review']};
 assert.deepEqual(writeSavedRestartCoachDraft(storage,7,form,'vi',draft),draft);
 assert.deepEqual(readSavedRestartCoachDraft(storage,7,form,'vi'),draft);
 assert.equal(readSavedRestartCoachDraft(storage,8,form,'vi'),null);
 assert.equal(readSavedRestartCoachDraft(storage,7,{...form,name:'Walk'},'vi'),null);
 assert.equal(readSavedRestartCoachDraft(storage,7,form,'en'),null);
 removeSavedRestartCoachDraft(storage,7);
 assert.equal(readSavedRestartCoachDraft(storage,7,form,'vi'),null);
});
test('restart coach rejects corrupt local drafts without using another account data',()=>{
 const storage={getItem:()=>'{bad',setItem(){throw Error('blocked');},removeItem(){}};
 assert.throws(()=>readSavedRestartCoachDraft(storage,1,form,'vi'));
 assert.throws(()=>writeSavedRestartCoachDraft(storage,1,form,'vi',{steps:['one','two']}));
 assert.throws(()=>writeSavedRestartCoachDraft(storage,1,form,'vi',{steps:['one','two','three']}));
});
