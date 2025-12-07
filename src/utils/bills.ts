export function computeMinimumForBills(
  pending: number,
  openingBalance: number,
  monthlyNet: number,
) {
  const cashForBills = openingBalance + monthlyNet;
  const minimumForBills = Math.max(pending - cashForBills, 0);
  return { cashForBills, minimumForBills };
}

export default computeMinimumForBills;
