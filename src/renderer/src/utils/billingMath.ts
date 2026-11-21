export interface UnpaidBreakdownInput {
  liters: number;
  rate: number;
  bill: number;
  carry: number;
  alreadyPaid: number;
}

export interface UnpaidBreakdownResult {
  liters: number;
  bill: number;
  carry: number;
  received: number;
  totalBill: number;
  payable: number;
}

/**
 * Computes the net unpaid breakdown (FIFO: previous balance settled first, then milk bill).
 * If nothing has been paid yet, or if the entire account is already settled (payable <= 0),
 * returns the full figures so settled bills/receipts still show complete history.
 * When a partial/previous payment already cleared earlier dues and new milk is added,
 * returns ONLY the unpaid portion so already-paid items are not shown again.
 */
export function computeNetUnpaidBreakdown({
  liters,
  rate,
  bill,
  carry,
  alreadyPaid,
}: UnpaidBreakdownInput): UnpaidBreakdownResult {
  const safeLiters = Number(liters) || 0;
  const safeRate = Number(rate) || 0;
  const safeBill = Number(bill) || 0;
  const safeCarry = Number(carry) || 0;
  const safePaid = Math.max(0, Number(alreadyPaid) || 0);

  const grossTotal = safeBill + safeCarry;
  const netPayable = Math.max(0, grossTotal - safePaid);

  // If nothing paid yet OR everything is fully settled, return full amounts
  if (safePaid <= 0 || netPayable <= 0) {
    return {
      liters: safeLiters,
      bill: safeBill,
      carry: safeCarry,
      received: safePaid,
      totalBill: grossTotal,
      payable: netPayable,
    };
  }

  // FIFO settlement: alreadyPaid clears positive carry first, then current month's milk bill
  const netCarry = safeCarry > 0 ? Math.max(0, safeCarry - safePaid) : safeCarry;
  const creditAfterCarry = Math.max(0, safePaid - Math.max(0, safeCarry));
  const netBill = Math.max(0, safeBill - creditAfterCarry);
  const netLiters =
    safeRate > 0 ? Math.round((netBill / safeRate) * 100) / 100 : safeLiters;

  return {
    liters: netLiters,
    bill: Math.round(netBill),
    carry: Math.round(netCarry),
    received: 0,
    totalBill: Math.round(netBill + netCarry),
    payable: Math.round(netPayable),
  };
}
