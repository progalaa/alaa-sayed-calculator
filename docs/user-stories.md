# User stories

Roles are defined in [app-roles.md](app-roles.md) and jobs in
[jobs-to-be-done.md](jobs-to-be-done.md). A status changes to "Implemented"
only when every acceptance criterion of the story passes in the automated tests
and in the manual check.

**How the manual check was done.** The manual test script (one step per
acceptance criterion, 77 steps) was run as an automated browser script by the
AI assistant, not by hand, in Google Chrome 158.0.8127.38 (the installed
desktop app) and in WebKit 27.2 (Safari's engine, Playwright's build), at
1280 px and, for S-5.10, 375 px wide. All 77 steps passed in both. The product
owner agreed to count this run as the manual check. **Firefox was not tested**:
Playwright's Firefox build would not start on the test machine. Edge (which
uses the same engine as Chrome), the Safari app itself and real screen readers
were not used.

## Conventions used in the criteria

### Input limits

| Input | Allowed | Why |
|---|---|---|
| Loan amount | 100.00 to 10,000,000.00, at most 2 decimal places | Below 100.00 a schedule is dominated by one-cent rounding and nobody amortises such a loan. 10 million covers large mortgages while keeping every amount in cents far below the largest integer JavaScript stores exactly (about 9 × 10^15). |
| Annual interest rate | 0 to 30 %, at most 3 decimal places | 0 % is a real offer (for example retailer finance). 30 % covers mortgages, car loans, personal loans and most credit-card APRs; above that are payday-style products that are not repaid in equal monthly instalments. Three decimals because rates such as 6.875 % are common for mortgages. |
| Term | 1 to 480 months, whole number | One month is a valid single-payment loan. 480 months (40 years) is the longest common mortgage term. Payments are monthly, so a fraction of a month has no meaning. |
| Extra monthly payment (S-7, S-8 only) | Optional. 0.00 up to the loan amount, at most 2 decimal places | Paying more than the whole loan each month has no meaning. Empty means no extra payment. |

### Input format

A value is a number when, after removing leading and trailing spaces, it is
made only of digits with at most one decimal point (for example `25000`,
`25000.50`). A leading minus sign is recognised so that a negative value gets
the "cannot be negative" message. Commas, currency symbols, `%`, letters and
exponents such as `1e5` are not numbers. Trailing zeros after the decimal point
are ignored, so `100.000` is read as 100.00 and a term of `12.0` as 12, and `-0`
is read as 0.

### Validation messages

Each message appears directly next to the field it belongs to. The checks for
a field run in the order listed, and the field shows only the first message
that applies.

| Field | Condition | Exact message |
|---|---|---|
| Loan amount | empty | `Enter a loan amount.` |
| Loan amount | not a number | `Loan amount must be a number, without commas or symbols.` |
| Loan amount | negative | `Loan amount cannot be negative.` |
| Loan amount | more than 2 decimals | `Loan amount can have at most 2 decimal places.` |
| Loan amount | below 100.00 (including 0) | `Loan amount must be at least 100.00.` |
| Loan amount | above 10,000,000.00 | `Loan amount must be no more than 10,000,000.00.` |
| Interest rate | empty | `Enter an interest rate.` |
| Interest rate | not a number | `Interest rate must be a number, without commas or symbols.` |
| Interest rate | negative | `Interest rate cannot be negative.` |
| Interest rate | more than 3 decimals | `Interest rate can have at most 3 decimal places.` |
| Interest rate | above 30 | `Interest rate must be no more than 30%.` |
| Term | empty | `Enter a term in months.` |
| Term | not a number | `Term must be a number, without commas or symbols.` |
| Term | negative | `Term cannot be negative.` |
| Term | not a whole number | `Term must be a whole number of months.` |
| Term | 0 | `Term must be at least 1 month.` |
| Term | above 480 | `Term must be no more than 480 months.` |
| Extra monthly payment | not a number | `Extra payment must be a number, without commas or symbols.` |
| Extra monthly payment | negative | `Extra payment cannot be negative.` |
| Extra monthly payment | more than 2 decimals | `Extra payment can have at most 2 decimal places.` |
| Extra monthly payment | more than the loan amount | `Extra payment cannot be more than the loan amount.` |

