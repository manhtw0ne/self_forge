import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTimer, writeTimer } from './pomodoroTimer.js';
const memory = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; };
const timer = { mode: 0, secondsLeft: 1500, running: true, deadline: 1501000, sessionId: 42, selectedHabit: '7' };
test('running timer restores deadline and session without restarting its duration', () => {
  const storage = memory(); writeTimer(storage, 1, timer);
  const restored = readTimer(storage, 1, 601000);
  assert.equal(restored.secondsLeft, 900); assert.equal(restored.sessionId, 42); assert.equal(restored.running, true);
  assert.equal(readTimer(storage, 2), null);
});
test('paused timer excludes time away and completed timer waits for explicit retry', () => {
  const storage = memory(); writeTimer(storage, 1, { ...timer, running: false, secondsLeft: 800 });
  assert.equal(readTimer(storage, 1, 9000000).secondsLeft, 800);
  writeTimer(storage, 1, timer);
  const expired = readTimer(storage, 1, 9000000);
  assert.equal(expired.secondsLeft, 0); assert.equal(expired.running, false); assert.equal(expired.sessionId, 42);
});
test('storage corruption, unavailable storage and invalid sessions are surfaced', () => {
  const storage = memory();
  storage.setItem('sf_pomodoro_v1:1', '{'); assert.throws(() => readTimer(storage, 1));
  writeTimer(storage, 1, { ...timer, sessionId: null }); assert.throws(() => readTimer(storage, 1));
  assert.throws(() => readTimer({ getItem() { throw new Error('blocked'); } }, 1));
  assert.throws(() => writeTimer({ setItem() { throw new Error('full'); } }, 1, timer));
});
