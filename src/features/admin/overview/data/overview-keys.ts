/**
 * Overview domain query-key factory.
 *
 * Overview is a single aggregated store-scoped snapshot today. A reporting-date
 * input can be added to the summary key when Overview reads migrate onto the
 * query boundary under an authenticated store context.
 */
export const overviewKeys = {
  all: ["overview"] as const,
  summary: () => [...overviewKeys.all, "summary"] as const,
};
