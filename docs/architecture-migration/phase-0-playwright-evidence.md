# Phase 0 Playwright and Runtime Evidence

**Phase:** 0 — Freeze and record current behaviour  
**Result:** Complete with observed baseline discrepancies recorded  
**Execution date:** July 24, 2026  
**Target:** `https://laitstyles.vercel.app/`

## 1. Why an external runner was used

GitHub-hosted jobs in the private `relvorlabs/laitstyles` repository were rejected before checkout because of the repository/account billing state. The failed jobs contained no executed steps or usable job logs, so they were not Playwright failures and were not accepted as validation evidence.

A temporary workflow was run from the public `relvorlabs/agent-controller` repository instead. Public-repository GitHub Actions supplied the runner without using the blocked private-repository billing path.

Safety boundary:

- the external runner did not checkout, copy, archive, print, or expose the private Laitstyles repository;
- it exercised only the public Laitstyles deployment;
- it used an isolated Playwright workspace generated during the job;
- it uploaded browser evidence as a GitHub Actions artifact.

Temporary runner PR:

- `relvorlabs/agent-controller#1`
- branch: `agent/laitstyles-phase0-playwright-runner`
- workflow: `.github/workflows/laitstyles-phase0-playwright.yml`

## 2. Successful execution

| Evidence | Value |
| --- | --- |
| Workflow run | `relvorlabs/agent-controller` run `30099471635` |
| Workflow result | Success |
| Playwright result | 15 passed, 0 failed, 0 skipped, 0 errors |
| Duration reported by JUnit | 122.352 seconds |
| Playwright | `1.61.1` |
| Browser | Chromium |
| Desktop viewport | `1280 x 800` |
| Tablet viewport | `768 x 1024` |
| Mobile viewport | `375 x 812` |
| Themes | Light and dark |
| Artifact ID | `8599046423` |
| Artifact name | `laitstyles-phase0-playwright-30099471635` |
| Artifact size | `298,990,986` bytes |
| Artifact digest | `sha256:26ccedc1296d92480be077a327f1b9a0fbe813e5bbd663cd8266f101f7ffa6c3` |
| Artifact expiry | August 23, 2026 |

Run URL:

```text
https://github.com/relvorlabs/agent-controller/actions/runs/30099471635
```

## 3. Test matrix

Five characterization tests ran in each of the three viewport projects:

1. homepage light-theme contract;
2. homepage dark-theme contract;
3. storefront product interaction;
4. runtime route and redirect manifest;
5. unauthenticated admin boundary.

Total: `5 tests x 3 projects = 15 passing tests`.

## 4. Artifact contents

The uploaded artifact contains:

- Playwright HTML report;
- JSON result report;
- JUnit report;
- Playwright traces for every test;
- retained test screenshots;
- full-page homepage screenshots;
- viewport homepage screenshots;
- desktop, tablet, and mobile evidence;
- light and dark theme evidence;
- product-interaction screenshots and JSON records;
- admin-boundary screenshots and JSON records;
- route and redirect manifests for all three viewport projects;
- homepage link inventories;
- console, page-error, and failed-request inventories;
- deployment probe and evidence README.

## 5. Homepage runtime baseline

Across desktop, tablet, and mobile in both light and dark themes:

- the homepage returned a non-5xx response;
- the expected Laitstyles content rendered;
- lazy/scroll-activated sections were traversed before full-page capture;
- viewport and full-page screenshots were generated;
- captured console errors: `0`;
- captured uncaught page errors: `0`;
- captured failed network requests: `0`.

This is a baseline capture, not a visual-diff comparison. The screenshots preserve current behaviour so later architecture phases can detect unintended changes.

## 6. Product interaction baseline

The first discovered product link was:

```text
/products/archive-varsity-jacket
```

At all three viewports, clicking it produced:

```text
interactionMode: in-place-product-view
beforeUrl: /
afterUrl: /
```

The current homepage product interaction therefore opens an in-place product view/quick-view rather than changing the browser URL. Later phases must preserve this behaviour unless a separate product decision explicitly changes it.

## 7. Admin access baseline

At desktop, tablet, and mobile:

- navigating to `/admin` did not produce a server error;
- the unauthenticated request resolved to `/auth/sign-in?next=/admin`;
- the recorded access mode was `redirected-to-auth`;
- an admin-boundary screenshot was captured for each viewport.

Authenticated admin tables, forms, inventory editing, and destructive operations were not executed because no credentials were introduced into the public external runner. This is a deliberate security limitation, not a claimed pass for authenticated workflows.

## 8. Runtime route and redirect manifest

The runner generated a machine-produced manifest at every viewport. Results were consistent across desktop, tablet, and mobile.

### Observed working routes

| Requested route | Observed result |
| --- | --- |
| `/` | `200` |
| `/products` | `200` |
| `/products/archive-varsity-jacket` | `200` |
| `/cart` | `200` |
| `/checkout` | `200` |
| `/order-confirmation` | `200` |
| `/account` | `200` |
| `/auth/sign-in` | Resolves to `/?auth=signin&next=%2Faccount` |
| `/auth/error` | `200` |
| `/admin` | Resolves to `/auth/sign-in?next=/admin` |
| `/admin/inventory` | Resolves to `/auth/sign-in?next=/admin` |
| `/admin/orders` | Resolves to `/auth/sign-in?next=/admin` |
| `/admin/holds` | Resolves to `/auth/sign-in?next=/admin` |
| `/admin/returns` | Resolves to `/auth/sign-in?next=/admin` |
| `/admin/customers` | Resolves to `/auth/sign-in?next=/admin` |
| `/admin/settings` | Resolves to `/auth/sign-in?next=/admin` |

### Observed deployment 404s

The public deployment returned `404` for:

- `/account/orders`;
- `/account/orders/detail`;
- `/account/profile`;
- `/account/preferences`;
- `/account/notifications`;
- `/account/privacy`;
- `/account/support`;
- `/auth/sign-up`;
- `/auth/forgot-password`;
- `/auth/reset-password`;
- `/control-room`;
- `/api/health`.

These are recorded baseline discrepancies because the source inventory identifies corresponding route files or compatibility expectations for several of them. The external deployment cannot be cryptographically tied to baseline commit `6f5087f4`, so the likely explanations are:

1. the public deployment is behind the recorded source baseline;
2. deployment routing/configuration differs from the repository source;
3. one or more source routes are not currently reaching production.

Phase 0 does not silently choose one explanation. A later deployment verification must compare a freshly deployed baseline commit against this manifest before route relocation begins.

No collection-detail link was present in the homepage link inventory, so a concrete `/collections/[slug]` runtime sample was not invented.

## 9. Acceptance interpretation

Phase 0 is an evidence phase, not a defect-fixing phase. Its gate permits characterization tests to pass or existing failures/discrepancies to be documented.

The Playwright gate is therefore complete because:

- Playwright actually executed;
- all 15 characterization tests passed;
- the artifact exists and is downloadable;
- screenshots, traces, runtime errors, routes, redirects, product interaction, and admin access behaviour are recorded;
- the deployment/source route discrepancy is explicit rather than hidden.

This does not mean the current application has no defects. It means Phase 0 now has a reliable, reviewable baseline against which later changes can be judged.

## 10. Remaining validation limitation

The external browser runner validates the deployed runtime only. It does not replace source-level commands such as lint, TypeScript, unit tests, build, Prisma validation, architecture guards, or React Doctor.

PR #37 changes documentation only and does not alter production source. Those source-level commands remain required in every implementation phase and must run on an environment that can securely checkout the private repository. They are not falsely reported as passing in Phase 0.
