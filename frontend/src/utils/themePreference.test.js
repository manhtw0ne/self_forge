import test from 'node:test';
import assert from 'node:assert/strict';
import { readTheme, saveTheme } from './themePreference.js';
test('blocked storage access and failed reads fall back without breaking startup', () => {
  assert.equal(readTheme(() => { throw new Error('SecurityError'); }), 'dark');
  assert.equal(readTheme(() => ({ getItem() { throw new Error('blocked'); } })), 'dark');
  for (const value of [null, '', 'corrupt', 'dark']) assert.equal(readTheme(() => ({ getItem: () => value })), 'dark');
  assert.equal(readTheme(() => ({ getItem: () => 'light' })), 'light');
});
test('theme persistence failure is optional and valid writes retain the preference', () => {
  assert.equal(saveTheme(() => { throw new Error('blocked'); }, 'light'), false);
  assert.equal(saveTheme(() => ({ setItem() { throw new Error('quota'); } }), 'light'), false);
  const values = new Map();
  const storage = { setItem: (k, v) => values.set(k, v), getItem: k => values.get(k) };
  assert.equal(saveTheme(() => storage, 'light'), true);
  assert.equal(readTheme(() => storage), 'light');
});
