import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnPath } from './returnPath.js';
test('sign-in returns to supported page, selected date and anchor', () => {
  assert.equal(safeReturnPath('/check-in-history?date=2026-10-10'), '/check-in-history?date=2026-10-10');
  assert.equal(safeReturnPath('/#today-habits'), '/#today-habits');
  assert.equal(safeReturnPath('/profile'), '/profile');
  assert.equal(safeReturnPath('/companion#progress'), '/companion#progress');
});
test('sign-in return cannot navigate to another origin, API, login loop or unknown page', () => {
  for (const path of [null, '', 'https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '/api/profile/data', '/login', '/unknown', '/' + 'a'.repeat(2048)])
    assert.equal(safeReturnPath(path), '/');
});
