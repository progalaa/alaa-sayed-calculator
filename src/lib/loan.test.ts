import { describe, expect, it } from 'vitest';
import { calculateLoan, compareExtraPayment, type LoanResult } from './loan';

// Amounts are in cents, rates in thousandths of a percent (5% -> 5000).
const loan = (amount: number, rate: number, term: number) =>
  calculateLoan({ amountCents: amount * 100, rateThousandths: rate * 1000, termMonths: term });

const sum = (result: LoanResult, key: 'paymentCents' | 'interestCents' | 'principalCents') =>
  result.rows.reduce((total, row) => total + row[key], 0);

const row = (result: LoanResult, month: number) => {
  const r = result.rows[month - 1];
  return [r.month, r.paymentCents, r.interestCents, r.principalCents, r.balanceCents];
};

function expectConsistent(result: LoanResult, amountCents: number) {
  let previous = amountCents;
  for (const r of result.rows) {
    expect(r.paymentCents).toBe(r.interestCents + r.principalCents);
    expect(r.balanceCents).toBe(previous - r.principalCents);
    expect(Number.isInteger(r.paymentCents)).toBe(true);
    expect(Number.isInteger(r.interestCents)).toBe(true);
    previous = r.balanceCents;
  }
  expect(previous).toBe(0);
  expect(sum(result, 'principalCents')).toBe(amountCents);
}

describe('monthly payment', () => {
  it('S-1.1 base loan 10000 at 5% for 36 months pays 299.71', () => {
    expect(loan(10000, 5, 36).monthlyPaymentCents).toBe(29971);
  });
  it('S-1.2 0% loan 12000 for 12 months pays 1,000.00 without dividing by zero', () => {
    expect(loan(12000, 0, 12).monthlyPaymentCents).toBe(100000);
  });
  it('S-1.3 0% loan 1000 for 3 months pays 333.33', () => {
    expect(loan(1000, 0, 3).monthlyPaymentCents).toBe(33333);
  });
  it('S-1.4 smallest amount 100 at 5% for 12 months pays 8.56', () => {
    expect(loan(100, 5, 12).monthlyPaymentCents).toBe(856);
  });
  it('S-1.5 largest amount 10,000,000 at 5% for 360 months pays 53,682.16', () => {
    expect(loan(10000000, 5, 360).monthlyPaymentCents).toBe(5368216);
  });
  it('S-1.6 smallest non-zero rate 0.001% pays 277.78', () => {
    const result = calculateLoan({ amountCents: 1000000, rateThousandths: 1, termMonths: 36 });
    expect(result.monthlyPaymentCents).toBe(27778);
  });
  it('S-1.7 largest rate 30% pays 424.52', () => {
    expect(loan(10000, 30, 36).monthlyPaymentCents).toBe(42452);
  });
  it('S-1.8 shortest term 1 month pays 1,010.00', () => {
    expect(loan(1000, 12, 1).monthlyPaymentCents).toBe(101000);
  });
  it('S-1.9 longest term 480 months pays 964.39', () => {
    expect(loan(200000, 5, 480).monthlyPaymentCents).toBe(96439);
  });
  it('S-1.10 all inputs at maximum pays 250,001.78', () => {
    expect(loan(10000000, 30, 480).monthlyPaymentCents).toBe(25000178);
  });
});

describe('totals', () => {
  it('S-2.1 base loan totals are 789.54 interest and 10,789.54 paid', () => {
    const result = loan(10000, 5, 36);
    expect(result.totalInterestCents).toBe(78954);
    expect(result.totalPaidCents).toBe(1078954);
  });
  it('S-2.2 0% loan has 0.00 interest and 12,000.00 paid', () => {
    const result = loan(12000, 0, 12);
    expect(result.totalInterestCents).toBe(0);
    expect(result.totalPaidCents).toBe(1200000);
  });
  it('S-2.3 very small loan totals are 2.74 and 102.74', () => {
    const result = loan(100, 5, 12);
    expect(result.totalInterestCents).toBe(274);
    expect(result.totalPaidCents).toBe(10274);
  });
  it('S-2.4 very large loan totals are 110,004,592.05 and 120,004,592.05', () => {
    const result = loan(10000000, 30, 480);
    expect(result.totalInterestCents).toBe(11000459205);
    expect(result.totalPaidCents).toBe(12000459205);
  });
  it('S-2.5 totals are the sums of the schedule columns and paid = amount + interest', () => {
    for (const [a, r, n] of [[10000, 5, 36], [10000000, 30, 480], [100, 0, 480], [1000, 0, 3]]) {
      const result = loan(a, r, n);
      expect(result.totalInterestCents).toBe(sum(result, 'interestCents'));
      expect(result.totalPaidCents).toBe(sum(result, 'paymentCents'));
      expect(result.totalPaidCents).toBe(a * 100 + result.totalInterestCents);
    }
  });
});

