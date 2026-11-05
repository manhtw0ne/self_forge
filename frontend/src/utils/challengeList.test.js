import test from 'node:test';import assert from 'node:assert/strict';import {challengePeriod,selectChallenges,challengeListExport} from './challengeList.js';
const row={id:1,name:'Đọc sách',habitName:'Đọc mỗi tối',description:'Chậm mà đều',habitId:4,status:'ACTIVE',startDate:'2028-02-01',endDate:'2028-02-07',targetDays:3,note:'PRIVATE'};
test('challenge time filters use inclusive boundaries independently of lifecycle status',()=>{
 assert.equal(challengePeriod(row,'2028-01-31'),'UPCOMING');assert.equal(challengePeriod(row,'2028-02-01'),'CURRENT');assert.equal(challengePeriod(row,'2028-02-07'),'CURRENT');assert.equal(challengePeriod(row,'2028-02-08'),'ENDED');
 const rows=[row,{...row,id:2,status:'COMPLETED'},{...row,id:3,startDate:'2028-03-01',endDate:'2028-03-07'}];
 assert.equal(selectChallenges(rows,{today:'2028-02-04',status:'COMPLETED',period:'CURRENT'}).length,1);assert.equal(selectChallenges(rows,{today:'2028-02-04',period:'UPCOMING'})[0].id,3);
 assert.equal(challengePeriod({...row,endDate:'bad'},'2028-02-04'),'UNKNOWN');
});
test('search combines accent-insensitive terms with habit filters and stable sorting without mutating sources',()=>{
 const rows=[{...row,id:2,name:'Z'},row];assert.deepEqual(selectChallenges(rows,{today:'2028-02-04',query:'doc deu',habit:'4',sort:'start'}).map(value=>value.id),[1,2]);assert.equal(rows[0].id,2);
 assert.equal(selectChallenges(rows,{today:'2028-02-04',query:'no match'}).length,0);assert.equal(selectChallenges(rows,{today:'2028-02-04',habit:'5'}).length,0);
});
test('filtered challenge export excludes private fields and neutralizes spreadsheet formulas',()=>{
 const result=challengeListExport([{...row,name:'=HYPERLINK("x")'}],'2028-02-04');assert.ok(result.content.includes("'=HYPERLINK"));assert.ok(!result.content.includes('PRIVATE'));assert.ok(!result.content.includes(row.description));assert.equal(result.content.split('\r\n').length,3);assert.equal(result.filename,'selfforge-challenges-2028-02-04.csv');
 assert.throws(()=>challengeListExport([row,row],'2028-02-04'));assert.throws(()=>challengeListExport([{...row,endDate:'bad'}],'2028-02-04'));
});
