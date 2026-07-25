import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

const passwordMocks = vi.hoisted(() => ({
  getPortfolioPasswordHash: vi.fn(() => 'a'.repeat(64)),
  isPortfolioPasswordConfigured: vi.fn(() => true),
  verifyPortfolioPassword: vi.fn(async () => true),
}));

vi.mock('@/lib/portfolioPassword', () => passwordMocks);

import { PORTFOLIO_SESSION_KEY, usePortfolioAccessStore } from '@/stores/usePortfolioAccessStore';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const sessionStorage = new MemoryStorage();

describe('usePortfolioAccessStore', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'window', {
      value: { sessionStorage },
      configurable: true,
    });
  });

  beforeEach(() => {
    sessionStorage.clear();
    passwordMocks.getPortfolioPasswordHash.mockReturnValue('a'.repeat(64));
    passwordMocks.isPortfolioPasswordConfigured.mockReturnValue(true);
    passwordMocks.verifyPortfolioPassword.mockResolvedValue(true);
    usePortfolioAccessStore.setState({ status: 'locked' });
  });

  test('restores an unlocked tab session', () => {
    sessionStorage.setItem(PORTFOLIO_SESSION_KEY, 'true');

    usePortfolioAccessStore.getState().initialize();

    expect(usePortfolioAccessStore.getState().status).toBe('unlocked');
  });

  test('reports a missing password configuration', () => {
    passwordMocks.isPortfolioPasswordConfigured.mockReturnValue(false);

    usePortfolioAccessStore.getState().initialize();

    expect(usePortfolioAccessStore.getState().status).toBe('misconfigured');
  });

  test('stores a successful unlock for the current tab', async () => {
    const isUnlocked = await usePortfolioAccessStore.getState().unlock('correct-password');

    expect(isUnlocked).toBe(true);
    expect(usePortfolioAccessStore.getState().status).toBe('unlocked');
    expect(sessionStorage.getItem(PORTFOLIO_SESSION_KEY)).toBe('true');
  });

  test('keeps the portfolio locked after a failed attempt', async () => {
    passwordMocks.verifyPortfolioPassword.mockResolvedValue(false);

    const isUnlocked = await usePortfolioAccessStore.getState().unlock('wrong-password');

    expect(isUnlocked).toBe(false);
    expect(usePortfolioAccessStore.getState().status).toBe('locked');
    expect(sessionStorage.getItem(PORTFOLIO_SESSION_KEY)).toBeNull();
  });

  test('clears the current tab session when locked', () => {
    sessionStorage.setItem(PORTFOLIO_SESSION_KEY, 'true');
    usePortfolioAccessStore.setState({ status: 'unlocked' });

    usePortfolioAccessStore.getState().lock();

    expect(usePortfolioAccessStore.getState().status).toBe('locked');
    expect(sessionStorage.getItem(PORTFOLIO_SESSION_KEY)).toBeNull();
  });
});
