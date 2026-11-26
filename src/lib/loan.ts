// Pure loan calculations. No UI code here.
//
// Money is always an integer number of cents. The annual rate is an integer
// number of thousandths of a percent (5.25% -> 5250), so the monthly rate is
// rateThousandths / 1,200,000 and monthly interest can be computed exactly
// with integers.

export interface LoanInput {
  amountCents: number;
  rateThousandths: number;
  termMonths: number;
}

export interface ScheduleRow {
  month: number;
  paymentCents: number;
  interestCents: number;
  principalCents: number;
  balanceCents: number;
}

export interface LoanResult {
  monthlyPaymentCents: number;
  rows: ScheduleRow[];
  totalInterestCents: number;
  totalPaidCents: number;
}

const MONTHLY_RATE_DIVISOR = 1_200_000;

// numerator / denominator rounded to the nearest integer, halves rounded up.
// Both arguments must be non-negative integers; the remainder keeps it exact.
function divideRoundHalfUp(numerator: number, denominator: number): number {
  const remainder = numerator % denominator;
  const quotient = (numerator - remainder) / denominator;
  return 2 * remainder >= denominator ? quotient + 1 : quotient;
}

export function monthlyInterestCents(balanceCents: number, rateThousandths: number): number {
  return divideRoundHalfUp(balanceCents * rateThousandths, MONTHLY_RATE_DIVISOR);
}

// Standard amortisation formula P = L·r / (1 − (1 + r)^−n), rounded to the
// nearest cent. This is the only floating-point step; at 0% it is L / n.
export function monthlyPaymentCents(input: LoanInput): number {
  const { amountCents, rateThousandths, termMonths } = input;
  if (rateThousandths === 0) return divideRoundHalfUp(amountCents, termMonths);
  const r = rateThousandths / MONTHLY_RATE_DIVISOR;
  return Math.round((amountCents * r) / (1 - Math.pow(1 + r, -termMonths)));
}

// Month-by-month schedule. paymentCents is what is paid each month (the
// regular payment plus any extra). The final payment is the remaining balance
// plus that month's interest, so the balance always ends at exactly zero. If
// the payment clears the balance before the last month, the schedule ends in
// that month.
export function buildSchedule(input: LoanInput, paymentCents: number): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let balanceCents = input.amountCents;
  for (let month = 1; month <= input.termMonths && balanceCents > 0; month++) {
    const interestCents = monthlyInterestCents(balanceCents, input.rateThousandths);
    const owed = balanceCents + interestCents;
    const payment = month === input.termMonths || owed <= paymentCents ? owed : paymentCents;
    const principalCents = payment - interestCents;
    balanceCents -= principalCents;
    rows.push({ month, paymentCents: payment, interestCents, principalCents, balanceCents });
  }
  return rows;
}

function summarise(monthlyPayment: number, rows: ScheduleRow[]): LoanResult {
  return {
    monthlyPaymentCents: monthlyPayment,
    rows,
    totalInterestCents: rows.reduce((total, row) => total + row.interestCents, 0),
    totalPaidCents: rows.reduce((total, row) => total + row.paymentCents, 0),
  };
}

export function calculateLoan(input: LoanInput): LoanResult {
  const payment = monthlyPaymentCents(input);
  return summarise(payment, buildSchedule(input, payment));
}

export interface ExtraPaymentComparison {
  base: LoanResult;
  withExtra: LoanResult;
  monthsSooner: number;
  interestSavedCents: number;
}

// The same loan with and without an extra amount paid every month from month 1
// on top of the regular payment. The regular payment itself does not change.
export function compareExtraPayment(input: LoanInput, extraCents: number): ExtraPaymentComparison {
  const base = calculateLoan(input);
  const withExtra = summarise(
    base.monthlyPaymentCents,
    buildSchedule(input, base.monthlyPaymentCents + extraCents),
  );
  return {
    base,
    withExtra,
    monthsSooner: base.rows.length - withExtra.rows.length,
    interestSavedCents: base.totalInterestCents - withExtra.totalInterestCents,
  };
}
