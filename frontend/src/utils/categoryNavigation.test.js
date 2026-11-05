import {test} from 'node:test';import assert from 'node:assert/strict';
import {categoryHabitsPath,readCategoryTarget,categoryScopeHabits} from './categoryNavigation.js';
import {selectHabits} from './habitList.js';
test('category links preserve explicit unassigned and active/all/inactive scopes',()=>{
 assert.equal(categoryHabitsPath(3),'/habits?category=3&state=all');assert.equal(categoryHabitsPath(null,'inactive'),'/habits?category=none&state=inactive');
 assert.deepEqual(readCategoryTarget('?category=3'),{invalid:false,category:'3',view:'all'});assert.deepEqual(readCategoryTarget('?category=none&state=active'),{invalid:false,category:'none',view:'active'});assert.equal(readCategoryTarget('?habit=3'),null);
 assert.throws(()=>categoryHabitsPath(0));assert.throws(()=>categoryHabitsPath(3,'hidden'));
});
test('ambiguous and unsafe category links fail closed instead of showing unrelated habits',()=>{
 for(const search of ['?category=1&category=2','?category=0','?category=01','?category=-1','?category=1x','?category=9007199254740993','?category=','?category=2&habit=1','?category=2&state=all&state=active','?category=2&state=hidden']){const target=readCategoryTarget(search);assert.equal(target.invalid,true);assert.deepEqual(categoryScopeHabits([{id:1}],[],target),[]);}
});
test('category drilldown includes archived habits and composes with accent-insensitive search',()=>{
 const active=[{id:1,name:'Đọc sách',categoryId:3},{id:2,name:'Ngủ',categoryId:null}],inactive=[{id:4,name:'Đọc báo',categoryId:3},{id:5,name:'Đi bộ',categoryId:null}];
 const scope=readCategoryTarget('?category=3&state=all');assert.deepEqual(selectHabits(categoryScopeHabits(active,inactive,scope),{category:scope.category,query:'doc'}).map(row=>row.id),[1,4]);
 const empty=readCategoryTarget('?category=none&state=inactive');assert.deepEqual(selectHabits(categoryScopeHabits(active,inactive,empty),{category:empty.category}).map(row=>row.id),[5]);assert.deepEqual(active.map(row=>row.id),[1,2]);
});
