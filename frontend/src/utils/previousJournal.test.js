import test from 'node:test';import assert from 'node:assert/strict';import {previousJournalDate,readPreviousJournal,previousFocusQuestion} from './previousJournal.js';import {appendJournalEvidence} from './journalEvidence.js';
test('previous intentions use exact calendar days across leap days and isolate source fields',()=>{
 assert.equal(previousJournalDate('2028-03-01'),'2028-02-29');assert.equal(previousJournalDate('2028-01-01'),'2027-12-31');assert.equal(previousJournalDate('0001-01-01'),null);
 const source=readPreviousJournal({id:4,date:'2028-02-29',tomorrowFocus:'Đọc 5 trang',win:'PRIVATE',obstacle:'PRIVATE'},'2028-03-01');assert.deepEqual(source,{id:4,date:'2028-02-29',focus:'Đọc 5 trang'});assert.throws(()=>readPreviousJournal({...source,date:'2028-02-28'},'2028-03-01'));
});
test('reflection questions are explicit prompts and append without overwriting or repeating saved text',()=>{
 const source={id:4,date:'2028-02-29',focus:'Đọc 5 trang'},question=previousFocusQuestion(source,'2028-03-01');assert.ok(question.includes('2028-02-29'));assert.ok(!question.includes(source.focus));const form={lesson:'Bài học của mình'};const next=appendJournalEvidence(form,'lesson',question);assert.ok(next.startsWith(form.lesson+'\n'));assert.equal(appendJournalEvidence({lesson:next},'lesson',question),next);assert.equal(form.lesson,'Bài học của mình');assert.throws(()=>previousFocusQuestion({...source,focus:'  '},'2028-03-01'));assert.throws(()=>readPreviousJournal({id:4,date:'2028-02-29',tomorrowFocus:'x'.repeat(5001)},'2028-03-01'));
});
