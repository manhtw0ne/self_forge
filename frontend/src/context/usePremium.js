import { useContext } from 'react';
import { PremiumContext } from './premium-context';

export function usePremium() {
  return useContext(PremiumContext);
}
