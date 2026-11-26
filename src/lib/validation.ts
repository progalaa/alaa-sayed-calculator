// Pure input parsing and validation. No UI code here.
//
// Inputs are parsed from their text, never through floating point: "10000.5"
// becomes 1000050 cents by splitting at the decimal point.

export type Field = 'amount' | 'rate' | 'term' | 'extra';

export type RawInputs = Record<Field, string>;

export type FieldErrors = Partial<Record<Field, string>>;

export interface LoanValues {
  amountCents: number;
  rateThousandths: number;
  termMonths: number;
  extraCents: number; // 0 when no extra payment
}

export interface ValidationResult {
  errors: FieldErrors;
  values?: LoanValues;
}

export const AMOUNT_MIN_CENTS = 10_000; // 100.00
export const AMOUNT_MAX_CENTS = 1_000_000_000; // 10,000,000.00
export const RATE_MAX_THOUSANDTHS = 30_000; // 30%
export const TERM_MIN_MONTHS = 1;
export const TERM_MAX_MONTHS = 480;

// Digits with at most one decimal point, optionally preceded by a minus sign
// (recognised only so that negative values get their own message).
const NUMBER_PATTERN = /^-?(\d+\.?\d*|\.\d+)$/;

type Parsed =
  | { kind: 'empty' }
  | { kind: 'notNumber' }
  | { kind: 'negative' }
  | { kind: 'tooManyDecimals' }
  | { kind: 'ok'; units: number };

// Parses text into an integer number of units of 10^-decimals
// (decimals = 2 gives cents). Trailing zeros after the point are ignored.
function parseDecimal(raw: string, decimals: number): Parsed {
  const text = raw.trim();
  if (text === '') return { kind: 'empty' };
  if (!NUMBER_PATTERN.test(text)) return { kind: 'notNumber' };
  if (text.startsWith('-') && /[1-9]/.test(text)) return { kind: 'negative' };
  const [whole, fraction = ''] = text.replace('-', '').split('.');
  const significantFraction = fraction.replace(/0+$/, '');
  if (significantFraction.length > decimals) return { kind: 'tooManyDecimals' };
  const units = Number(whole || '0') * 10 ** decimals + Number(significantFraction.padEnd(decimals, '0') || '0');
  return { kind: 'ok', units };
}

const NOT_A_NUMBER = 'must be a number, without commas or symbols.';

function validateAmount(raw: string): { error?: string; value?: number } {
  const parsed = parseDecimal(raw, 2);
  switch (parsed.kind) {
    case 'empty': return { error: 'Enter a loan amount.' };
    case 'notNumber': return { error: `Loan amount ${NOT_A_NUMBER}` };
    case 'negative': return { error: 'Loan amount cannot be negative.' };
    case 'tooManyDecimals': return { error: 'Loan amount can have at most 2 decimal places.' };
  }
  if (parsed.units < AMOUNT_MIN_CENTS) return { error: 'Loan amount must be at least 100.00.' };
  if (parsed.units > AMOUNT_MAX_CENTS) return { error: 'Loan amount must be no more than 10,000,000.00.' };
  return { value: parsed.units };
}

function validateRate(raw: string): { error?: string; value?: number } {
  const parsed = parseDecimal(raw, 3);
  switch (parsed.kind) {
    case 'empty': return { error: 'Enter an interest rate.' };
    case 'notNumber': return { error: `Interest rate ${NOT_A_NUMBER}` };
    case 'negative': return { error: 'Interest rate cannot be negative.' };
    case 'tooManyDecimals': return { error: 'Interest rate can have at most 3 decimal places.' };
  }
  if (parsed.units > RATE_MAX_THOUSANDTHS) return { error: 'Interest rate must be no more than 30%.' };
  return { value: parsed.units };
}

function validateTerm(raw: string): { error?: string; value?: number } {
  const parsed = parseDecimal(raw, 0);
  switch (parsed.kind) {
    case 'empty': return { error: 'Enter a term in months.' };
    case 'notNumber': return { error: `Term ${NOT_A_NUMBER}` };
    case 'negative': return { error: 'Term cannot be negative.' };
    case 'tooManyDecimals': return { error: 'Term must be a whole number of months.' };
  }
  if (parsed.units < TERM_MIN_MONTHS) return { error: 'Term must be at least 1 month.' };
  if (parsed.units > TERM_MAX_MONTHS) return { error: 'Term must be no more than 480 months.' };
  return { value: parsed.units };
}

// Optional: empty means no extra payment. The comparison with the loan amount
// is only made when the loan amount itself is valid.
function validateExtra(raw: string, amountCents: number | undefined): { error?: string; value?: number } {
  const parsed = parseDecimal(raw, 2);
  switch (parsed.kind) {
    case 'empty': return { value: 0 };
    case 'notNumber': return { error: `Extra payment ${NOT_A_NUMBER}` };
    case 'negative': return { error: 'Extra payment cannot be negative.' };
    case 'tooManyDecimals': return { error: 'Extra payment can have at most 2 decimal places.' };
  }
  if (amountCents !== undefined && parsed.units > amountCents) {
    return { error: 'Extra payment cannot be more than the loan amount.' };
  }
  return { value: parsed.units };
}

export function validateInputs(raw: RawInputs): ValidationResult {
  const amount = validateAmount(raw.amount);
  const rate = validateRate(raw.rate);
  const term = validateTerm(raw.term);
  const extra = validateExtra(raw.extra, amount.value);

  const errors: FieldErrors = {};
  if (amount.error) errors.amount = amount.error;
  if (rate.error) errors.rate = rate.error;
  if (term.error) errors.term = term.error;
  if (extra.error) errors.extra = extra.error;

  if (amount.value === undefined || rate.value === undefined || term.value === undefined
    || extra.value === undefined) {
    return { errors };
  }
  return {
    errors,
    values: {
      amountCents: amount.value,
      rateThousandths: rate.value,
      termMonths: term.value,
      extraCents: extra.value,
    },
  };
}
