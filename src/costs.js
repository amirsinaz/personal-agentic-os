function confirmedPrice(record, priceBook) {
  return priceBook
    .filter((price) =>
      price.source === "user-confirmed" &&
      price.provider === record.provider &&
      price.model === record.model &&
      Date.parse(price.effectiveFrom) <= Date.parse(record.timestamp),
    )
    .sort((left, right) => Date.parse(right.effectiveFrom) - Date.parse(left.effectiveFrom))[0];
}

function meteredCost(record, price) {
  if (!price || record.measurement !== "actual") return null;
  const input = record.inputTokens;
  const cached = record.cachedInputTokens ?? 0;
  const output = record.outputTokens;
  if (![input, cached, output].every((value) => Number.isInteger(value) && value >= 0) || cached > input) return null;
  const cost = ((input - cached) / 1_000_000) * price.inputPerMillion
    + (cached / 1_000_000) * price.cachedInputPerMillion
    + (output / 1_000_000) * price.outputPerMillion;
  return Number(cost.toFixed(8));
}

function calculateMetered(usageRecords, priceBook) {
  if (!usageRecords.length) return { measurement: "unavailable", currency: null, unavailableRecords: 0 };
  const calculated = usageRecords.map((record) => {
    const price = confirmedPrice(record, priceBook);
    return { record, price, cost: meteredCost(record, price) };
  });
  const unavailableRecords = calculated.filter((item) => item.cost === null).length;
  const currencies = new Set(calculated.flatMap((item) => item.price?.currency ? [item.price.currency] : []));
  if (unavailableRecords || currencies.size !== 1) {
    return { measurement: "unavailable", currency: null, unavailableRecords };
  }

  const byProjectMap = new Map();
  for (const item of calculated) {
    const project = item.record.project ?? "Unassigned";
    byProjectMap.set(project, (byProjectMap.get(project) ?? 0) + item.cost);
  }
  const byProject = Array.from(byProjectMap, ([project, total]) => ({ project, total: Number(total.toFixed(8)) }))
    .sort((left, right) => right.total - left.total || left.project.localeCompare(right.project));
  return {
    measurement: "actual",
    currency: [...currencies][0],
    total: Number(calculated.reduce((sum, item) => sum + item.cost, 0).toFixed(8)),
    byProject,
  };
}

function calculateSubscriptions(subscriptions) {
  const items = subscriptions
    .filter((item) => item.confirmed === true && Number.isFinite(item.monthlyAmount) && item.monthlyAmount > 0)
    .map(({ provider, monthlyAmount, currency }) => ({ provider, monthlyAmount, currency }));
  const currencies = new Set(items.map((item) => item.currency));
  if (!items.length || currencies.size !== 1) {
    return { measurement: "unavailable", currency: null, monthlyTotal: null, items: [] };
  }
  return {
    measurement: "actual",
    currency: [...currencies][0],
    monthlyTotal: Number(items.reduce((sum, item) => sum + item.monthlyAmount, 0).toFixed(8)),
    items: items.map(({ provider, monthlyAmount }) => ({ provider, monthlyAmount })),
  };
}

export function calculateCosts({ usageRecords, priceBook, subscriptions }) {
  return {
    metered: calculateMetered(usageRecords, priceBook),
    subscriptions: calculateSubscriptions(subscriptions),
  };
}

export function compareCostPeriods({current=[],previous=[],priceBook=[]}){
  const currentCost=calculateMetered(current,priceBook);
  const previousCost=calculateMetered(previous,priceBook);
  if(currentCost.measurement!=="actual"||previousCost.measurement!=="actual"||currentCost.currency!==previousCost.currency||previousCost.total===0){
    return {measurement:"unavailable",causalSaving:"unavailable"};
  }
  const change=Number((currentCost.total-previousCost.total).toFixed(8));
  return {measurement:"actual",currency:currentCost.currency,current:currentCost.total,previous:previousCost.total,change,changePercent:Number(((change/previousCost.total)*100).toFixed(2)),causalSaving:"unavailable"};
}

function unavailableBudget(budget) {
  return {
    scope: budget?.scope ?? "all",
    ...(budget?.scope === "project" ? { project: budget.project } : {}),
    measurement: "unavailable",
  };
}

export function calculateBudgetStatus({ usageRecords = [], priceBook = [], budgets = [], asOf }) {
  const now = new Date(asOf);
  if (Number.isNaN(now.getTime())) return budgets.map(unavailableBudget);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const elapsedDays = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return budgets.map((budget) => {
    if (budget.confirmed !== true || !Number.isFinite(budget.monthlyAmount) || budget.monthlyAmount <= 0 || !budget.currency) {
      return unavailableBudget(budget);
    }
    const records = usageRecords.filter((record) => {
      const timestamp = new Date(record.timestamp);
      const inMonth = timestamp.getUTCFullYear() === year && timestamp.getUTCMonth() === month;
      const inScope = budget.scope !== "project" || record.project === budget.project;
      return inMonth && inScope;
    });
    const metered = calculateMetered(records, priceBook);
    if (metered.measurement !== "actual" || metered.currency !== budget.currency) return unavailableBudget(budget);

    const actualSpend = metered.total;
    const forecast = Number(((actualSpend / elapsedDays) * daysInMonth).toFixed(8));
    const result = {
      scope: budget.scope,
      ...(budget.scope === "project" ? { project: budget.project } : {}),
      measurement: "actual",
      currency: budget.currency,
      budget: budget.monthlyAmount,
      actualSpend,
      usedPercent: Number(((actualSpend / budget.monthlyAmount) * 100).toFixed(2)),
      forecast,
      forecastMeasurement: "estimated",
      status: actualSpend > budget.monthlyAmount
        ? "over-budget"
        : forecast > budget.monthlyAmount ? "forecast-over-budget" : "on-track",
    };
    return result;
  });
}