### Calculation rules

- All money is held in whole cents.
- Monthly interest = remaining balance × annual rate ÷ 12, rounded to the
  nearest cent (half a cent rounds up).
- The regular monthly payment comes from the standard amortisation formula,
  rounded to the nearest cent. At 0 % it is amount ÷ term, rounded to the
  nearest cent.
- The final payment is the remaining balance plus that month's interest, so
  the balance ends at exactly 0.00. Because the regular payment is rounded, in
  rare cases (small amount, long term) the balance reaches zero before the
  last month and the schedule ends in that month (S-5.8), or the final payment
  is much larger than the others (S-5.9).
- Total interest and total amount paid are the sums of the schedule's columns.

### When results update

Results are worked out only when the user presses Calculate (or Enter in any
field). Changing any field removes the result and schedule at once, so an old
result is never shown next to changed inputs. Changing a field removes that
field's message only; other fields keep theirs until the next Calculate.

### Display

- Fields are labelled `Loan amount`, `Annual interest rate (%)`,
  `Term (months)` and, for S-7 and S-8, `Extra monthly payment (optional)`.
  The button is labelled `Calculate`.
- Amounts are shown with two decimals and comma thousands separators and no
  currency symbol, for example `10,789.54`, whatever the browser's language.
- "the base loan" below means: Loan amount `10000`, Annual interest rate `5`,
  Term `36`.

---

## S-1: See the monthly payment

**Job:** J-2 · **Status:** Implemented

As a Prospective Borrower, I want to see the monthly payment for a loan amount,
rate and term, so that I can check whether it fits my budget.

- **S-1.1** Given the empty form, when the user enters the base loan (`10000`,
  `5`, `36`) and presses Calculate, then `Monthly payment` shows `299.71`.
- **S-1.2** Given the empty form, when the user enters `12000`, `0`, `12` and
  presses Calculate, then `Monthly payment` shows `1,000.00` and no error,
  `NaN` or `Infinity` appears anywhere on the page. (0 % needs its own formula:
  payment = amount ÷ term.)
- **S-1.3** Given the empty form, when the user enters `1000`, `0`, `3` and
  presses Calculate, then `Monthly payment` shows `333.33`.
- **S-1.4** (smallest amount) Given the empty form, when the user enters `100`,
  `5`, `12` and presses Calculate, then `Monthly payment` shows `8.56`.
- **S-1.5** (largest amount) Given the empty form, when the user enters
  `10000000`, `5`, `360` and presses Calculate, then `Monthly payment` shows
  `53,682.16`.
- **S-1.6** (smallest non-zero rate) Given the empty form, when the user enters
  `10000`, `0.001`, `36` and presses Calculate, then `Monthly payment` shows
  `277.78`.
- **S-1.7** (largest rate) Given the empty form, when the user enters `10000`,
  `30`, `36` and presses Calculate, then `Monthly payment` shows `424.52`.
- **S-1.8** (shortest term) Given the empty form, when the user enters `1000`,
  `12`, `1` and presses Calculate, then `Monthly payment` shows `1,010.00`.
- **S-1.9** (longest term) Given the empty form, when the user enters `200000`,
  `5`, `480` and presses Calculate, then `Monthly payment` shows `964.39`.
- **S-1.10** (all inputs at their maximum) Given the empty form, when the user
  enters `10000000`, `30`, `480` and presses Calculate, then `Monthly payment`
  shows `250,001.78`.
- **S-1.11** (leading and trailing spaces) Given the empty form, when the user
  enters ` 10000 `, ` 5 `, ` 36 ` (with spaces) and presses Calculate, then
  `Monthly payment` shows `299.71`.
- **S-1.12** (keyboard only) Given the empty form, when the user moves between
  fields with Tab, types the base loan and presses Enter while in the Term
  field, then `Monthly payment` shows `299.71`.

