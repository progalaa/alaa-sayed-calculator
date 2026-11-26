import { describe, expect, it } from 'vitest';
import { validateInputs, type RawInputs } from './validation';

const base: RawInputs = { amount: '10000', rate: '5', term: '36', extra: '' };
const errorsFor = (changes: Partial<RawInputs>) => validateInputs({ ...base, ...changes }).errors;

describe('valid input', () => {
  it('S-1.1 base loan converts to cents, thousandths of a percent and months', () => {
    expect(validateInputs(base)).toEqual({
      errors: {},
      values: { amountCents: 1000000, rateThousandths: 5000, termMonths: 36, extraCents: 0 },
    });
  });
  it('S-1.6 rate 0.001 converts to 1 thousandth of a percent', () => {
    expect(validateInputs({ ...base, rate: '0.001' }).values?.rateThousandths).toBe(1);
  });
  it('S-1.11 leading and trailing spaces are ignored', () => {
    expect(validateInputs({ amount: ' 10000 ', rate: ' 5 ', term: ' 36 ', extra: '' }).values)
      .toEqual({ amountCents: 1000000, rateThousandths: 5000, termMonths: 36, extraCents: 0 });
  });
  it('S-1.4 S-1.5 amount boundaries 100 and 10000000 are accepted', () => {
    expect(errorsFor({ amount: '100' })).toEqual({});
    expect(errorsFor({ amount: '100.00' })).toEqual({});
    expect(errorsFor({ amount: '10000000' })).toEqual({});
    expect(errorsFor({ amount: '10000000.00' })).toEqual({});
  });
  it('S-1.2 S-1.7 rate boundaries 0 and 30 are accepted', () => {
    expect(errorsFor({ rate: '0' })).toEqual({});
    expect(errorsFor({ rate: '30' })).toEqual({});
    expect(errorsFor({ rate: '30.000' })).toEqual({});
  });
  it('S-1.8 S-1.9 term boundaries 1 and 480 are accepted', () => {
    expect(errorsFor({ term: '1' })).toEqual({});
    expect(errorsFor({ term: '480' })).toEqual({});
  });
});

describe('loan amount messages', () => {
  it('S-3.1 empty amount', () => {
    expect(errorsFor({ amount: '' })).toEqual({ amount: 'Enter a loan amount.' });
    expect(errorsFor({ amount: '   ' })).toEqual({ amount: 'Enter a loan amount.' });
  });
  it('S-3.2 non-numeric amount', () => {
    expect(errorsFor({ amount: 'abc' })).toEqual({ amount: 'Loan amount must be a number, without commas or symbols.' });
  });
  it('S-3.3 amount with a comma', () => {
    expect(errorsFor({ amount: '25,000' })).toEqual({ amount: 'Loan amount must be a number, without commas or symbols.' });
  });
  it('S-3.4 negative amount', () => {
    expect(errorsFor({ amount: '-5000' })).toEqual({ amount: 'Loan amount cannot be negative.' });
  });
  it('S-3.5 zero amount', () => {
    expect(errorsFor({ amount: '0' })).toEqual({ amount: 'Loan amount must be at least 100.00.' });
  });
  it('S-3.6 amount just below minimum', () => {
    expect(errorsFor({ amount: '99.99' })).toEqual({ amount: 'Loan amount must be at least 100.00.' });
  });
  it('S-3.7 amount just above maximum', () => {
    expect(errorsFor({ amount: '10000000.01' })).toEqual({ amount: 'Loan amount must be no more than 10,000,000.00.' });
    expect(errorsFor({ amount: '99999999999999999999999' })).toEqual({ amount: 'Loan amount must be no more than 10,000,000.00.' });
  });
  it('S-3.8 amount with more than 2 decimals', () => {
    expect(errorsFor({ amount: '100.005' })).toEqual({ amount: 'Loan amount can have at most 2 decimal places.' });
  });
});

