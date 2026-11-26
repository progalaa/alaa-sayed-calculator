import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

afterEach(cleanup);

function setup() {
  const user = userEvent.setup();
  render(<App />);
  const amount = screen.getByLabelText('Loan amount');
  const rate = screen.getByLabelText('Annual interest rate (%)');
  const term = screen.getByLabelText('Term (months)');
  const extra = screen.getByLabelText('Extra monthly payment (optional)');
  const calculate = () => user.click(screen.getByRole('button', { name: 'Calculate' }));
  const fill = async (a: string, r: string, t: string) => {
    for (const [input, value] of [[amount, a], [rate, r], [term, t]] as const) {
      await user.clear(input);
      if (value !== '') await user.type(input, value);
    }
  };
  const replace = async (input: HTMLElement, value: string) => {
    await user.clear(input);
    if (value !== '') await user.type(input, value);
  };
  return { user, amount, rate, term, extra, calculate, fill, replace };
}

// The value shown next to a result label such as "Monthly payment".
const shown = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent;

const scheduleRows = () =>
  within(screen.getByRole('table')).getAllByRole('row').slice(1)
    .map((row) => Array.from(row.querySelectorAll('th, td'), (cell) => cell.textContent).join(' | '));

// The error message linked to an input through aria-describedby.
function messageFor(input: HTMLElement) {
  const ids = (input.getAttribute('aria-describedby') ?? '').split(' ');
  const error = ids.map((id) => document.getElementById(id)).find((el) => el?.dataset.kind === 'error');
  return error ?? null;
}

function expectNoResult() {
  expect(screen.queryByText('Monthly payment')).toBeNull();
  expect(screen.queryByRole('table')).toBeNull();
  expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
}

describe('S-1 monthly payment', () => {
  const cases: [string, string, string, string, string][] = [
    ['S-1.1', '10000', '5', '36', '299.71'],
    ['S-1.2', '12000', '0', '12', '1,000.00'],
    ['S-1.3', '1000', '0', '3', '333.33'],
    ['S-1.4', '100', '5', '12', '8.56'],
    ['S-1.5', '10000000', '5', '360', '53,682.16'],
    ['S-1.6', '10000', '0.001', '36', '277.78'],
    ['S-1.7', '10000', '30', '36', '424.52'],
    ['S-1.8', '1000', '12', '1', '1,010.00'],
    ['S-1.9', '200000', '5', '480', '964.39'],
    ['S-1.10', '10000000', '30', '480', '250,001.78'],
  ];
  for (const [id, a, r, t, expected] of cases) {
    it(`${id} shows monthly payment ${expected} for ${a}, ${r}%, ${t} months`, async () => {
      const { fill, calculate } = setup();
      await fill(a, r, t);
      await calculate();
      expect(shown('Monthly payment')).toBe(expected);
      expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    });
  }

  it('S-1.11 ignores leading and trailing spaces', async () => {
    const { fill, calculate } = setup();
    await fill(' 10000 ', ' 5 ', ' 36 ');
    await calculate();
    expect(shown('Monthly payment')).toBe('299.71');
  });

  it('S-1.12 works with the keyboard alone: Tab between fields and Enter to calculate', async () => {
    const { user, amount, rate, term } = setup();
    await user.tab();
    expect(document.activeElement).toBe(amount);
    await user.keyboard('10000');
    await user.tab();
    expect(document.activeElement).toBe(rate);
    await user.keyboard('5');
    await user.tab();
    expect(document.activeElement).toBe(term);
    await user.keyboard('36{Enter}');
    expect(shown('Monthly payment')).toBe('299.71');
  });
});

