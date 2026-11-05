import {test} from 'node:test';import assert from 'node:assert/strict';
import {previousReviewWeek,previousReviewPlan,appendReviewText,previousReviewQuestion} from './previousReview.js';
const row={id:5,weekStart:'2025-12-29',nextWeekPlan:'Đọc sáng\n\nGiảm lịch',wins:'Private win',userId:99};
test('previous review uses exactly the preceding Monday across years and strips unrelated content',()=>{
 assert.equal(previousReviewWeek('2026-01-05'),'2025-12-29');assert.equal(previousReviewWeek('0001-01-01'),null);
 assert.deepEqual(previousReviewPlan([row],'2026-01-05'),{id:5,weekStart:'2025-12-29',targetWeek:'2026-01-05',plan:row.nextWeekPlan});
 assert.equal(previousReviewPlan([row],'2026-01-12'),null);assert.throws(()=>previousReviewPlan([row,row],'2026-01-05'));assert.throws(()=>previousReviewWeek('2026-01-06'));
});
test('invalid plans never become source data and date question does not copy private plan text',()=>{
 assert.throws(()=>previousReviewPlan([{...row,nextWeekPlan:'x'.repeat(2001)}],'2026-01-05'));
 assert.throws(()=>previousReviewPlan([{...row,id:0}],'2026-01-05'));
 const source=previousReviewPlan([row],'2026-01-05'),question=previousReviewQuestion(source,'2026-01-05');assert.ok(question.includes(row.weekStart));assert.ok(!question.includes('Đọc sáng'));assert.throws(()=>previousReviewQuestion(source,'2026-01-12'));
});
test('review append preserves current text and rating, deduplicates multiline blocks, and respects 2000 limit atomically',()=>{
 const form={improvements:'Đã viết',nextWeekPlan:'',rating:4};const result=appendReviewText(form,'improvements',row.nextWeekPlan);assert.equal(result,'Đã viết\n\n'+row.nextWeekPlan);assert.equal(form.improvements,'Đã viết');assert.equal(form.rating,4);
 assert.equal(appendReviewText({...form,improvements:result},'improvements',row.nextWeekPlan),result);
 assert.equal(appendReviewText(form,'nextWeekPlan','x'.repeat(2000)).length,2000);
 assert.throws(()=>appendReviewText(form,'improvements','x'.repeat(2000)));assert.throws(()=>appendReviewText(form,'rating','3'));
});
