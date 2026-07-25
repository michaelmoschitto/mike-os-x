import { describe, expect, test } from 'vitest';

import {
  hashPortfolioPassword,
  isPortfolioPasswordConfigured,
  verifyPortfolioPassword,
} from '@/lib/portfolioPassword';

const TEST_PASSWORD = 'abc';
const TEST_PASSWORD_HASH = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('portfolioPassword', () => {
  test('hashes passwords with SHA-256', async () => {
    expect(await hashPortfolioPassword(TEST_PASSWORD)).toBe(TEST_PASSWORD_HASH);
  });

  test('validates configured password hashes', () => {
    expect(isPortfolioPasswordConfigured(TEST_PASSWORD_HASH)).toBe(true);
    expect(isPortfolioPasswordConfigured('')).toBe(false);
    expect(isPortfolioPasswordConfigured('not-a-sha-256-digest')).toBe(false);
  });

  test('accepts the matching password', async () => {
    expect(await verifyPortfolioPassword(TEST_PASSWORD, TEST_PASSWORD_HASH)).toBe(true);
  });

  test('rejects an incorrect password', async () => {
    expect(await verifyPortfolioPassword('incorrect', TEST_PASSWORD_HASH)).toBe(false);
  });
});
