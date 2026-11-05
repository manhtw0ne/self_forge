import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackPayload,readFeedback,readFeedbackList} from './feedback.js';

test('feedback payload is explicitly bounded and only accepts supported type and language',()=>{
 assert.deepEqual(feedbackPayload({type:'IDEA',summary:'  Add a calmer start screen ',steps:' ',expected:'One clear next step ',language:'en'}),{type:'IDEA',summary:'Add a calmer start screen',steps:'',expected:'One clear next step',language:'en'});
 for(const value of [null,{type:'BUG',summary:'ok',language:'fr'},{type:'OTHER',summary:'  ',language:'vi'},{type:'INVALID',summary:'Valid summary',language:'vi'},{type:'BUG',summary:'x'.repeat(501),language:'vi'},{type:'BUG',summary:'Valid summary',steps:'x'.repeat(1001),language:'vi'}]) assert.throws(()=>feedbackPayload(value));
});

test('feedback responses fail closed when ownership-safe list data is malformed',()=>{
 const row={id:7,type:'BUG',summary:'Save did not work',steps:'Tap Save',expected:'A confirmation',language:'en',createdAt:'2026-10-29T02:00:00Z',email:'private@example.com'};
 assert.deepEqual(readFeedback(row),{id:7,type:'BUG',summary:'Save did not work',steps:'Tap Save',expected:'A confirmation',language:'en',createdAt:'2026-10-29T02:00:00Z'});
 assert.equal(readFeedbackList([row]).length,1);
 for(const value of [[{...row,id:0}],[row,{...row}],'not-a-list',Array.from({length:21},(_,index)=>({...row,id:index+1}))]) assert.throws(()=>readFeedbackList(value));
});
