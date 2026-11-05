import test from 'node:test';
import assert from 'node:assert/strict';
import { readNativeOAuthStart } from './nativeOAuth.js';

const handoff = 'a'.repeat(43);

test('native OAuth only accepts an HTTPS provider URL and an exact handoff secret', () => {
  assert.deepEqual(readNativeOAuthStart({ authorizationUrl: 'https://accounts.example/authorize?state=abc', handoff }),
    { authorizationUrl: 'https://accounts.example/authorize?state=abc', handoff });
  for (const value of [
    null,
    {},
    { authorizationUrl: 'http://accounts.example/authorize', handoff },
    { authorizationUrl: 'https://user:pass@accounts.example/authorize', handoff },
    { authorizationUrl: 'https://accounts.example/authorize#ticket', handoff },
    { authorizationUrl: 'https://accounts.example/authorize', handoff: 'short' },
  ]) assert.equal(readNativeOAuthStart(value), null);
});
