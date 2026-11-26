# Loan repayment calculator

A small web app that shows what a loan really costs. You enter a loan amount,
an annual interest rate and a term in months. It shows the monthly payment
**together with** the total interest and the total amount paid, plus a
month-by-month schedule of each payment split into interest and principal with
the balance remaining. An optional extra monthly payment shows how much sooner
the loan is paid off and how much interest that saves.

## Who it is for, and why I chose it

I have worked in fintech. The most common mistake I saw people make with loans
was judging them by the monthly instalment alone, without seeing the total
interest. This app puts the full cost next to the monthly figure, every time.

It serves two kinds of people (see [docs/app-roles.md](docs/app-roles.md)):

- **Prospective Borrowers**, who have not signed yet and want to know whether a
  loan is affordable and what it really costs.
- **Existing Borrowers**, who enter the balance they still owe and the months
  remaining, to see the interest still ahead of them and what paying extra
  each month would change.

## Prerequisites

- [Node.js](https://nodejs.org/) **20.19 or later** (npm comes with it).
  Checked with Node.js 20.20.2 (npm 10.8.2) and Node.js 24.22.3 (npm 11.19.1).
- A current browser. See [Browser testing](#browser-testing) for which ones
  were checked.

No accounts, API keys or cloud services are needed, and the app makes no
network calls while it runs.

## Install and start

From this folder:

```
npm install
npm start
```

`npm start` starts a local server and tries to open http://localhost:5173 in
your browser. If the browser does not open, go to the `Local:` address printed
in the terminal yourself. If port 5173 is already in use, the server picks the
next free port (for example 5174) and prints that address instead. Stop the
server with Ctrl+C.

`npm install` may print warnings that are harmless here:
`npm warn deprecated whatwg-encoding@3.1.1` comes from jsdom, which only the
tests use. With npm 11, a note that `esbuild` has install scripts "not yet
covered by allowScripts" may also appear; the app still starts and builds
without approving them (checked with npm 11.19.1).

## Run the tests

```
npm test
```

This runs 140 automated tests (Vitest, React Testing Library, jsdom). Every
test name starts with the acceptance criterion it proves, for example
`S-3.4 shows "Loan amount cannot be negative." ...`. To type-check and build a
production copy into `dist/`, run `npm run build`.

## Browser testing

The manual test script (one step per acceptance criterion, 77 steps) was run
as an automated browser script by the AI assistant, not by hand. All 77 steps
passed in:

- **Google Chrome 158.0.8127.38**, the desktop app installed on the test Mac,
  driven by Playwright
- **WebKit 27.2** (Safari's engine, Playwright's build; not the Safari app)

**Firefox was not tested**: Playwright's Firefox build would not start on the
test machine. Edge (which uses the same engine as Chrome), the Safari app
itself and real screen readers were not used. The product owner agreed to
count the automated run as the manual check.

## How it was built

- **AI tool:** Claude Code (Anthropic's command-line coding assistant).
- **Model:** Claude Opus 5.5, model ID `claude-opus-5-5[1m]` (1M-token context).
- **Code changed by hand:** None.
- **Stack:** Vite 7, React 19, TypeScript 5.9, Vitest 4, React Testing Library 16.

All calculations are pure functions in `src/lib/` with no UI code
(`loan.ts`, `validation.ts`, `format.ts`). The UI is `src/App.tsx` and
`src/ScheduleTable.tsx`.

## Assumptions

1. Amounts are shown with two decimals and comma thousands separators, with no
   currency symbol (for example `10,789.54`), in the same format whatever the
   browser's language.
2. Money is calculated in whole cents. Interest is charged monthly at the annual
   rate ÷ 12. Each month's interest is rounded to the nearest cent, and half a
   cent rounds up.
3. The monthly payment comes from the standard amortisation formula, rounded to
   the nearest cent (amount ÷ term at 0 %). The final payment is the remaining
   balance plus that month's interest, so the balance ends at exactly 0.00.
   Total interest and total paid are the sums of the schedule rows.
4. Because the payment is rounded, in rare cases with a small amount and a long
   term the balance reaches zero before the last month and the schedule ends
   there, or the final payment is much larger than the others. For example,
   100.00 at 0 % over 480 months is paid off in 477 months.
5. Input limits: loan amount 100.00 to 10,000,000.00, rate 0 to 30 %
   (up to 3 decimals), term 1 to 480 whole months, extra payment 0 up to the
   loan amount. The reasons are in [docs/user-stories.md](docs/user-stories.md).
6. A number is digits with at most one decimal point. Commas, currency symbols,
   `%` and letters are rejected with a message. Leading and trailing spaces are
   ignored. Trailing zeros after the point are ignored (`100.000` is 100.00, a
   term of `12.0` is 12), and `-0` is read as 0.
7. Results appear only when Calculate (or Enter) is pressed. Changing any field
   removes the result at once, and removes that field's own message only. If
   the extra payment is more than the loan amount and only the loan amount is
   then changed, the extra payment's message stays until Calculate is pressed
   again.
8. An empty extra payment means no extra payment. An extra payment is made every
   month from month 1 on top of the regular payment. With an extra payment, the
   totals and the schedule show the plan with the extra payment, and the
   interest without it is shown in the "Interest saved" line.
9. An Existing Borrower enters the balance still owed as the loan amount and the
   months remaining as the term.
10. Figures are estimates under these rules. A lender's own figures may differ
    by a few cents because of its own rounding, fees or day-count method.

## Product documents

- [docs/app-roles.md](docs/app-roles.md): who uses the app and how their needs
  differ
- [docs/jobs-to-be-done.md](docs/jobs-to-be-done.md): what those people need to
  get done
- [docs/user-stories.md](docs/user-stories.md): stories, acceptance criteria and
  status

The full session transcript goes in `transcripts/session-01.md`.
