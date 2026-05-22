export function calcRequiredExpenses(d) {
  return (d.fixedExpenses || 0) + (d.subscriptions || 0) + (d.payLater || 0) + (d.foodPerDay || 0) * 30 + (d.transport || 0) + (d.otherExpenses || 0);
}

export function calcExpectedLeftover(income, req) {
  return income - req;
}

export function calcSafeDailyLimit(leftover, days = 30) {
  return Math.floor((leftover * 0.6) / days);
}

export function calcHealthScore(income, req, leftover) {
  const lr = leftover / income;
  const er = req / income;
  let s = 50;
  if (lr >= 0.2) s += 20; else if (lr >= 0.1) s += 10; else s -= 5;
  if (er < 0.7) s += 15; else if (er < 0.85) s += 5; else s -= 10;
  if (leftover > 500) s += 15; else if (leftover > 200) s += 5;
  return Math.min(100, Math.max(0, s));
}