## S-2: See the total cost next to the monthly payment

**Job:** J-1 · **Status:** Implemented

As a Prospective Borrower, I want to see the total interest and the total
amount paid next to the monthly payment, so that I judge the loan by its full
cost and not by the instalment alone.

- **S-2.1** Given the empty form, when the user enters the base loan and
  presses Calculate, then the result shows `Monthly payment` `299.71`,
  `Total interest` `789.54` and `Total amount paid` `10,789.54` together.
- **S-2.2** (0 %) Given the empty form, when the user enters `12000`, `0`,
  `12` and presses Calculate, then `Total interest` shows `0.00` and
  `Total amount paid` shows `12,000.00`.
- **S-2.3** (very small loan) Given the empty form, when the user enters `100`,
  `5`, `12` and presses Calculate, then `Total interest` shows `2.74` and
  `Total amount paid` shows `102.74`.
- **S-2.4** (very large loan) Given the empty form, when the user enters
  `10000000`, `30`, `480` and presses Calculate, then `Total interest` shows
  `110,004,592.05` and `Total amount paid` shows `120,004,592.05`.
- **S-2.5** Given any result is shown, then `Total interest` equals the sum of
  the Interest column of the schedule, `Total amount paid` equals the sum of
  the Payment column, and `Total amount paid` equals the loan amount plus
  `Total interest` exactly. (Checked on the base loan: 789.54 and 10,789.54.)
- **S-2.6** Given any input, when a `Monthly payment` is visible, then
  `Total interest` and `Total amount paid` are visible too.

## S-3: Be told clearly when an input cannot be used

**Jobs:** J-1, J-2 · **Status:** Implemented

As a Prospective Borrower, I want a clear message next to any input the
calculator cannot use, so that I never act on a figure worked out from a
mistake.

Unless stated otherwise, the other two fields hold valid base-loan values
(`10000`, `5`, `36`) and the user presses Calculate. In every criterion of this
story the message appears next to the named field, no result and no schedule
are shown, and neither `NaN` nor `Infinity` appears anywhere on the page.

- **S-3.1** Given Loan amount is empty, then `Enter a loan amount.` appears.
- **S-3.2** Given Loan amount is `abc`, then
  `Loan amount must be a number, without commas or symbols.` appears.
- **S-3.3** Given Loan amount is `25,000`, then
  `Loan amount must be a number, without commas or symbols.` appears.
- **S-3.4** Given Loan amount is `-5000`, then
  `Loan amount cannot be negative.` appears.
- **S-3.5** Given Loan amount is `0`, then
  `Loan amount must be at least 100.00.` appears.
- **S-3.6** (just below minimum) Given Loan amount is `99.99`, then
  `Loan amount must be at least 100.00.` appears.
- **S-3.7** (just above maximum) Given Loan amount is `10000000.01`, then
  `Loan amount must be no more than 10,000,000.00.` appears.
- **S-3.8** Given Loan amount is `100.005`, then
  `Loan amount can have at most 2 decimal places.` appears.
- **S-3.9** Given Annual interest rate is empty, then
  `Enter an interest rate.` appears.
- **S-3.10** Given Annual interest rate is `5%`, then
  `Interest rate must be a number, without commas or symbols.` appears.
- **S-3.11** Given Annual interest rate is `-1`, then
  `Interest rate cannot be negative.` appears.
- **S-3.12** (just above maximum) Given Annual interest rate is `30.001`, then
  `Interest rate must be no more than 30%.` appears.
- **S-3.13** Given Annual interest rate is `5.1234`, then
  `Interest rate can have at most 3 decimal places.` appears.
- **S-3.14** Given Term is empty, then `Enter a term in months.` appears.
- **S-3.15** Given Term is `three`, then
  `Term must be a number, without commas or symbols.` appears.
- **S-3.16** Given Term is `-12`, then `Term cannot be negative.` appears.
- **S-3.17** Given Term is `0`, then `Term must be at least 1 month.` appears.
- **S-3.18** Given Term is `12.5`, then
  `Term must be a whole number of months.` appears.
