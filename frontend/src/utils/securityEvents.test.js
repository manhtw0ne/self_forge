import test from 'node:test';
import assert from 'node:assert/strict';
import { readSecurityEventPage } from './securityEvents.js';

test('security event pages accept only the non-sensitive event contract', () => {
  const page = readSecurityEventPage({ items: [
    { id: 3, type: 'EMAIL_CHANGED', occurredAt: '2026-10-28T12:00:00Z' },
    { id: 4, type: 'EMAIL_CHANGE_RECOVERED', occurredAt: '2026-10-28T12:30:00Z' },
    { id: 5, type: 'EMAIL_VERIFIED', occurredAt: '2026-10-28T13:00:00Z' },
    { id: 2, type: 'SIGNED_IN', occurredAt: '2026-10-28T11:00:00Z' },
  ], nextCursor: 1 });
  assert.equal(page.items.length, 4);
  assert.equal(page.nextCursor, 1);
});

test('security event pages reject private or malformed values', () => {
  for (const event of [
    { id: 0, type: 'SIGNED_IN', occurredAt: '2026-10-28T12:00:00Z' },
    { id: 1, type: 'UNKNOWN', occurredAt: '2026-10-28T12:00:00Z' },
    { id: 1, type: 'SIGNED_IN', occurredAt: 'not-a-date' },
    { id: 1, type: 'SIGNED_IN', occurredAt: '2026-10-28T12:00:00Z', email: 'private@example.com' },
  ]) {
    if (event.email) {
      const page = readSecurityEventPage({ items: [event], nextCursor: null });
      assert.equal(page.items[0].email, undefined);
    } else assert.throws(() => readSecurityEventPage({ items: [event], nextCursor: null }));
  }
  assert.throws(() => readSecurityEventPage({ items: [{ id: 2, type: 'SIGNED_IN', occurredAt: '2026-10-28T12:00:00Z' }], nextCursor: 2 }));
});
