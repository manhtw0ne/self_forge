import test from 'node:test';import assert from 'node:assert/strict';import {journalTemplates,applyJournalTemplate} from './journalTemplates.js';import {translate} from './language.js';
const form={win:'Nội dung cá nhân',obstacle:'',lesson:'',tomorrowFocus:''};
test('journal templates append only selected prompts without overwriting text or duplicating exact prompts',()=>{
 for(const row of journalTemplates){const next=applyJournalTemplate(form,row.id,['win','lesson']);assert.ok(next.win.startsWith(form.win+'\n'));assert.equal(next.obstacle,'');assert.equal(next.tomorrowFocus,'');assert.equal(next.lesson,row.prompts.lesson);assert.deepEqual(applyJournalTemplate(next,row.id,['win','lesson']),next);}
 assert.equal(form.win,'Nội dung cá nhân');assert.equal(form.lesson,'');
 const english=applyJournalTemplate(form,'brief',['lesson'],text=>translate('en',text));assert.notEqual(english.lesson,journalTemplates[0].prompts.lesson);
});
test('multi-field insertion is atomic at the character limit and rejects arbitrary fields',()=>{
 const full={...form,lesson:'x'.repeat(5000)};assert.throws(()=>applyJournalTemplate(full,'brief',['win','lesson']));assert.equal(full.win,form.win);assert.equal(full.lesson.length,5000);
 for(const fields of [[],['unknown'],['win','win'],['__proto__']])assert.throws(()=>applyJournalTemplate(form,'brief',fields));assert.throws(()=>applyJournalTemplate(form,'unknown',['win']));
 const result=applyJournalTemplate({...form,private:'secret'},'brief',['lesson']);assert.equal(result.private,undefined);assert.deepEqual(Object.keys(result),Object.keys(form));
});
