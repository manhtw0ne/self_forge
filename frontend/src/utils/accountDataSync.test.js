import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCOUNT_DATA_EVENT_KEY,accountDataChange,publishAccountDataChange,readAccountDataChange,subscribeAccountDataChanges} from './accountDataSync.js';

test('account change events are allowlisted, content-free and fail closed', () => {
  assert.deepEqual(accountDataChange(7, 'habits'), {version: 1, owner: 7, resource: 'habits'});
  assert.deepEqual(accountDataChange(7, 'dashboard'), {version: 1, owner: 7, resource: 'dashboard'});
  assert.deepEqual(accountDataChange(7, 'companion'), {version: 1, owner: 7, resource: 'companion'});
  assert.deepEqual(accountDataChange(7, 'goals'), {version: 1, owner: 7, resource: 'goals'});
  assert.deepEqual(accountDataChange(7, 'journal'), {version: 1, owner: 7, resource: 'journal'});
  assert.deepEqual(accountDataChange(7, 'reminders'), {version: 1, owner: 7, resource: 'reminders'});
  assert.deepEqual(accountDataChange(7, 'challenges'), {version: 1, owner: 7, resource: 'challenges'});
  assert.deepEqual(accountDataChange(7, 'rewards'), {version: 1, owner: 7, resource: 'rewards'});
  for (const value of [null, '', '{}', '{bad', JSON.stringify({version: 2, owner: 7, resource: 'habits'}), JSON.stringify({version: 1, owner: 7, resource: 'profile'}), JSON.stringify({version: 1, owner: 0, resource: 'habits'})]) {
    assert.equal(readAccountDataChange(value), null);
  }
  assert.throws(() => accountDataChange(7.1, 'habits'));
  assert.throws(() => accountDataChange(7, 'profile'));
});

test('publishing is best effort and subscriptions stay scoped to their exact account', () => {
  const writes = [], storage = {setItem: (...args) => writes.push(['set', ...args]), removeItem: key => writes.push(['remove', key])};
  assert.equal(publishAccountDataChange(7, 'habits', storage), true);
  assert.deepEqual(writes, [['set', ACCOUNT_DATA_EVENT_KEY, JSON.stringify({version: 1, owner: 7, resource: 'habits'})], ['remove', ACCOUNT_DATA_EVENT_KEY]]);
  assert.equal(publishAccountDataChange(7, 'habits', {setItem: () => { throw new Error('blocked'); }, removeItem: () => {}}), false);

  const target = new EventTarget(), received = [];
  const stop = subscribeAccountDataChanges(target, 7, change => received.push(change));
  const emit = value => target.dispatchEvent(Object.assign(new Event('storage'), {key: ACCOUNT_DATA_EVENT_KEY, newValue: value}));
  emit(JSON.stringify({version: 1, owner: 8, resource: 'habits'}));
  emit(JSON.stringify({version: 1, owner: 7, resource: 'profile'}));
  emit(JSON.stringify({version: 1, owner: 7, resource: 'habits'}));
  assert.deepEqual(received, [{version: 1, owner: 7, resource: 'habits'}]);
  stop();
  emit(JSON.stringify({version: 1, owner: 7, resource: 'habits'}));
  assert.equal(received.length, 1);
});
