import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLatestRequest } from './latestRequest.js';
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
test('independent progress requests survive another item being deleted or retried', async () => {
  const first = createLatestRequest(), second = createLatestRequest();
  const old = deferred(), retry = deferred(), other = deferred(), events = [];
  const run = (gate, item) => gate.run(() => item.promise, value => events.push(value),
    () => events.push('error'), () => {});
  const tasks = [run(first, old), run(second, other), run(first, retry)];
  first.invalidate();
  old.reject(new Error('late failure'));
  retry.resolve('deleted item');
  other.resolve('remaining item');
  await Promise.all(tasks);
  assert.deepEqual(events, ['remaining item']);
});
test('older journal response cannot overwrite a newly selected day', async () => {
  const gate = createLatestRequest(), old = deferred(), fresh = deferred(), events = [];
  const run = item => gate.run(() => item.promise, x => events.push(x), () => events.push('error'), () => events.push('done'));
  const a=run(old), b=run(fresh);
  fresh.resolve('new day'); await b;
  old.resolve('old day'); await a;
  assert.deepEqual(events, ['new day','done']);
});
test('stale failures and callbacks after navigation are ignored', async () => {
  const gate=createLatestRequest(), old=deferred(), events=[];
  const task=gate.run(() => old.promise, () => events.push('success'), () => events.push('error'), () => events.push('done'));
  gate.invalidate(); old.reject(Error('network')); await task;
  assert.deepEqual(events, []);
});
test('current failures reach error handling and release loading', async () => {
  const gate=createLatestRequest(), events=[];
  await gate.run(async () => { throw { response: { status: 503 } }; }, () => events.push('success'), e => events.push(e.response.status), () => events.push('done'));
  assert.deepEqual(events,[503,'done']);
});
