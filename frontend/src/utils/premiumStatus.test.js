import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesPremiumSession, readPremiumStatus } from './premiumStatus.js';

const limits = {
  maxHabits: 10,
  currentHabits: 2,
  maxGoals: 3,
  currentGoals: 1,
  journalDays: -1,
  moodDays: -1,
  freezePerMonth: 1,
};

test('readPremiumStatus keeps only a valid free entitlement contract', () => {
  assert.deepEqual(readPremiumStatus({ premiumTier: 'FREE', isPremium: false, premiumExpiresAt: null, limits, ignored: 'value' }), {
    isPremium: false,
    premiumTier: 'FREE',
    premiumExpiresAt: null,
    limits,
  });
});

test('readPremiumStatus accepts server-decided active and expired premium plans', () => {
  const expiry = '2030-02-03T04:05:06Z';
  assert.equal(readPremiumStatus({ premiumTier: 'PREMIUM', isPremium: true, premiumExpiresAt: expiry, limits }).isPremium, true);
  assert.equal(readPremiumStatus({ premiumTier: 'PREMIUM', isPremium: false, premiumExpiresAt: expiry, limits }).premiumTier, 'PREMIUM');
  assert.equal(readPremiumStatus({ premiumTier: 'LIFETIME', isPremium: true, premiumExpiresAt: null, limits }).premiumTier, 'LIFETIME');
});

test('readPremiumStatus fails closed for malformed or contradictory entitlement payloads', () => {
  const invalid = [
    { premiumTier: 'FREE', isPremium: true, premiumExpiresAt: null, limits },
    { premiumTier: 'PREMIUM', isPremium: true, premiumExpiresAt: null, limits },
    { premiumTier: 'LIFETIME', isPremium: false, premiumExpiresAt: null, limits },
    { premiumTier: 'UNKNOWN', isPremium: true, premiumExpiresAt: null, limits },
    { premiumTier: 'FREE', isPremium: false, premiumExpiresAt: null, limits: { ...limits, maxHabits: 2.5 } },
  ];
  invalid.forEach(value => assert.throws(() => readPremiumStatus(value)));
});

test('matchesPremiumSession rejects stale cross-account or cross-token premium responses', () => {
  assert.equal(matchesPremiumSession(7, 'token-a', 7, 'token-a'), true);
  assert.equal(matchesPremiumSession(7, 'token-b', 7, 'token-a'), false);
  assert.equal(matchesPremiumSession(8, 'token-a', 7, 'token-a'), false);
  assert.equal(matchesPremiumSession(7, '', 7, ''), false);
});