describe('schedule', () => {
  it('S-5.1 base loan has 36 rows numbered 1 to 36', () => {
    const result = loan(10000, 5, 36);
    expect(result.rows.map((r) => r.month)).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
  });
  it('S-5.2 base loan row 1 is 299.71 | 41.67 | 258.04 | 9,741.96', () => {
    expect(row(loan(10000, 5, 36), 1)).toEqual([1, 29971, 4167, 25804, 974196]);
  });
  it('S-5.3 base loan final row 36 is adjusted to 299.69 | 1.24 | 298.45 | 0.00', () => {
    expect(row(loan(10000, 5, 36), 36)).toEqual([36, 29969, 124, 29845, 0]);
  });
  it('S-5.4 S-5.5 every row adds up and principal sums to the amount', () => {
    const cases = [[10000, 5, 36], [250000, 6.5, 360], [10000000, 30, 480], [100, 0, 480],
      [100, 30, 480], [1000, 0, 3], [1000, 12, 1], [200000, 5, 480], [150000, 6.5, 240]];
    for (const [a, r, n] of cases) expectConsistent(loan(a, r, n), a * 100);
  });
  it('S-5.6 0% loan 1000 over 3 months has rows 333.33, 333.33, 333.34', () => {
    const result = loan(1000, 0, 3);
    expect(result.rows.map((r) => [r.month, r.paymentCents, r.interestCents, r.principalCents, r.balanceCents]))
      .toEqual([[1, 33333, 0, 33333, 66667], [2, 33333, 0, 33333, 33334], [3, 33334, 0, 33334, 0]]);
  });
  it('S-5.7 longest term has 480 rows and row 480 is 969.69 | 4.02 | 965.67 | 0.00', () => {
    const result = loan(200000, 5, 480);
    expect(result.rows).toHaveLength(480);
    expect(row(result, 480)).toEqual([480, 96969, 402, 96567, 0]);
  });
  it('S-5.8 rounding clears 100 at 0% over 480 months in 477 rows', () => {
    const result = loan(100, 0, 480);
    expect(result.monthlyPaymentCents).toBe(21);
    expect(result.rows).toHaveLength(477);
    expect(row(result, 477)).toEqual([477, 4, 0, 4, 0]);
  });
  it('S-5.9 100 at 30% over 480 months leaves the principal to the final row', () => {
    const result = loan(100, 30, 480);
    expect(result.monthlyPaymentCents).toBe(250);
    for (const r of result.rows.slice(0, 479)) {
      expect([r.principalCents, r.balanceCents]).toEqual([0, 10000]);
    }
    expect(row(result, 480)).toEqual([480, 10250, 250, 10000, 0]);
    expect(result.totalInterestCents).toBe(120000);
  });
});

describe('existing loan', () => {
  it('S-6.1 150000 at 6.5% for 240 months pays 1,118.36 with 118,406.09 interest', () => {
    const result = loan(150000, 6.5, 240);
    expect(result.monthlyPaymentCents).toBe(111836);
    expect(result.totalInterestCents).toBe(11840609);
    expect(result.totalPaidCents).toBe(26840609);
  });
});

describe('extra monthly payment', () => {
  const withExtra = (amount: number, rate: number, term: number, extra: number) =>
    compareExtraPayment(
      { amountCents: amount * 100, rateThousandths: rate * 1000, termMonths: term },
      Math.round(extra * 100),
    );

  it('S-7.1 S-8.1 base loan with 100 extra: 27 months, 9 sooner, 206.83 saved of 789.54', () => {
    const result = withExtra(10000, 5, 36, 100);
    expect(result.withExtra.rows).toHaveLength(27);
    expect(result.monthsSooner).toBe(9);
    expect(result.interestSavedCents).toBe(20683);
    expect(result.base.totalInterestCents).toBe(78954);
  });
  it('S-7.2 S-8.2 150000 at 6.5% for 240 with 300 extra: 158 months, 82 sooner, 45,069.87 saved', () => {
    const result = withExtra(150000, 6.5, 240, 300);
    expect(result.withExtra.rows).toHaveLength(158);
    expect(result.monthsSooner).toBe(82);
    expect(result.interestSavedCents).toBe(4506987);
    expect(result.base.totalInterestCents).toBe(11840609);
  });
  it('S-7.5 S-8.3 smallest extra 0.01: 36 months, 0 sooner, 0.03 saved', () => {
    const result = withExtra(10000, 5, 36, 0.01);
    expect(result.withExtra.rows).toHaveLength(36);
    expect(result.monthsSooner).toBe(0);
    expect(result.interestSavedCents).toBe(3);
  });
  it('S-7.6 S-8.4 extra equal to the amount: 1 month, 35 sooner, 747.87 saved', () => {
    const result = withExtra(10000, 5, 36, 10000);
    expect(result.withExtra.rows).toHaveLength(1);
    expect(result.monthsSooner).toBe(35);
    expect(result.interestSavedCents).toBe(74787);
  });
  it('S-7.11 the with-extra schedule: row 1, row 27 and totals 582.71 and 10,582.71', () => {
    const result = withExtra(10000, 5, 36, 100);
    expect(row(result.withExtra, 1)).toEqual([1, 39971, 4167, 35804, 964196]);
    expect(row(result.withExtra, 27)).toEqual([27, 19025, 79, 18946, 0]);
    expect(result.withExtra.monthlyPaymentCents).toBe(29971);
    expect(result.withExtra.totalInterestCents).toBe(58271);
    expect(result.withExtra.totalPaidCents).toBe(1058271);
    expectConsistent(result.withExtra, 1000000);
  });
  it('S-8.5 0% loan 12000 over 12 with 1000 extra: 6 months, 6 sooner, 0.00 saved', () => {
    const result = withExtra(12000, 0, 12, 1000);
    expect(result.withExtra.rows).toHaveLength(6);
    expect(result.monthsSooner).toBe(6);
    expect(result.interestSavedCents).toBe(0);
  });
  it('S-8.6 interest saved = interest without extra − interest of the with-extra schedule', () => {
    for (const [a, r, n, e] of [[10000, 5, 36, 100], [250000, 6.5, 360, 200], [100, 30, 480, 1], [10000000, 30, 480, 10000000]]) {
      const result = withExtra(a, r, n, e);
      expect(result.interestSavedCents).toBe(
        sum(result.base, 'interestCents') - sum(result.withExtra, 'interestCents'));
      expect(result.interestSavedCents).toBeGreaterThanOrEqual(0);
      expect(result.monthsSooner).toBe(result.base.rows.length - result.withExtra.rows.length);
      expectConsistent(result.withExtra, a * 100);
    }
  });
});
