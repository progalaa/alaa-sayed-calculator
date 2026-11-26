import type { ScheduleRow } from './lib/loan';
import { formatCents } from './lib/format';

export default function ScheduleTable({ rows }: { rows: ScheduleRow[] }) {
  return (
    <section className="schedule">
      {/* Focusable so keyboard users can scroll the table sideways on a narrow screen. */}
      <div className="table-scroll" tabIndex={0} role="region" aria-labelledby="schedule-caption">
        <table>
          <caption id="schedule-caption">Month-by-month schedule</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Payment</th>
              <th scope="col">Interest</th>
              <th scope="col">Principal</th>
              <th scope="col">Remaining balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}>
                <th scope="row">{row.month}</th>
                <td>{formatCents(row.paymentCents)}</td>
                <td>{formatCents(row.interestCents)}</td>
                <td>{formatCents(row.principalCents)}</td>
                <td>{formatCents(row.balanceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
