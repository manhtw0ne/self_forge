import test from 'node:test';
import assert from 'node:assert/strict';
import { readOAuthLinkAuthorization } from './oauthLink.js';

test('OAuth link navigation accepts only a bounded HTTPS authorization URI', () => {
  assert.equal(readOAuthLinkAuthorization({ authorizationUrl: 'https://accounts.example/authorize?state=abc' }),
    'https://accounts.example/authorize?state=abc');
  for (const value of [
    null,
    {},
    { authorizationUrl: '/api/auth/oauth/google/start' },
    { authorizationUrl: 'http://accounts.example/authorize' },
    { authorizationUrl: 'https://user:secret@accounts.example/authorize' },
    { authorizationUrl: 'not a url' },
    { authorizationUrl: `https://accounts.example/${'a'.repeat(4097)}` },
  ]) assert.equal(readOAuthLinkAuthorization(value), null);
});
