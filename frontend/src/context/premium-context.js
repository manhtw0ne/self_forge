import { createContext } from 'react';

export const PremiumContext = createContext({
  isPremium: false,
  premiumTier: 'FREE',
  premiumExpiresAt: null,
  limits: null,
  loading: false,
  error: false,
  refreshPremium: async () => null,
});
