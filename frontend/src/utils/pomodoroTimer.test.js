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

test('custom focus durations restore elapsed time and reject mismatched limits',()=>{
 const storage=memory();writeTimer(storage,1,{...timer,focusMinutes:60,secondsLeft:3600,deadline:3601000});
 assert.equal(readTimer(storage,1,601000).secondsLeft,3000);assert.equal(readTimer(storage,1,601000).focusMinutes,60);
 for(const focusMinutes of [24,121,25.5]){writeTimer(storage,1,{...timer,focusMinutes});assert.throws(()=>readTimer(storage,1));}
 writeTimer(storage,1,{...timer,focusMinutes:45,secondsLeft:2701});assert.throws(()=>readTimer(storage,1));
});

test('custom breaks restore their own deadlines without becoming focus sessions',()=>{
 const storage=memory();const rest={mode:1,secondsLeft:1200,shortMinutes:20,longMinutes:30,running:true,deadline:1201000,sessionId:null,selectedHabit:'7',focusMinutes:45};
 writeTimer(storage,1,rest);const restored=readTimer(storage,1,601000);assert.equal(restored.secondsLeft,600);assert.equal(restored.shortMinutes,20);assert.equal(restored.longMinutes,30);assert.equal(restored.sessionId,null);
 assert.equal(readTimer(storage,1,9999000).running,false);assert.equal(readTimer(storage,1,9999000).secondsLeft,0);
 writeTimer(storage,1,{...rest,mode:2,secondsLeft:1800,running:false,deadline:null});assert.equal(readTimer(storage,1,9999000).secondsLeft,1800);
 writeTimer(storage,1,{...rest,sessionId:2});assert.throws(()=>readTimer(storage,1));
});
test('legacy timers keep default breaks and invalid break snapshots are rejected',()=>{
 const storage=memory();writeTimer(storage,1,timer);assert.equal(readTimer(storage,1).shortMinutes,5);assert.equal(readTimer(storage,1).longMinutes,15);
 for(const change of [{shortMinutes:0},{shortMinutes:31},{longMinutes:4},{longMinutes:61},{shortMinutes:1.5},{longMinutes:'30'}]){writeTimer(storage,1,{...timer,...change});assert.throws(()=>readTimer(storage,1));}
 writeTimer(storage,1,{...timer,mode:1,sessionId:null,shortMinutes:10,secondsLeft:601});assert.throws(()=>readTimer(storage,1));
});
