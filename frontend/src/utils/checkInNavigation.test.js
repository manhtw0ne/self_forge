import {test} from 'node:test';import assert from 'node:assert/strict';import {checkInEntryPath,readCheckInTarget,selectedCheckIn} from './checkInNavigation.js';
const today='2026-10-16';
test('check-in record links contain only date and identity and can be restored after reload',()=>{
 const path=checkInEntryPath('2026-10-12',25);assert.equal(path,'/check-in-history?date=2026-10-12&entry=25');assert.deepEqual(readCheckInTarget(path.split('?')[1],today),{date:'2026-10-12',entryId:25,invalid:false});assert.deepEqual(readCheckInTarget('',today),{date:today,entryId:null,invalid:false});
 assert.deepEqual(readCheckInTarget('?date=2026-10-12',today),{date:'2026-10-12',entryId:null,invalid:false});assert.throws(()=>checkInEntryPath('2026-02-30',1));assert.throws(()=>checkInEntryPath(today,0));
});
test('ambiguous, future or unsafe record links fail closed',()=>{
 for(const query of ['?entry=1','?date=2026-10-17','?date=2026-02-30','?date=0000-01-01','?date=2026-10-12&date=2026-10-13','?date=2026-10-12&entry=1&entry=2','?date=2026-10-12&entry=0','?date=2026-10-12&entry=01','?date=2026-10-12&entry=1x','?date=2026-10-12&entry=9007199254740993'])assert.equal(readCheckInTarget(query,today).invalid,true);
});
test('record selection uses newly loaded owned entries and requires the exact ID/date pair',()=>{
 const target=readCheckInTarget('?date=2026-10-12&entry=25',today),entry={id:25,date:'2026-10-12',note:'Fresh note',status:'SKIPPED'};
 assert.equal(selectedCheckIn([entry],target),entry);assert.equal(selectedCheckIn([{...entry,id:24}],target),null);assert.equal(selectedCheckIn([{...entry,date:today}],target),null);assert.equal(selectedCheckIn([],target),null);assert.equal(selectedCheckIn([entry,entry],target),null);assert.equal(selectedCheckIn([entry],{...target,invalid:true}),null);
});
