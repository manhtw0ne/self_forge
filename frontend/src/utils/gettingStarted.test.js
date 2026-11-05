import test from 'node:test';
import assert from 'node:assert/strict';
import { guideHidden, hideGuide, gettingStartedProgress } from './gettingStarted.js';
import { clearAccountDrafts } from './accountDraftCleanup.js';
test('guide preference is account-scoped and cleared with the deleted account', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), get length() { return data.size; }, key: index => [...data.keys()][index], removeItem: key => data.delete(key) };
  assert.equal(guideHidden(storage, 1), false);
  hideGuide(storage, 1); hideGuide(storage, 10);
  assert.equal(guideHidden(storage, 1), true);
  clearAccountDrafts(storage, 1);
  assert.equal(guideHidden(storage, 1), false);
  assert.equal(guideHidden(storage, 10), true);
});
test('invalid owners, corrupt preferences and blocked storage never masquerade as a saved preference', () => {
  assert.throws(() => guideHidden({ getItem: () => null }, '1:10'));
  assert.throws(() => guideHidden({ getItem: () => 'bad' }, 1));
  assert.throws(() => hideGuide({ setItem: () => { throw Error('blocked'); } }, 1));
  assert.throws(() => guideHidden({ getItem: () => { throw Error('blocked'); } }, 1));
});

test('starting guide chooses the next unmet core step from saved account evidence',()=>{const data={observedThrough:'2026-10-16',timezone:'Asia/Ho_Chi_Minh',activeHabit:true,completedCheckIn:false,journalEntry:true};const value=gettingStartedProgress(data,'2026-10-16','Asia/Ho_Chi_Minh');assert.equal(value.completed,1);assert.equal(value.steps.length,2);assert.equal(value.next.id,'checkin');assert.equal(value.next.path,'/#today-habits');assert.equal(gettingStartedProgress({...data,completedCheckIn:true},data.observedThrough,data.timezone).next,null);assert.equal(gettingStartedProgress({...data,activeHabit:false},data.observedThrough,data.timezone).next.id,'habit');});
test('starting guide rejects stale or mismatched account scope but journal status stays optional',()=>{const data={observedThrough:'2026-10-16',timezone:'UTC',activeHabit:false,completedCheckIn:false,journalEntry:false};assert.throws(()=>gettingStartedProgress(data,'2026-10-15','UTC'));assert.throws(()=>gettingStartedProgress(data,'2026-10-16','Asia/Ho_Chi_Minh'));assert.equal(gettingStartedProgress({...data,journalEntry:null},data.observedThrough,'UTC').completed,0);assert.throws(()=>gettingStartedProgress(null,data.observedThrough,'UTC'));});