describe('S-2 total cost', () => {
  const cases: [string, string, string, string, string, string][] = [
    ['S-2.1', '10000', '5', '36', '789.54', '10,789.54'],
    ['S-2.2', '12000', '0', '12', '0.00', '12,000.00'],
    ['S-2.3', '100', '5', '12', '2.74', '102.74'],
    ['S-2.4', '10000000', '30', '480', '110,004,592.05', '120,004,592.05'],
  ];
  for (const [id, a, r, t, interest, paid] of cases) {
    it(`${id} shows total interest ${interest} and total paid ${paid}`, async () => {
      const { fill, calculate } = setup();
      await fill(a, r, t);
      await calculate();
      expect(shown('Total interest')).toBe(interest);
      expect(shown('Total amount paid')).toBe(paid);
    });
  }

  it('S-2.5 shown totals equal the sums of the schedule columns on screen', async () => {
    const { fill, calculate } = setup();
    await fill('10000', '5', '36');
    await calculate();
    const cents = (text: string) => Number(text.replace(/[,.]/g, ''));
    const columns = scheduleRows().map((row) => row.split(' | ').map(cents));
    const total = (index: number) => columns.reduce((s, row) => s + row[index], 0);
    expect(total(1)).toBe(cents(shown('Total amount paid')!));
    expect(total(2)).toBe(cents(shown('Total interest')!));
    expect(cents(shown('Total amount paid')!)).toBe(1000000 + cents(shown('Total interest')!));
    expect(shown('Total interest')).toBe('789.54');
  });

  it('S-2.6 the monthly payment is never shown without both totals', async () => {
    const { fill, calculate } = setup();
    for (const [a, r, t] of [['10000', '5', '36'], ['12000', '0', '12'], ['100', '30', '480']]) {
      await fill(a, r, t);
      await calculate();
      expect(shown('Monthly payment')).toBeTruthy();
      expect(shown('Total interest')).toBeTruthy();
      expect(shown('Total amount paid')).toBeTruthy();
    }
  });
});

describe('S-3 validation messages', () => {
  const cases: [string, 'amount' | 'rate' | 'term', string, string][] = [
    ['S-3.1', 'amount', '', 'Enter a loan amount.'],
    ['S-3.2', 'amount', 'abc', 'Loan amount must be a number, without commas or symbols.'],
    ['S-3.3', 'amount', '25,000', 'Loan amount must be a number, without commas or symbols.'],
    ['S-3.4', 'amount', '-5000', 'Loan amount cannot be negative.'],
    ['S-3.5', 'amount', '0', 'Loan amount must be at least 100.00.'],
    ['S-3.6', 'amount', '99.99', 'Loan amount must be at least 100.00.'],
    ['S-3.7', 'amount', '10000000.01', 'Loan amount must be no more than 10,000,000.00.'],
    ['S-3.8', 'amount', '100.005', 'Loan amount can have at most 2 decimal places.'],
    ['S-3.9', 'rate', '', 'Enter an interest rate.'],
    ['S-3.10', 'rate', '5%', 'Interest rate must be a number, without commas or symbols.'],
    ['S-3.11', 'rate', '-1', 'Interest rate cannot be negative.'],
    ['S-3.12', 'rate', '30.001', 'Interest rate must be no more than 30%.'],
    ['S-3.13', 'rate', '5.1234', 'Interest rate can have at most 3 decimal places.'],
    ['S-3.14', 'term', '', 'Enter a term in months.'],
    ['S-3.15', 'term', 'three', 'Term must be a number, without commas or symbols.'],
    ['S-3.16', 'term', '-12', 'Term cannot be negative.'],
    ['S-3.17', 'term', '0', 'Term must be at least 1 month.'],
    ['S-3.18', 'term', '12.5', 'Term must be a whole number of months.'],
    ['S-3.19', 'term', '481', 'Term must be no more than 480 months.'],
  ];
  for (const [id, field, value, message] of cases) {
    it(`${id} S-3.21 shows "${message}" next to the ${field} field for "${value}" and no result`, async () => {
      const ctx = setup();
      const values = { amount: '10000', rate: '5', term: '36', [field]: value };
      await ctx.fill(values.amount, values.rate, values.term);
      await ctx.calculate();
      const input = ctx[field];
      const error = messageFor(input);
      expect(error?.textContent).toBe(message);
      // "next to": the message sits in the same field group as its input.
      expect(error?.closest('.field')).toBe(input.closest('.field'));
      expect(input.getAttribute('aria-invalid')).toBe('true');
      // the other fields show no message
      for (const other of (['amount', 'rate', 'term'] as const).filter((f) => f !== field)) {
        expect(messageFor(ctx[other])).toBeNull();
      }
      expectNoResult();
    });
  }

  it('S-3.20 all fields empty shows three messages and focuses the loan amount', async () => {
    const { amount, rate, term, calculate } = setup();
    await calculate();
    expect(messageFor(amount)?.textContent).toBe('Enter a loan amount.');
    expect(messageFor(rate)?.textContent).toBe('Enter an interest rate.');
    expect(messageFor(term)?.textContent).toBe('Enter a term in months.');
    expect(document.activeElement).toBe(amount);
    expectNoResult();
  });

  it('S-3.20 focus moves to the first invalid field when an earlier one is valid', async () => {
    const { fill, calculate, rate } = setup();
    await fill('10000', '', '');
    await calculate();
    expect(document.activeElement).toBe(rate);
  });
});

