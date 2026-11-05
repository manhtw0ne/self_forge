import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyFocusAccountDraft,dailyFocusAccountPayload,readDailyFocusAccount} from './dailyFocusAccount.js';

const habits=[{habitId:1,name:'Read',scheduledToday:true,todayStatus:null},{habitId:2,name:'Walk',scheduledToday:true,todayStatus:'FAILED'}];
const saved={date:'2026-10-28',budget:60,energy:'MEDIUM',habitIds:[2,1],version:3};

test('account daily focus plan is current-date bounded and preserves priority',()=>{
 assert.equal(readDailyFocusAccount('', '2026-10-28'),null);
 assert.deepEqual(readDailyFocusAccount(saved,'2026-10-28'),saved);
 assert.deepEqual(dailyFocusAccountDraft(saved,'2026-10-28'),{version:1,date:'2026-10-28',budget:60,energy:'MEDIUM',ids:[2,1]});
 assert.equal(dailyFocusAccountDraft('','2026-10-28'),null);
 assert.deepEqual(dailyFocusAccountPayload('60','MEDIUM',[2,1],habits,3),{budget:60,energy:'MEDIUM',habitIds:[2,1],expectedVersion:3});
 assert.throws(()=>readDailyFocusAccount({...saved,date:'2026-10-27'},'2026-10-28'));
 assert.throws(()=>dailyFocusAccountPayload('60','MEDIUM',[1,1],habits,0));
});