- **S-3.19** (just above maximum) Given Term is `481`, then
  `Term must be no more than 480 months.` appears.
- **S-3.20** Given all three fields are empty, when the user presses Calculate,
  then all three "Enter ..." messages appear, each next to its own field, and
  keyboard focus moves to the Loan amount field.
- **S-3.21** Given any message from S-3.1 to S-3.19 is shown, then a screen
  reader announces it as the description of its field (the message is
  programmatically linked to the input).

## S-4: Change inputs and compare

**Job:** J-3 · **Status:** Implemented

As a Prospective Borrower, I want to change any input and calculate again, so
that I can compare how the amount, rate and term change the monthly payment
and the total cost.

- **S-4.1** Given the result for the base loan is shown, when the user changes
  Term to `48`, then the previous result and schedule disappear immediately and
  nothing is shown until the user presses Calculate again.
- **S-4.2** Given the situation in S-4.1, when the user presses Calculate,
  then `Monthly payment` shows `230.29`, `Total interest` `1,054.11` and
  `Total amount paid` `11,054.11`.
- **S-4.3** Given the result for the base loan is shown, when the user changes
  Annual interest rate to `6` and presses Calculate, then `Monthly payment`
  shows `304.22`, `Total interest` `951.88` and `Total amount paid`
  `10,951.88`.
- **S-4.4** Given the result for the base loan is shown, when the user changes
  Loan amount to `abc` and presses Calculate, then
  `Loan amount must be a number, without commas or symbols.` appears and no
  result (old or new) is shown.
- **S-4.5** Given `Loan amount cannot be negative.` is shown for `-5000`, when
  the user changes Loan amount to `10000`, then the message disappears at once.
- **S-4.6** Given the situation in S-4.5, when the user presses Calculate, then
  `Monthly payment` shows `299.71`.
- **S-4.7** Given messages are shown for both Loan amount (empty) and Term
  (empty), when the user types `10000` into Loan amount, then the Loan amount
  message disappears and the Term message stays.

## S-5: See the month-by-month schedule

**Job:** J-4 · **Status:** Implemented

As a Prospective Borrower, I want to see each month's payment split into
interest and principal with the balance remaining, so that I understand how
the debt goes down over time.

- **S-5.1** Given the empty form, when the user enters the base loan and
  presses Calculate, then a table appears with the columns `Month`, `Payment`,
  `Interest`, `Principal`, `Remaining balance` and 36 rows numbered 1 to 36.
- **S-5.2** Given the schedule for the base loan, then row 1 reads
  `1 | 299.71 | 41.67 | 258.04 | 9,741.96`.
- **S-5.3** Given the schedule for the base loan, then row 36 (the final
  payment, adjusted so the balance ends at zero) reads
  `36 | 299.69 | 1.24 | 298.45 | 0.00`.
- **S-5.4** Given any schedule, then in every row Payment = Interest +
  Principal, and Remaining balance = the previous row's Remaining balance (or
  the loan amount, for row 1) − Principal.
- **S-5.5** Given any schedule, then the sum of the Principal column equals the
  loan amount exactly. (Base loan: 10,000.00.)
- **S-5.6** (0 %) Given the empty form, when the user enters `1000`, `0`, `3`
  and presses Calculate, then the rows read
  `1 | 333.33 | 0.00 | 333.33 | 666.67`,
  `2 | 333.33 | 0.00 | 333.33 | 333.34` and
  `3 | 333.34 | 0.00 | 333.34 | 0.00`.
- **S-5.7** (longest term) Given the empty form, when the user enters
  `200000`, `5`, `480` and presses Calculate, then the table has 480 rows and
  row 480 reads `480 | 969.69 | 4.02 | 965.67 | 0.00`.
- **S-5.8** (rounding clears the loan early) Given the empty form, when the
  user enters `100`, `0`, `480` and presses Calculate, then `Monthly payment`
  shows `0.21`, the table has 477 rows, and row 477 reads
  `477 | 0.04 | 0.00 | 0.04 | 0.00`.
