import { normalizeName } from './name-normalizer';

describe('normalizeName', () => {
  it('collapses Chevron variants to the same key', () => {
    const key = normalizeName('Chevron Corp.');
    expect(normalizeName('Chevron Corporation')).toBe(key);
    expect(normalizeName('CHEVRON')).toBe(key);
    expect(key).toBe('chevron');
  });

  it('handles common US legal suffixes', () => {
    expect(normalizeName('Stripe, Inc.')).toBe('stripe');
    expect(normalizeName('Apple Inc.')).toBe('apple');
    expect(normalizeName('Berkshire Hathaway Inc.')).toBe('berkshire hathaway');
    expect(normalizeName('Wells Fargo & Co')).toBe('wells fargo');
  });

  it('keeps Apple Records distinct from Apple Inc.', () => {
    expect(normalizeName('Apple Inc.')).toBe('apple');
    expect(normalizeName('Apple Records')).toBe('apple records');
  });

  it('preserves & in tickers like AT&T', () => {
    expect(normalizeName('AT&T')).toBe('at&t');
  });

  it('strips international suffixes', () => {
    expect(normalizeName('Bayer AG')).toBe('bayer');
    expect(normalizeName('3M Company')).toBe('3m');
  });

  it('is idempotent', () => {
    const inputs = ['Chevron Corp.', 'Stripe, Inc.', 'Bayer AG', 'AT&T'];
    for (const s of inputs) {
      expect(normalizeName(normalizeName(s))).toBe(normalizeName(s));
    }
  });
});