describe('S-4 changing inputs', () => {
  it('S-4.1 changing the term removes the result and schedule at once', async () => {
    const { fill, calculate, replace, term } = setup();
    await fill('10000', '5', '36');
    await calculate();
    expect(shown('Monthly payment')).toBe('299.71');
    await replace(term, '48');
    expectNoResult();
  });

  it('S-4.2 calculating again after changing the term shows the new figures', async () => {
    const { fill, calculate, replace, term } = setup();
    await fill('10000', '5', '36');
    await calculate();
    await replace(term, '48');
    await calculate();
    expect(shown('Monthly payment')).toBe('230.29');
    expect(shown('Total interest')).toBe('1,054.11');
    expect(shown('Total amount paid')).toBe('11,054.11');
  });

  it('S-4.3 changing the rate to 6 and calculating shows 304.22', async () => {
    const { fill, calculate, replace, rate } = setup();
    await fill('10000', '5', '36');
    await calculate();
    await replace(rate, '6');
    await calculate();
    expect(shown('Monthly payment')).toBe('304.22');
    expect(shown('Total interest')).toBe('951.88');
    expect(shown('Total amount paid')).toBe('10,951.88');
  });

  it('S-4.4 an invalid change after a result shows the message and no old result', async () => {
    const { fill, calculate, replace, amount } = setup();
    await fill('10000', '5', '36');
    await calculate();
    await replace(amount, 'abc');
    await calculate();
    expect(messageFor(amount)?.textContent).toBe('Loan amount must be a number, without commas or symbols.');
    expectNoResult();
  });

  it('S-4.5 correcting the field removes its message at once', async () => {
    const { fill, calculate, replace, amount } = setup();
    await fill('-5000', '5', '36');
    await calculate();
    expect(messageFor(amount)?.textContent).toBe('Loan amount cannot be negative.');
    await replace(amount, '10000');
    expect(messageFor(amount)).toBeNull();
    expect(screen.queryByText('Loan amount cannot be negative.')).toBeNull();
    expect(amount.getAttribute('aria-invalid')).toBe('false');
  });

  it('S-4.6 after correcting, Calculate shows 299.71', async () => {
    const { fill, calculate, replace, amount } = setup();
    await fill('-5000', '5', '36');
    await calculate();
    await replace(amount, '10000');
    await calculate();
    expect(shown('Monthly payment')).toBe('299.71');
  });

  it('S-4.7 editing one field removes only that field\'s message', async () => {
    const { fill, calculate, user, amount, term } = setup();
    await fill('', '5', '');
    await calculate();
    await user.type(amount, '10000');
    expect(messageFor(amount)).toBeNull();
    expect(messageFor(term)?.textContent).toBe('Enter a term in months.');
  });
});

