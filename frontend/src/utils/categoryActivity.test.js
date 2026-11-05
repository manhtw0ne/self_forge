import {test} from 'node:test';import assert from 'node:assert/strict';import {readCategoryActivity,categoryActivityName,categoryActivityExport} from './categoryActivity.js';
const category={categoryId:1,name:'Reading',systemDefault:false,habits:2,completed:3,failed:1,skipped:1,checkIns:5};
const data={month:'2026-10',observedThrough:'2026-10-16',timezone:'Asia/Ho_Chi_Minh',completed:3,failed:1,skipped:1,checkIns:5,categories:[category]};
const read=value=>readCategoryActivity(value,'2026-10','2026-10-16','Asia/Ho_Chi_Minh');
test('category activity verifies observation scope and totals, allowing unrecorded days without inferred failures',()=>{
 const result=read({...data,categories:[{...category,note:'PRIVATE'}]});assert.equal(result.categories[0].note,undefined);assert.equal(result.failed,1);assert.equal(result.checkIns,5);
 for(const change of [{completed:4},{observedThrough:'2026-10-31'},{timezone:'UTC'},{categories:[category,category]},{categories:[{...category,habits:6}]}])assert.throws(()=>read({...data,...change}));
});
test('uncategorized groups carry no leaked category identity and future months are rejected',()=>{
 assert.equal(categoryActivityName({categoryId:null,name:'',systemDefault:false}),'Không có danh mục');
 assert.throws(()=>read({...data,categories:[{...category,categoryId:null,name:'Private category'}]}));
 assert.throws(()=>readCategoryActivity(data,'2026-11','2026-10-16','Asia/Ho_Chi_Minh'));
 assert.equal(categoryActivityName({...category,name:'Exercise',systemDefault:true},text=>'translated '+text),'translated Exercise');
 assert.equal(categoryActivityName({...category,name:'Exercise',systemDefault:false},()=> 'changed'),'Exercise');
});
test('CSV declares current category grouping and excludes private fields and formula execution',()=>{
 const result=read({...data,categories:[{...category,name:'=EVIL()'}]}),file=categoryActivityExport(result);assert.equal(file.filename,'selfforge-categories-2026-10.csv');assert.ok(file.content.includes('Phân nhóm theo danh mục hiện tại'));assert.ok(file.content.includes("'=EVIL()"));assert.ok(!file.content.includes('categoryId'));assert.ok(!file.content.includes('PRIVATE'));
});
