const PREMIUM_TIERS = new Set(['FREE', 'PREMIUM', 'LIFETIME']);

function readLimit(value, name, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`Invalid premium limit: ${name}`);
  }
  return value;
}

function readExpiry(value, required) {
  if (value === null && !required) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error('Invalid premium expiry');
  }
  return value;
}

/**
 * Accept only the entitlement contract returned by GET /premium/status.
 * The browser deliberately does not decide whether an expiry is still active:
 * that decision belongs to the server that issued the entitlement.
 */
export function readPremiumStatus(value) {
  const tier = value?.premiumTier;
  if (!PREMIUM_TIERS.has(tier) || typeof value?.isPremium !== 'boolean') {
    throw new Error('Invalid premium status');
  }

  let premiumExpiresAt;
  if (tier === 'FREE') {
    if (value.isPremium || value.premiumExpiresAt !== null) throw new Error('Invalid free premium status');
    premiumExpiresAt = null;
  } else if (tier === 'PREMIUM') {
    premiumExpiresAt = readExpiry(value.premiumExpiresAt, true);
  } else {
    if (!value.isPremium) throw new Error('Invalid lifetime premium status');
    premiumExpiresAt = readExpiry(value.premiumExpiresAt, false);
  }

  const limits = value?.limits;
  if (!limits || typeof limits !== 'object') throw new Error('Invalid premium limits');

  return {
    isPremium: value.isPremium,
    premiumTier: tier,
    premiumExpiresAt,
    limits: {
      maxHabits: readLimit(limits.maxHabits, 'maxHabits', -1),
      currentHabits: readLimit(limits.currentHabits, 'currentHabits', 0),
      maxGoals: readLimit(limits.maxGoals, 'maxGoals', -1),
      currentGoals: readLimit(limits.currentGoals, 'currentGoals', 0),
      journalDays: readLimit(limits.journalDays, 'journalDays', -1),
      moodDays: readLimit(limits.moodDays, 'moodDays', -1),
      freezePerMonth: readLimit(limits.freezePerMonth, 'freezePerMonth', 0),
    },
  };
}

/** Prevent a slow request for an earlier account or token from changing this account's UI. */
export function matchesPremiumSession(currentOwner, currentToken, requestOwner, requestToken) {
  return Number.isSafeInteger(currentOwner)
    && currentOwner > 0
    && currentOwner === requestOwner
    && typeof currentToken === 'string'
    && currentToken.length > 0
    && currentToken === requestToken;
}