- **S-5.9** (rounding leaves almost all principal to the end) Given the empty
  form, when the user enters `100`, `30`, `480` and presses Calculate, then
  `Monthly payment` shows `2.50`, rows 1 to 479 show Principal `0.00` and
  Remaining balance `100.00`, row 480 reads
  `480 | 102.50 | 2.50 | 100.00 | 0.00`, and `Total interest` shows
  `1,200.00`.
- **S-5.10** (phone width, manual check) Given a browser window 375 pixels
  wide, when the schedule for the base loan is shown, then the whole page can
  be read without horizontal scrolling of the page; only the table scrolls
  sideways inside its own area.

## S-6: See the interest still to pay on an existing loan

**Job:** J-5 · **Status:** Implemented

As an Existing Borrower, I want to enter my outstanding balance, rate and
remaining months, so that I can see how much interest is still ahead of me.

- **S-6.1** Given the empty form, when the user enters `150000`, `6.5`, `240`
  and presses Calculate, then `Monthly payment` shows `1,118.36`,
  `Total interest` shows `118,406.09` and `Total amount paid` shows
  `268,406.09`.
- **S-6.2** Given the empty form, then the text
  `For a loan you already have, enter the balance still owed.` appears under
  the Loan amount field and the text
  `For a loan you already have, enter the months remaining.` appears under the
  Term (months) field.

## S-7: See how much sooner an extra monthly payment clears the loan

**Job:** J-6 · **Status:** Implemented

As an Existing Borrower, I want to enter an extra amount I would pay each month
and see the new payoff time, so that I know how much sooner I would be
debt-free.

The extra amount is paid every month from month 1 on top of the regular
monthly payment. With an extra payment, the schedule and the totals show the
plan with the extra payment.

- **S-7.1** Given the base loan, when the user enters Extra monthly payment
  `100` and presses Calculate, then the result shows
  `Paid off in 27 months (9 months sooner)`.
- **S-7.2** Given `150000`, `6.5`, `240`, when the user enters Extra monthly
  payment `300` and presses Calculate, then the result shows
  `Paid off in 158 months (82 months sooner)`.
- **S-7.3** Given the base loan with Extra monthly payment left empty, when the
  user presses Calculate, then the result is the same as in S-2.1 and no
  `Paid off in` or `Interest saved` line is shown.
- **S-7.4** Given the base loan with Extra monthly payment `0`, when the user
  presses Calculate, then the result is the same as in S-7.3.
- **S-7.5** (smallest extra) Given the base loan, when the user enters Extra
  monthly payment `0.01` and presses Calculate, then the result shows
  `Paid off in 36 months (0 months sooner)`.
- **S-7.6** (largest extra) Given the base loan, when the user enters Extra
  monthly payment `10000` and presses Calculate, then the result shows
  `Paid off in 1 month (35 months sooner)`.
- **S-7.7** (just above maximum) Given the base loan, when the user enters
  Extra monthly payment `10000.01` and presses Calculate, then
  `Extra payment cannot be more than the loan amount.` appears next to that
  field and no result is shown.
- **S-7.8** Given the base loan, when the user enters Extra monthly payment
  `-50` and presses Calculate, then `Extra payment cannot be negative.` appears
  next to that field and no result is shown.
- **S-7.9** Given the base loan, when the user enters Extra monthly payment
  `abc` and presses Calculate, then
  `Extra payment must be a number, without commas or symbols.` appears next to
  that field and no result is shown.
- **S-7.10** Given the base loan, when the user enters Extra monthly payment
  `10.005` and presses Calculate, then
  `Extra payment can have at most 2 decimal places.` appears next to that field
  and no result is shown.
- **S-7.11** Given the base loan with Extra monthly payment `100`, when the user
  presses Calculate, then the schedule has 27 rows, row 1 reads
  `1 | 399.71 | 41.67 | 358.04 | 9,641.96`, row 27 reads
  `27 | 190.25 | 0.79 | 189.46 | 0.00`, `Total interest` shows `582.71` and
  `Total amount paid` shows `10,582.71`.
