import { useRef, useState, type FormEvent } from 'react';
import { compareExtraPayment, type ExtraPaymentComparison } from './lib/loan';
import { validateInputs, type Field, type FieldErrors, type RawInputs } from './lib/validation';
import { formatCents } from './lib/format';
import ScheduleTable from './ScheduleTable';

interface FieldConfig {
  name: Field;
  label: string;
  hint?: string;
}

const FIELDS: FieldConfig[] = [
  { name: 'amount', label: 'Loan amount', hint: 'For a loan you already have, enter the balance still owed.' },
  { name: 'rate', label: 'Annual interest rate (%)' },
  { name: 'term', label: 'Term (months)', hint: 'For a loan you already have, enter the months remaining.' },
  { name: 'extra', label: 'Extra monthly payment (optional)' },
];

const EMPTY: RawInputs = { amount: '', rate: '', term: '', extra: '' };

const months = (count: number) => `${count} ${count === 1 ? 'month' : 'months'}`;

interface Result {
  comparison: ExtraPaymentComparison;
  hasExtra: boolean;
}

export default function App() {
  const [inputs, setInputs] = useState<RawInputs>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<Result | null>(null);
  const inputRefs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  // Any change removes the result, so it is never shown next to changed
  // inputs, and removes that field's message only.
  function handleChange(name: Field, value: string) {
    setInputs((current) => ({ ...current, [name]: value }));
    setResult(null);
    setErrors((current) => {
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validation = validateInputs(inputs);
    setErrors(validation.errors);
    if (!validation.values) {
      setResult(null);
      const firstInvalid = FIELDS.find((field) => validation.errors[field.name]);
      if (firstInvalid) inputRefs.current[firstInvalid.name]?.focus();
      return;
    }
    const { extraCents, ...loan } = validation.values;
    setResult({ comparison: compareExtraPayment(loan, extraCents), hasExtra: extraCents > 0 });
  }

  // With an extra payment, the totals and schedule are those of the plan with
  // the extra payment, so the totals always equal the sums of the rows shown.
  const shownPlan = result && (result.hasExtra ? result.comparison.withExtra : result.comparison.base);

  return (
    <main>
      <h1>Loan repayment calculator</h1>
      <p className="intro">See what a loan really costs: the monthly payment, the total interest and every payment month by month.</p>

      <form onSubmit={handleSubmit} noValidate>
        {FIELDS.map(({ name, label, hint }) => {
          const error = errors[name];
          const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(' ');
          return (
            <div className="field" key={name}>
              <label htmlFor={name}>{label}</label>
              <input
                id={name}
                name={name}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={inputs[name]}
                onChange={(event) => handleChange(name, event.target.value)}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={describedBy || undefined}
                ref={(element) => { inputRefs.current[name] = element; }}
              />
              {hint && <p className="hint" id={`${name}-hint`}>{hint}</p>}
              {error && <p className="error" id={`${name}-error`} data-kind="error">{error}</p>}
            </div>
          );
        })}
        <button type="submit">Calculate</button>
      </form>

      <div aria-live="polite">
        {result && shownPlan && (
          <section className="results" aria-labelledby="results-heading">
            <h2 id="results-heading">Results</h2>
            <dl>
              <div><dt>Monthly payment</dt><dd>{formatCents(shownPlan.monthlyPaymentCents)}</dd></div>
              <div><dt>Total interest</dt><dd>{formatCents(shownPlan.totalInterestCents)}</dd></div>
              <div><dt>Total amount paid</dt><dd>{formatCents(shownPlan.totalPaidCents)}</dd></div>
            </dl>
            {result.hasExtra && (
              <div className="extra-results">
                <p>
                  Paid off in {months(shownPlan.rows.length)} ({months(result.comparison.monthsSooner)} sooner)
                </p>
                <p>
                  Interest saved: {formatCents(result.comparison.interestSavedCents)} (
                  {formatCents(result.comparison.base.totalInterestCents)} without the extra payment)
                </p>
              </div>
            )}
          </section>
        )}
      </div>

      {shownPlan && <ScheduleTable rows={shownPlan.rows} />}
    </main>
  );
}
