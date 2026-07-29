export const accountReviewKeys = {
  all: ["account", "reviews"] as const,
  detail: (reviewId: string) => [...accountReviewKeys.all, reviewId.trim()] as const,
};