describe('S-5 schedule', () => {
  it('S-5.1 shows the five columns and 36 rows numbered 1 to 36', async () => {
    const { fill, calculate } = setup();
    await fill('10000', '5', '36');
    await calculate();
    const headers = within(screen.getByRole('table')).getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Month', 'Payment', 'Interest', 'Principal', 'Remaining balance']);
    const rows = scheduleRows();
    expect(rows).toHaveLength(36);
    expect(rows.map((r) => r.split(' | ')[0])).toEqual(Array.from({ length: 36 }, (_, i) => String(i + 1)));
  });

  it('S-5.2 S-5.3 shows row 1 and the adjusted final row 36', async () => {
    const { fill, calculate } = setup();
    await fill('10000', '5', '36');
    await calculate();
    const rows = scheduleRows();
    expect(rows[0]).toBe('1 | 299.71 | 41.67 | 258.04 | 9,741.96');
    expect(rows[35]).toBe('36 | 299.69 | 1.24 | 298.45 | 0.00');
  });

  it('S-5.4 S-5.5 every row on screen adds up and principal sums to the amount', async () => {
    const { fill, calculate } = setup();
    await fill('10000', '5', '36');
    await calculate();
    const cents = (text: string) => Number(text.replace(/[,.]/g, ''));
    let previous = 1000000;
    let principal = 0;
    for (const row of scheduleRows()) {
      const [, pay, interest, prin, balance] = row.split(' | ').map(cents);
      expect(pay).toBe(interest + prin);
      expect(balance).toBe(previous - prin);
      previous = balance;
      principal += prin;
    }
    expect(principal).toBe(1000000);
  });

  it('S-5.6 0% loan 1000 over 3 months shows 333.33, 333.33, 333.34', async () => {
    const { fill, calculate } = setup();
    await fill('1000', '0', '3');
    await calculate();
    expect(scheduleRows()).toEqual([
      '1 | 333.33 | 0.00 | 333.33 | 666.67',
      '2 | 333.33 | 0.00 | 333.33 | 333.34',
      '3 | 333.34 | 0.00 | 333.34 | 0.00',
    ]);
  });

  it('S-5.7 longest term shows 480 rows ending 969.69 | 4.02 | 965.67 | 0.00', async () => {
    const { fill, calculate } = setup();
    await fill('200000', '5', '480');
    await calculate();
    const rows = scheduleRows();
    expect(rows).toHaveLength(480);
    expect(rows[479]).toBe('480 | 969.69 | 4.02 | 965.67 | 0.00');
  });

  it('S-5.8 100 at 0% over 480 months shows 0.21 and 477 rows', async () => {
    const { fill, calculate } = setup();
    await fill('100', '0', '480');
    await calculate();
    expect(shown('Monthly payment')).toBe('0.21');
    const rows = scheduleRows();
    expect(rows).toHaveLength(477);
    expect(rows[476]).toBe('477 | 0.04 | 0.00 | 0.04 | 0.00');
  });

  it('S-5.9 100 at 30% over 480 months leaves the principal to row 480', async () => {
    const { fill, calculate } = setup();
    await fill('100', '30', '480');
    await calculate();
    expect(shown('Monthly payment')).toBe('2.50');
    const rows = scheduleRows();
    for (const row of rows.slice(0, 479)) expect(row.split(' | ').slice(3)).toEqual(['0.00', '100.00']);
    expect(rows[479]).toBe('480 | 102.50 | 2.50 | 100.00 | 0.00');
    expect(shown('Total interest')).toBe('1,200.00');
  });

  it('S-5.10 the table sits in its own keyboard-focusable scroll area (layout itself is checked manually)', async () => {
    const { fill, calculate } = setup();
    await fill('10000', '5', '36');
    await calculate();
    const wrapper = screen.getByRole('table').parentElement!;
    expect(wrapper.className).toBe('table-scroll');
    expect(wrapper.tabIndex).toBe(0);
  });
});

describe('S-6 existing loan', () => {
  it('S-6.1 150000 at 6.5% for 240 months shows 1,118.36 and 118,406.09 interest', async () => {
    const { fill, calculate } = setup();
    await fill('150000', '6.5', '240');
    await calculate();
    expect(shown('Monthly payment')).toBe('1,118.36');
    expect(shown('Total interest')).toBe('118,406.09');
    expect(shown('Total amount paid')).toBe('268,406.09');
  });

  it('S-6.2 shows the existing-loan hints under the amount and term fields', () => {
    const { amount, term } = setup();
    const hint = (input: HTMLElement) => input.closest('.field')?.querySelector('.hint')?.textContent;
    expect(hint(amount)).toBe('For a loan you already have, enter the balance still owed.');
    expect(hint(term)).toBe('For a loan you already have, enter the months remaining.');
  });
});

