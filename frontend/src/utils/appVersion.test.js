import test from 'node:test';import assert from 'node:assert/strict';import {createVersionChecker} from './appVersion.js';
const version='a'.repeat(64),next='b'.repeat(64);
test('version check reports releases without initiating navigation and throttles foreground events',async()=>{
 let now=0,calls=0;const updates=[];let observed=version;const checker=createVersionChecker({version,now:()=>now,fetchVersion:async()=>{calls++;return {version:observed};},publish:value=>updates.push(value)});
 await checker.check();observed=next;await checker.check();assert.equal(calls,1);now=60000;await checker.check();assert.deepEqual(updates,[false,true]);observed=version;now=120000;await checker.check();assert.deepEqual(updates,[false,true,false]);checker.stop();now=180000;await checker.check();assert.equal(calls,3);
});
test('late or invalid responses and unavailable networks never publish an update',async()=>{
 let resolve;const updates=[];const checker=createVersionChecker({version,fetchVersion:()=>new Promise(done=>resolve=done),publish:v=>updates.push(v)});const pending=checker.check();await checker.check();checker.stop();resolve({version:next});await pending;assert.deepEqual(updates,[]);
 for(const response of [{version:'bad'},null,{version:123}]){await createVersionChecker({version,fetchVersion:async()=>response,publish:v=>updates.push(v)}).check();}
 await createVersionChecker({version,fetchVersion:async()=>{throw Error('offline');},publish:v=>updates.push(v)}).check();assert.deepEqual(updates,[]);
});