describe('interest rate messages', () => {
  it('S-3.9 empty rate', () => {
    expect(errorsFor({ rate: '' })).toEqual({ rate: 'Enter an interest rate.' });
  });
  it('S-3.10 rate with a percent sign', () => {
    expect(errorsFor({ rate: '5%' })).toEqual({ rate: 'Interest rate must be a number, without commas or symbols.' });
    expect(errorsFor({ rate: '1e1' })).toEqual({ rate: 'Interest rate must be a number, without commas or symbols.' });
  });
  it('S-3.11 negative rate', () => {
    expect(errorsFor({ rate: '-1' })).toEqual({ rate: 'Interest rate cannot be negative.' });
  });
  it('S-3.12 rate just above maximum', () => {
    expect(errorsFor({ rate: '30.001' })).toEqual({ rate: 'Interest rate must be no more than 30%.' });
  });
  it('S-3.13 rate with more than 3 decimals', () => {
    expect(errorsFor({ rate: '5.1234' })).toEqual({ rate: 'Interest rate can have at most 3 decimal places.' });
  });
});

describe('term messages', () => {
  it('S-3.14 empty term', () => {
    expect(errorsFor({ term: '' })).toEqual({ term: 'Enter a term in months.' });
  });
  it('S-3.15 non-numeric term', () => {
    expect(errorsFor({ term: 'three' })).toEqual({ term: 'Term must be a number, without commas or symbols.' });
  });
  it('S-3.16 negative term', () => {
    expect(errorsFor({ term: '-12' })).toEqual({ term: 'Term cannot be negative.' });
  });
  it('S-3.17 zero term', () => {
    expect(errorsFor({ term: '0' })).toEqual({ term: 'Term must be at least 1 month.' });
  });
  it('S-3.18 non-whole term', () => {
    expect(errorsFor({ term: '12.5' })).toEqual({ term: 'Term must be a whole number of months.' });
  });
  it('S-3.19 term just above maximum', () => {
    expect(errorsFor({ term: '481' })).toEqual({ term: 'Term must be no more than 480 months.' });
  });
});

describe('several fields', () => {
  it('S-3.20 all three empty gives three messages and no values', () => {
    const result = validateInputs({ amount: '', rate: '', term: '', extra: '' });
    expect(result.errors).toEqual({
      amount: 'Enter a loan amount.',
      rate: 'Enter an interest rate.',
      term: 'Enter a term in months.',
    });
    expect(result.values).toBeUndefined();
  });
});

describe('extra monthly payment', () => {
  const extraCents = (extra: string) => validateInputs({ ...base, extra }).values?.extraCents;

  it('S-7.3 empty extra means no extra payment', () => {
    expect(errorsFor({ extra: '' })).toEqual({});
    expect(extraCents('')).toBe(0);
  });
  it('S-7.4 extra 0 means no extra payment', () => {
    expect(extraCents('0')).toBe(0);
  });
  it('S-7.5 smallest extra 0.01 is accepted', () => {
    expect(extraCents('0.01')).toBe(1);
  });
  it('S-7.6 extra equal to the loan amount is accepted', () => {
    expect(extraCents('10000')).toBe(1000000);
  });
  it('S-7.7 extra just above the loan amount', () => {
    expect(errorsFor({ extra: '10000.01' })).toEqual({ extra: 'Extra payment cannot be more than the loan amount.' });
  });
  it('S-7.8 negative extra', () => {
    expect(errorsFor({ extra: '-50' })).toEqual({ extra: 'Extra payment cannot be negative.' });
  });
  it('S-7.9 non-numeric extra', () => {
    expect(errorsFor({ extra: 'abc' })).toEqual({ extra: 'Extra payment must be a number, without commas or symbols.' });
  });
  it('S-7.10 extra with more than 2 decimals', () => {
    expect(errorsFor({ extra: '10.005' })).toEqual({ extra: 'Extra payment can have at most 2 decimal places.' });
  });
});
