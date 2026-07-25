import { create } from 'zustand';

import {
  getPortfolioPasswordHash,
  isPortfolioPasswordConfigured,
  verifyPortfolioPassword,
} from '@/lib/portfolioPassword';

export const PORTFOLIO_SESSION_KEY = 'selected-work-unlocked-v1';

export type PortfolioAccessStatus = 'locked' | 'checking' | 'unlocked' | 'misconfigured';

interface PortfolioAccessStore {
  status: PortfolioAccessStatus;
  initialize: () => void;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
}

const getSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
};

export const usePortfolioAccessStore = create<PortfolioAccessStore>((set) => ({
  status: 'locked',

  initialize: () => {
    if (!isPortfolioPasswordConfigured()) {
      set({ status: 'misconfigured' });
      return;
    }

    const isUnlocked = getSessionStorage()?.getItem(PORTFOLIO_SESSION_KEY) === 'true';
    set({ status: isUnlocked ? 'unlocked' : 'locked' });
  },

  unlock: async (password) => {
    const configuredHash = getPortfolioPasswordHash();
    if (!isPortfolioPasswordConfigured(configuredHash)) {
      set({ status: 'misconfigured' });
      return false;
    }

    set({ status: 'checking' });
    const isValid = await verifyPortfolioPassword(password, configuredHash);

    if (!isValid) {
      set({ status: 'locked' });
      return false;
    }

    getSessionStorage()?.setItem(PORTFOLIO_SESSION_KEY, 'true');
    set({ status: 'unlocked' });
    return true;
  },

  lock: () => {
    getSessionStorage()?.removeItem(PORTFOLIO_SESSION_KEY);
    set({ status: 'locked' });
  },
}));