describe('S-7 S-8 extra monthly payment', () => {
  async function run(a: string, r: string, t: string, e: string) {
    const ctx = setup();
    await ctx.fill(a, r, t);
    await ctx.replace(ctx.extra, e);
    await ctx.calculate();
    return ctx;
  }
  const paidOff = () => screen.queryByText(/^Paid off in/)?.textContent ?? null;
  const saved = () => screen.queryByText(/^Interest saved/)?.textContent ?? null;

  it('S-7.1 S-8.1 base loan with 100 extra: 27 months (9 sooner) and 206.83 saved', async () => {
    await run('10000', '5', '36', '100');
    expect(paidOff()).toBe('Paid off in 27 months (9 months sooner)');
    expect(saved()).toBe('Interest saved: 206.83 (789.54 without the extra payment)');
  });

  it('S-7.2 S-8.2 150000 at 6.5% for 240 with 300 extra: 158 months (82 sooner) and 45,069.87 saved', async () => {
    await run('150000', '6.5', '240', '300');
    expect(paidOff()).toBe('Paid off in 158 months (82 months sooner)');
    expect(saved()).toBe('Interest saved: 45,069.87 (118,406.09 without the extra payment)');
  });

  it('S-7.3 empty extra shows the S-2.1 result and no extra-payment lines', async () => {
    await run('10000', '5', '36', '');
    expect(shown('Monthly payment')).toBe('299.71');
    expect(shown('Total interest')).toBe('789.54');
    expect(shown('Total amount paid')).toBe('10,789.54');
    expect(paidOff()).toBeNull();
    expect(saved()).toBeNull();
  });

  it('S-7.4 extra 0 shows the same as an empty extra', async () => {
    await run('10000', '5', '36', '0');
    expect(shown('Monthly payment')).toBe('299.71');
    expect(shown('Total interest')).toBe('789.54');
    expect(scheduleRows()).toHaveLength(36);
    expect(paidOff()).toBeNull();
    expect(saved()).toBeNull();
  });

  it('S-7.5 S-8.3 smallest extra 0.01: 36 months (0 sooner) and 0.03 saved', async () => {
    await run('10000', '5', '36', '0.01');
    expect(paidOff()).toBe('Paid off in 36 months (0 months sooner)');
    expect(saved()).toBe('Interest saved: 0.03 (789.54 without the extra payment)');
  });

  it('S-7.6 S-8.4 extra equal to the amount: 1 month (35 sooner) and 747.87 saved', async () => {
    await run('10000', '5', '36', '10000');
    expect(paidOff()).toBe('Paid off in 1 month (35 months sooner)');
    expect(saved()).toBe('Interest saved: 747.87 (789.54 without the extra payment)');
  });

  const invalid: [string, string, string][] = [
    ['S-7.7', '10000.01', 'Extra payment cannot be more than the loan amount.'],
    ['S-7.8', '-50', 'Extra payment cannot be negative.'],
    ['S-7.9', 'abc', 'Extra payment must be a number, without commas or symbols.'],
    ['S-7.10', '10.005', 'Extra payment can have at most 2 decimal places.'],
  ];
  for (const [id, value, message] of invalid) {
    it(`${id} shows "${message}" next to the extra field for "${value}" and no result`, async () => {
      const { extra } = await run('10000', '5', '36', value);
      const error = messageFor(extra);
      expect(error?.textContent).toBe(message);
      expect(error?.closest('.field')).toBe(extra.closest('.field'));
      expect(document.activeElement).toBe(extra);
      expectNoResult();
    });
  }

  it('S-7.11 with 100 extra the schedule and totals show the with-extra plan', async () => {
    await run('10000', '5', '36', '100');
    const rows = scheduleRows();
    expect(rows).toHaveLength(27);
    expect(rows[0]).toBe('1 | 399.71 | 41.67 | 358.04 | 9,641.96');
    expect(rows[26]).toBe('27 | 190.25 | 0.79 | 189.46 | 0.00');
    expect(shown('Monthly payment')).toBe('299.71');
    expect(shown('Total interest')).toBe('582.71');
    expect(shown('Total amount paid')).toBe('10,582.71');
  });

  it('S-7.12 changing the extra payment removes the result until Calculate', async () => {
    const { replace, extra, calculate } = await run('10000', '5', '36', '100');
    await replace(extra, '200');
    expectNoResult();
    expect(paidOff()).toBeNull();
    expect(saved()).toBeNull();
    await calculate();
    expect(paidOff()).not.toBeNull();
  });

  it('S-7.13 correcting the extra payment removes its message and Calculate shows S-7.1', async () => {
    const { replace, extra, calculate } = await run('10000', '5', '36', '-50');
    await replace(extra, '100');
    expect(messageFor(extra)).toBeNull();
    expect(screen.queryByText('Extra payment cannot be negative.')).toBeNull();
    await calculate();
    expect(paidOff()).toBe('Paid off in 27 months (9 months sooner)');
  });

  it('S-8.5 0% loan with 1000 extra: 6 months (6 sooner) and 0.00 saved', async () => {
    await run('12000', '0', '12', '1000');
    expect(paidOff()).toBe('Paid off in 6 months (6 months sooner)');
    expect(saved()).toBe('Interest saved: 0.00 (0.00 without the extra payment)');
  });

  it('S-8.6 interest saved equals interest without extra minus the Total interest shown', async () => {
    await run('10000', '5', '36', '100');
    const cents = (text: string) => Number(text.replace(/[,.]/g, ''));
    const [, savedText, withoutText] = saved()!.match(/^Interest saved: ([\d,.]+) \(([\d,.]+) without/)!;
    expect(cents(savedText)).toBe(cents(withoutText) - cents(shown('Total interest')!));
  });
});