- **S-7.12** Given the result of S-7.1 is shown, when the user changes Extra
  monthly payment to `200`, then the previous result disappears until the user
  presses Calculate again.
- **S-7.13** Given the message of S-7.8 is shown, when the user changes Extra
  monthly payment to `100`, then the message disappears, and when the user
  presses Calculate the result of S-7.1 is shown.

## S-8: See how much interest an extra monthly payment saves

**Job:** J-6 · **Status:** Implemented

As an Existing Borrower, I want to see how much interest an extra monthly
payment would save, so that I can decide whether overpaying is worth it.

- **S-8.1** Given the base loan, when the user enters Extra monthly payment
  `100` and presses Calculate, then the result shows
  `Interest saved: 206.83 (789.54 without the extra payment)`.
- **S-8.2** Given `150000`, `6.5`, `240`, when the user enters Extra monthly
  payment `300` and presses Calculate, then the result shows
  `Interest saved: 45,069.87 (118,406.09 without the extra payment)`.
- **S-8.3** (smallest extra) Given the base loan, when the user enters Extra
  monthly payment `0.01` and presses Calculate, then the result shows
  `Interest saved: 0.03 (789.54 without the extra payment)`.
- **S-8.4** (largest extra) Given the base loan, when the user enters Extra
  monthly payment `10000` and presses Calculate, then the result shows
  `Interest saved: 747.87 (789.54 without the extra payment)`.
- **S-8.5** (0 %) Given `12000`, `0`, `12`, when the user enters Extra monthly
  payment `1000` and presses Calculate, then the result shows
  `Paid off in 6 months (6 months sooner)` and
  `Interest saved: 0.00 (0.00 without the extra payment)`.
- **S-8.6** Given any result with an extra payment, then Interest saved equals
  the total interest without the extra payment minus the `Total interest`
  shown (the sum of the with-extra schedule). (S-8.1: 789.54 − 582.71 =
  206.83.)

---

## Next stories (not built)

These are what we would build next. Each serves an existing job. Their
criteria use figures from the same calculation rules as above.

## S-9: Compare two loan options side by side

**Job:** J-3 · **Status:** Not implemented

As a Prospective Borrower, I want to see two loan options side by side, so
that I can compare the monthly payment and the total cost without writing the
first result down.

- **S-9.1** Given option A is the base loan (`10000`, `5`, `36`) and option B
  is `10000`, `5`, `48`, when the user presses Calculate, then option A shows
  `299.71`, `789.54` and `10,789.54` and option B shows `230.29`, `1,054.11`
  and `11,054.11` next to each other.
- **S-9.2** Given the result of S-9.1, then the comparison shows that option B
  costs `264.57` more in total interest and `69.42` less per month.

## S-10: See the effect of a one-off lump-sum payment

**Job:** J-6 · **Status:** Not implemented

As an Existing Borrower, I want to see what a single extra payment in a chosen
month would change, so that I can decide whether to put a bonus or a windfall
towards the loan.

- **S-10.1** Given the base loan, when the user enters a lump sum of `2000` in
  month `12` and presses Calculate, then the result shows
  `Paid off in 29 months (7 months sooner)` and
  `Interest saved: 181.02 (789.54 without the extra payment)`.

## S-11: Find the months remaining from the payment I actually make

**Job:** J-5 · **Status:** Not implemented

As an Existing Borrower, I want to enter the monthly payment my lender
actually charges instead of the months remaining, so that I can see how long I
have left and how much interest is still ahead of me.

- **S-11.1** Given a balance of `150000` at `6.5` %, when the user enters a
  monthly payment of `1200` and presses Calculate, then the result shows
  `210` months remaining, a final payment of `296.70` and total interest of
  `101,096.70`.
- **S-11.2** Given a balance of `150000` at `6.5` %, when the user enters a
  monthly payment of `812.50` or less, then the message
  `This payment does not cover the monthly interest of 812.50, so the loan would never be repaid.`
  appears next to the payment field and no result is shown.

