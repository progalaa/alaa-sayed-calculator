# App roles

The app is a loan repayment calculator. It has no accounts and no log-in, so a
"role" here is a kind of person with a distinct situation and need, not a
permission level. Both roles use the same screen.

## Prospective Borrower

A Prospective Borrower is someone who has been offered a loan, or is shopping
for one (for example a car loan, a personal loan or a mortgage), and has not
signed yet. They usually know the amount they want, the rate they have been
quoted and the repayment period on offer, and the lender has typically
emphasised the monthly instalment.

They can enter a loan amount, an annual interest rate and a term in months, and
see the monthly payment together with the total interest and the total amount
paid over the life of the loan, plus a month-by-month breakdown of each
payment into interest and principal with the remaining balance. They can change
any input and calculate again to compare alternatives.

They must never see a monthly payment without the total interest and total
amount paid shown beside it, and they must never see a figure calculated from
input that failed validation or from input they have since changed.

## Existing Borrower

An Existing Borrower is someone who is already repaying a loan, knows their
current outstanding balance, their interest rate and how many monthly payments
remain, and has some money left over each month that they could pay on top of
the required instalment.

They can enter their outstanding balance, rate and remaining months to see how
much interest is still ahead of them, and enter an extra monthly amount to see
how many months sooner the loan would be paid off and how much interest they
would save.

They must never see a payoff time or an interest-saved figure calculated from
an invalid extra payment, and they must never see savings figures that do not
agree with the month-by-month breakdown shown beside them.

## How their needs differ

| | Prospective Borrower | Existing Borrower |
|---|---|---|
| Decision they face | Whether to sign, and which offer or term to choose | Whether to overpay a loan they already have |
| What they enter as "amount" and "term" | The amount offered and the full term offered | The balance outstanding today and the months remaining |
| Main question | "What does this loan really cost me in total?" | "What does paying more each month buy me?" |
| Biggest risk the app guards against | Judging the loan by the monthly instalment alone | Overestimating (or underestimating) the benefit of overpaying |
| Relies on the optional extra payment feature | No | Yes, for its main job (J-6); its other job (J-5) works without it |

The Prospective Borrower compares *alternative loans*; the Existing Borrower
compares *their one loan with and without overpaying*. The first needs total
cost next to the monthly figure; the second needs the difference between two
repayment plans on the same loan.
