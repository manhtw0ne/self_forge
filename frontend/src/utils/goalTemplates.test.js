import test from 'node:test';import assert from 'node:assert/strict';import {goalTemplates,goalTemplateForm,goalDraftPreview} from './goalTemplates.js';import {goalPayload} from './goalForm.js';import {translate} from './language.js';
test('all goal templates yield editable valid payloads with inclusive calendar deadlines',()=>{assert.equal(new Set(goalTemplates.map(row=>row.id)).size,6);for(const row of goalTemplates){const form=goalTemplateForm(row.id,'2028-02-01');assert.equal(form.deadline,'2028-03-01');assert.equal(goalPayload(form).targetValue,row.targetValue);assert.equal(form.currentValue,undefined);assert.equal(goalDraftPreview(form,'2028-02-01').days,30);}assert.throws(()=>goalTemplateForm('unknown','2028-02-01'));});
test('goal draft previews recalculate edited quantities without creating progress or changing source templates',()=>{const form=goalTemplateForm('reading','2028-02-01');const edited={...form,targetValue:90};const plan=goalDraftPreview(edited,'2028-02-01');assert.equal(plan.perSession,3);assert.equal(plan.preview.reduce((sum,row)=>sum+row.amount,0),21);assert.equal(form.targetValue,60);const english=goalTemplateForm('reading','2028-02-01',text=>translate('en',text));assert.equal(english.unit,'pages');assert.notEqual(english.name,form.name);assert.equal(goalDraftPreview({...form,deadline:''},'2028-02-01').state,'undated');});

test('draft schedule respects selected weekdays, empty availability and inclusive deadline',()=>{
 const form={...goalTemplateForm('reading','2028-02-01'),deadline:'2028-02-07',targetValue:12};
 const plan=goalDraftPreview(form,'2028-02-01',[1,3,5]);
 assert.equal(plan.sessions,3);assert.equal(plan.perSession,4);
 assert.deepEqual(plan.preview.map(row=>row.date),['2028-02-02','2028-02-04','2028-02-07']);
 assert.equal(plan.preview.reduce((sum,row)=>sum+row.amount,0),12);
 assert.equal(goalDraftPreview(form,'2028-02-01',[]).state,'no-days');
 assert.equal(goalDraftPreview({...form,deadline:'2028-02-01'},'2028-02-01',[1]).state,'no-days');
 assert.equal(goalDraftPreview({...form,deadline:'2028-02-01'},'2028-02-01',[2]).sessions,1);
 assert.equal(form.deadline,'2028-02-07');
});
