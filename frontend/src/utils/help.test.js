import test from 'node:test';import assert from 'node:assert/strict';import {supportDiagnostics,searchHelp} from './help.js';import {readRequestId} from './requestId.js';import {helpTopics} from '../data/helpTopics.js';
test('support diagnostics include only technical allowlisted fields',()=>{
 const value=supportDiagnostics({version:'a'.repeat(64),timezone:'Asia/Ho_Chi_Minh',online:true,standalone:false,width:390,requestId:'4cc3e1ae-c48a-41ba-9f0f-2f2f25e31f8c',email:'PRIVATE',token:'SECRET',journal:'PRIVATE'},new Date('2026-10-15T00:00:00Z'));
 assert.deepEqual(Object.keys(value),['app','version','timezone','online','mode','viewportWidth','capturedAt','requestId']);assert.ok(!JSON.stringify(value).includes('PRIVATE'));assert.ok(!JSON.stringify(value).includes('SECRET'));assert.equal(value.mode,'browser');assert.throws(()=>supportDiagnostics({version:'bad',online:true,standalone:false,width:390,requestId:null}));assert.throws(()=>supportDiagnostics({version:'a'.repeat(64),timezone:'Asia/Ho_Chi_Minh',online:true,standalone:false,width:390,requestId:'PRIVATE'}));
});
test('help search supports Vietnamese without accents and English across topics',()=>{
 assert.ok(searchHelp(helpTopics,'nhat ky').some(topic=>topic.id==='insight'));assert.ok(searchHelp(helpTopics,'goal progress').some(topic=>topic.id==='goal'));assert.ok(searchHelp(helpTopics,'phan hoi beta').some(topic=>topic.id==='beta-feedback'));assert.equal(searchHelp(helpTopics,'').length,helpTopics.length);assert.equal(searchHelp(helpTopics,'nonexistentword').length,0);
});
test('request IDs accept only server-generated UUIDs and reject arbitrary content',()=>{
 assert.equal(readRequestId('4cc3e1ae-c48a-41ba-9f0f-2f2f25e31f8c'),'4cc3e1ae-c48a-41ba-9f0f-2f2f25e31f8c');
 for(const value of [null,'','PRIVATE_EMAIL','4CC3E1AE-C48A-41BA-9F0F-2F2F25E31F8C','4cc3e1ae-c48a-41ba-9f0f-2f2f25e31f8c\nX-Injected: yes'])assert.equal(readRequestId(value),null);
});
