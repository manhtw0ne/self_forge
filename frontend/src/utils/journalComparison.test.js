import {test} from 'node:test';import assert from 'node:assert/strict';
import {journalComparisonDates,readJournalComparison,journalComparisonQuestion} from './journalComparison.js';
import {appendJournalEvidence} from './journalEvidence.js';
const earlier={id:1,date:'2026-10-01',win:'Đã đọc',obstacle:'Mệt',lesson:null,tomorrowFocus:'Đọc sáng',userId:99};
const later={id:2,date:'2026-10-16',win:'5 phút',obstacle:'',lesson:'Nhẹ hơn',tomorrowFocus:''};
test('journal comparison orders snapshots and keeps only allowed fields without treating gaps as failures',()=>{
 assert.deepEqual(journalComparisonDates(later.date,earlier.date,later.date),[earlier.date,later.date]);
 const result=readJournalComparison([later,earlier],[later.date,earlier.date],later.date);
 assert.equal(result[0].date,earlier.date);assert.equal(result[0].lesson,'');assert.equal(result[0].userId,undefined);assert.equal(result.length,2);assert.equal(earlier.lesson,null);
});
test('journal comparison rejects missing, duplicated, mismatched, future and oversized sources',()=>{
 assert.throws(()=>journalComparisonDates(earlier.date,earlier.date,later.date));
 assert.throws(()=>journalComparisonDates(earlier.date,'2026-10-17',later.date));
 assert.throws(()=>journalComparisonDates('2026-02-30',later.date,later.date));
 for(const values of [[earlier,null],[earlier,{...later,id:1}],[earlier,{...later,date:earlier.date}],[earlier,{...later,win:'x'.repeat(5001)}],[earlier,{...later,lesson:17}]])assert.throws(()=>readJournalComparison(values,[earlier.date,later.date],later.date));
});
test('reflection inserts only date references and preserves existing text with deduplication and size limits',()=>{
 const rows=readJournalComparison([earlier,later],[earlier.date,later.date],later.date),question=journalComparisonQuestion(rows);
 assert.ok(question.includes(earlier.date));assert.ok(question.includes(later.date));assert.ok(!question.includes('Mệt'));
 const form={lesson:'Tôi đã viết'};const inserted=appendJournalEvidence(form,'lesson',question);assert.ok(inserted.startsWith(form.lesson+'\n'));assert.equal(form.lesson,'Tôi đã viết');assert.equal(appendJournalEvidence({lesson:inserted},'lesson',question),inserted);
 assert.throws(()=>appendJournalEvidence({lesson:'x'.repeat(5000)},'lesson',question));
});
