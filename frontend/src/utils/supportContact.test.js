import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredSupportEmail, supportMailto } from './supportContact.js';

test('support contact accepts one well-formed configured email and rejects unsafe values', () => {
  assert.equal(configuredSupportEmail(' support@selfforge.example '), 'support@selfforge.example');
  for (const value of [null, '', 'support', 'a@b', 'a@b\nBcc:x@example.com', 'x'.repeat(255) + '@a.co']) {
    assert.equal(configuredSupportEmail(value), null);
  }
});

test('mailto composer encodes user-approved content and never leaves header line breaks raw', () => {
  const link = supportMailto('support@selfforge.example', 'Problem\r\nBcc: bad@example.com', 'Line one\nLine two');
  assert.ok(link.startsWith('mailto:support%40selfforge.example?subject=Problem%20%20Bcc%3A%20bad%40example.com&body='));
  assert.ok(link.includes('Line%20one%0ALine%20two'));
  assert.ok(!link.includes('\r'));
  assert.equal(supportMailto('not-an-email', 'Subject', 'Body'), null);
  assert.equal(supportMailto('support@selfforge.example', '', 'Body'), null);
});
