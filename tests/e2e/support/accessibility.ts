import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "playwright/test";

export type AxeAuditContext = {
  route: string;
  surface: string;
  exclusions?: readonly string[];
};

export type RequiredAxeViolation = {
  route: string;
  surface: string;
  selector: string;
  rule: string;
  impact: string;
  helpUrl: string;
};

export async function settleAccessibleSurface(page: Page) {
  await page.locator("body").waitFor({ state: "visible" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((image) =>
        image.complete ? Promise.resolve() : image.decode().catch(() => undefined),
      ),
    );
  });
}

export async function expectNoRequiredAxeViolations(
  page: Page,
  context: AxeAuditContext,
): Promise<RequiredAxeViolation[]> {
  await settleAccessibleSurface(page);
  let builder = new AxeBuilder({ page });
  for (const selector of context.exclusions ?? []) builder = builder.exclude(selector);

  const results = await builder.analyze();
  const violations = results.violations
    .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
    .flatMap((violation) =>
      violation.nodes.map((node) => ({
        route: context.route,
        surface: context.surface,
        selector: node.target.join(" "),
        rule: violation.id,
        impact: violation.impact ?? "unknown",
        helpUrl: violation.helpUrl,
      })),
    );

  expect(
    violations,
    violations
      .map(
        (violation) =>
          `${violation.surface} ${violation.route} ${violation.rule} (${violation.impact}) ${violation.selector} ${violation.helpUrl}`,
      )
      .join("\n"),
  ).toEqual([]);
  return violations;
}
