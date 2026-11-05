import test from 'node:test';
import assert from 'node:assert/strict';
import {readRequestId} from './requestId.js';

test('request IDs accept only a server-style UUID and do not echo arbitrary content',()=>{
 assert.equal(readRequestId('4cc3e1ae-c48a-41ba-9f0f-2f2f25e31f8c'),'4cc3e1ae-c48a-41ba-9f0f-2f2f25e31f8c');
 for(const value of [null,'','PRIVATE_EMAIL','4CC3E1AE-C48A-41BA-9F0F-2F2F25E31F8C','4cc3e1ae-c48a-41ba-9f0f-2f2f25e31f8c\nX-Injected: yes'])assert.equal(readRequestId(value),null);
});
