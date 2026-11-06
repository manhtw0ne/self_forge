import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPasswordConfirmationMismatch } from './passwordConfirmation.js';

test('password confirmation becomes invalid only after a different confirmation is entered', () => {
  assert.equal(hasPasswordConfirmationMismatch('', ''), false);
  assert.equal(hasPasswordConfirmationMismatch('correct horse battery staple', ''), false);
  assert.equal(hasPasswordConfirmationMismatch('correct horse battery staple', 'correct horse battery staple'), false);
  assert.equal(hasPasswordConfirmationMismatch('correct horse battery staple', 'different passphrase'), true);
  assert.equal(hasPasswordConfirmationMismatch('', 'a'), true);
});
