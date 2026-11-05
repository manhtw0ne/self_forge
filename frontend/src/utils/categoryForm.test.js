import {test} from 'node:test';import assert from 'node:assert/strict';import {categoryFormValue,categoryPayload,categoryUsage} from './categoryForm.js';
test('category forms validate metadata and send an exact saved baseline when editing',()=>{
 const saved={id:2,systemDefault:false,name:'Study',color:null,icon:null};const form=categoryFormValue(saved);assert.equal(form.color,'#7c3aed');
 assert.deepEqual(categoryPayload({...form,name:' Learn '},saved),{name:'Learn',color:'#7c3aed',icon:'',expected:{name:'Study',color:null,icon:null}});assert.equal(saved.name,'Study');
 assert.throws(()=>categoryPayload(form,{...saved,systemDefault:true}));
});
test('invalid names, colors and oversized icons never become category requests',()=>{
 const form={name:'Study',icon:'📚',color:'#123abc'};
 for(const change of [{name:' '},{name:'x'.repeat(256)},{color:'red'},{color:'#123abc;url(x)'},{icon:'x'.repeat(33)}])assert.throws(()=>categoryPayload({...form,...change}));
 assert.deepEqual(categoryPayload(form),form);
});
test('category usage counts both active and archived habits by exact category ID',()=>{
 assert.equal(categoryUsage([{id:1,categoryId:2,active:true},{id:2,categoryId:2,active:false},{id:3,categoryId:3}],2),2);
 assert.equal(categoryUsage([{categoryId:null}],2),0);
});
