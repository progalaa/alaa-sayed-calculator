import { describe, expect, it } from 'vitest';
import { formatCents } from './format';

describe('formatCents', () => {
  it('S-2.1 shows two decimals and comma thousands separators', () => {
    expect(formatCents(1078954)).toBe('10,789.54');
    expect(formatCents(78954)).toBe('789.54');
  });
  it('S-2.2 shows zero as 0.00', () => {
    expect(formatCents(0)).toBe('0.00');
  });
  it('S-2.3 shows small amounts with a leading zero and two decimals', () => {
    expect(formatCents(4)).toBe('0.04');
    expect(formatCents(274)).toBe('2.74');
  });
  it('S-2.4 shows very large amounts with every thousands separator', () => {
    expect(formatCents(12000459205)).toBe('120,004,592.05');
    expect(formatCents(100000000000)).toBe('1,000,000,000.00');
  });
});
