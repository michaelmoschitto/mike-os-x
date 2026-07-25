const SHA_256_HEX_PATTERN = /^[a-f0-9]{64}$/;

export const getPortfolioPasswordHash = (): string => {
  return (import.meta.env.VITE_PORTFOLIO_PASSWORD_HASH ?? '').trim().toLowerCase();
};

export const isPortfolioPasswordConfigured = (passwordHash = getPortfolioPasswordHash()): boolean => {
  return SHA_256_HEX_PATTERN.test(passwordHash);
};

export const hashPortfolioPassword = async (password: string): Promise<string> => {
  const passwordBytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', passwordBytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const verifyPortfolioPassword = async (
  password: string,
  passwordHash = getPortfolioPasswordHash()
): Promise<boolean> => {
  if (!isPortfolioPasswordConfigured(passwordHash)) return false;
  return (await hashPortfolioPassword(password)) === passwordHash;
};
