import { createContext, useContext } from 'react';
import { useAuth } from './useAuth';

const PremiumContext = createContext({
  isPremium: false,
  premiumTier: 'FREE',
  premiumExpiresAt: null,
});

export function PremiumProvider({ children }) {
  const { user } = useAuth();

  const value = {
    isPremium: user?.isPremium || false,
    premiumTier: user?.premiumTier || 'FREE',
    premiumExpiresAt: user?.premiumExpiresAt || null,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
