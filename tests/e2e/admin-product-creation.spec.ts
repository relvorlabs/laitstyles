import { expect, test, type Page, type Route, type TestInfo } from "playwright/test";
import { expectNoRequiredAxeViolations } from "./support/accessibility";

const staffStorageState =
  process.env.PRODUCT_CREATION_STAFF_STORAGE_STATE ??
  process.env.PHASE_1_6_STAFF_STORAGE_STATE;

test.use({ storageState: staffStorageState ?? { cookies: [], origins: [] } });

test.beforeEach(() => {
  if (!staffStorageState) {
    throw new Error(
      "PRODUCT_CREATION_STAFF_STORAGE_STATE or PHASE_1_6_STAFF_STORAGE_STATE is required for authenticated Product creation acceptance.",
    );
  }
});

test("authenticated Cloudinary signing keeps the provider's top-level response contract", async ({
  page,
}) => {
  await installInventoryApiMock(page);
  await page.goto("/admin/inventory", { waitUntil: "domcontentloaded" });

  const result = await page.evaluate(async () => {
    const response = await fetch("/api/v1/admin/assets/sign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        paramsToSign: { timestamp: Math.floor(Date.now() / 1_000), folder: "laitstyles/products" },
      }),
    });
    return {
      status: response.status,
      cacheControl: response.headers.get("cache-control"),
      requestId: response.headers.get("x-request-id"),
      payload: await response.json(),
    };
  });

  expect(result.status).toBe(200);
  expect(result.cacheControl).toBe("private, no-store");
  expect(result.requestId).toBeTruthy();
  expect(result.payload).toEqual({ signature: expect.any(String) });
  expect(result.payload.signature).not.toHaveLength(0);
});

test("relational JSON import ignores assets, preserves child edits, and writes only the active child", async ({
  page,
}) => {
  const savedRequests: Array<Record<string, unknown>> = [];
  await installInventoryApiMock(page);
  await installProductApiMock(page, savedRequests);
  await page.goto("/admin/inventory", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Import products" }).click();
  await page
    .getByLabel("Choose a CSV or JSON import file")
    .setInputFiles("tests/e2e/fixtures/product-import.json");

  await expect(
    page
      .getByText("3 media assets were ignored; product media is not imported.")
      .filter({ visible: true }),
  ).toBeVisible();
  await expectSelectedImport(page, "One-off indigo jacket");
  expect(savedRequests).toHaveLength(0);

  await page.getByRole("button", { name: "Continue" }).click();
  const productName = page.getByLabel("Product name");
  await productName.fill("Edited one-off indigo jacket");
  await page.getByRole("button", { name: "Next product" }).click();
  await expectSelectedImport(page, "Studio denim shirt");
  await page.getByRole("button", { name: "Previous product" }).click();
  await expect(page.getByLabel("Product name")).toHaveValue("Edited one-off indigo jacket");
  expect(savedRequests).toHaveLength(0);

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect.poll(() => savedRequests.length).toBe(1);
  expect(savedRequests[0]).toMatchObject({
    intent: "draft",
    values: { name: "Edited one-off indigo jacket", media: [] },
  });

  await page.getByRole("button", { name: "Next product" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Product name").fill("Dirty stocked shirt");
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("alertdialog", { name: "Discard imported product drafts?" })).toBeVisible();
  await page.getByRole("button", { name: "Keep reviewing" }).click();
  await expect(page.getByLabel("Product name")).toHaveValue("Dirty stocked shirt");
});

test("CSV asset columns are ignored and summarized instead of rejecting the import", async ({ page }) => {
  await installInventoryApiMock(page);
  await installProductApiMock(page, []);
  await page.goto("/admin/inventory", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Import products" }).click();
  await page
    .getByLabel("Choose a CSV or JSON import file")
    .setInputFiles("tests/e2e/fixtures/product-import.csv");

  await expectImportCount(page, 3);
  await expect(
    page
      .getByText("3 media assets were ignored; product media is not imported.")
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByText("Import file could not be prepared")).toHaveCount(0);
});

test("Category upload remains local until save and Collection membership discloses moves", async ({
  page,
}) => {
  const api = await installCatalogueApiMock(page);
  await installFakeCloudinaryUploadWidget(page);
  await page.goto("/admin/inventory/catalogue", { waitUntil: "domcontentloaded" });

  const editCategory = page.getByRole("button", { name: "Edit Denim" });
  await editCategory.click();
  await expect(page.getByRole("dialog", { name: "Edit category" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replace image" })).toBeEnabled();
  await page.getByRole("button", { name: "Replace image" }).click();
  await expect(
    page.getByText("Category image upload completed. Save the category to keep it."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  expect(api.patches).toHaveLength(0);

  await editCategory.click();
  await page.getByRole("button", { name: "Replace image" }).click();
  await page.getByRole("button", { name: "Save category" }).click();
  await expect.poll(() => api.patches.length).toBe(1);
  expect(api.patches[0]).toMatchObject({
    kind: "category",
    imageUrl: "https://res.cloudinary.com/reviewer/image/upload/category-acceptance.jpg",
  });

  await page.getByRole("tab", { name: "Collections" }).click();
  await expect(page).toHaveURL(/\/admin\/inventory\/catalogue\?tab=collections/);
  await expect(page.getByText("Archive edit", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit story" }).click();
  await page.getByLabel("Midnight coat").check();
  await expect(page.getByText("Products will move from another collection")).toBeVisible();
  await expect(page.getByText(/Midnight coat \(Evening edit\)/)).toBeVisible();
  await expect(page.getByRole("button", { name: /upload/i })).toHaveCount(0);
  await page.getByRole("button", { name: "Save 2 products" }).click();
  await expect.poll(() => api.patches.length).toBe(2);
  expect(api.patches[1]).toMatchObject({
    kind: "collection",
    productIds: ["019f65c1-74fe-7bd3-8400-000000000101", "019f65c1-74fe-7bd3-8400-000000000102"],
  });
});

for (const theme of ["light", "dark"] as const) {
  test(`catalogue structure ${theme} viewport, reduced-motion, a11y and interaction gate`, async ({
    page,
  }, testInfo) => {
    const diagnostics = observeBrowserDiagnostics(page);
    await installCatalogueApiMock(page);
    await mockCloudinaryImages(page);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.addInitScript((selectedTheme) => {
      localStorage.setItem("laitstyle-theme", selectedTheme);
    }, theme);

    const response = await page.goto("/admin/inventory/catalogue", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status() ?? 200).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: /Give every product a place/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(theme === "dark");
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);

    await page.getByRole("button", { name: "Edit Denim" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Edit category" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Edit category" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit Denim" })).toBeFocused();

    await expectNoRequiredAxeViolations(page, {
      route: "/admin/inventory/catalogue",
      surface: `catalogue-structure-${theme}-${testInfo.project.name}`,
    });
    await expectPrimaryTouchTarget(page, "New category");
    expect(diagnostics.consoleErrors).toEqual([]);
    expect(diagnostics.failedRequests).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`catalogue-structure-${theme}-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });
}

async function installInventoryApiMock(page: Page) {
  await page.route("**/api/v1/admin/inventory?**", async (route) => {
    await json(route, {
      data: [],
      meta: {
        page: 1,
        pageSize: 24,
        total: 0,
        pageCount: 0,
        summary: {
          totalProducts: 0,
          liveProducts: 0,
          availableUnits: 0,
          reservedUnits: 0,
          soldUnits: 0,
          lowStockProducts: 0,
          outOfStockProducts: 0,
          intakeProducts: 0,
        },
        viewCounts: {
          all: 0,
          live: 0,
          drafts: 0,
          intake: 0,
          "low-stock": 0,
          "out-of-stock": 0,
          held: 0,
          sold: 0,
          unpublished: 0,
          "needs-attention": 0,
        },
      },
    });
  });
}

async function installProductApiMock(
  page: Page,
  savedRequests: Array<Record<string, unknown>>,
) {
  await page.route("**/api/v1/admin/products?page=**", async (route) => {
    await json(route, { data: [], meta: { page: 1, pageSize: 500, total: 0, pageCount: 0 } });
  });
  await page.route("**/api/v1/admin/products", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const input = route.request().postDataJSON() as ProductSaveInput;
    savedRequests.push(input as unknown as Record<string, unknown>);
    await json(route, {
      data: {
        intent: input.intent,
        message: "Product saved.",
        product: savedProduct(input),
      },
    });
  });
}

type ProductSaveInput = {
  intent: "draft" | "schedule" | "publish";
  values: Record<string, unknown> & { inventoryMode: "unique" | "stocked" | "variant" };
};

function savedProduct({ intent, values }: ProductSaveInput) {
  const base = {
    id: "019f65c1-74fe-7bd3-8400-000000000201",
    slug: "saved-import-product",
    name: String(values.name ?? "Saved import product"),
    description: String(values.description ?? ""),
    category: String(values.category ?? "Uncategorised"),
    collection: values.collection ? String(values.collection) : null,
    brand: String(values.brand ?? "Unlabelled"),
    image: "/product-placeholder.svg",
    media: values.media ?? [],
    price: Number(values.sellingPrice ?? 0),
    referencePrice: values.referencePrice ?? null,
    cost: values.cost ?? null,
    lifecycle: "draft",
    publication: intent === "publish" ? "published" : intent === "schedule" ? "scheduled" : "unpublished",
    channels: values.channels ?? [],
    lowStockThreshold: Number(values.lowStockThreshold ?? 1),
    fulfilment: values.fulfilment,
    scheduledAt: values.scheduledAt,
    createdAt: "2026-07-28T10:00:00.000Z",
    updatedAt: "2026-07-28T10:00:00.000Z",
  };
  if (values.inventoryMode === "unique") {
    const unique = values.unique as Record<string, unknown>;
    return {
      ...base,
      inventoryMode: "unique",
      archiveNumber: String(values.internalReference ?? "ARC-001"),
      condition: String(unique.condition ?? ""),
      size: String(unique.size ?? ""),
      colour: String(unique.colour ?? ""),
      measurements: unique.measurements ?? [],
      stock: stockCounts(1),
    };
  }
  if (values.inventoryMode === "stocked") {
    const stocked = values.stocked as Record<string, unknown>;
    return {
      ...base,
      inventoryMode: "stocked",
      sku: String(values.internalReference ?? "STOCK-001"),
      sizeLabel: String(stocked.sizeLabel ?? ""),
      colour: String(stocked.colour ?? ""),
      stock: stockCounts(Number(stocked.quantity ?? 0)),
    };
  }
  const variant = values.variant as Record<string, unknown>;
  return {
    ...base,
    inventoryMode: "variant",
    optionNames: variant.optionNames ?? [],
    variants: variant.variants ?? [],
  };
}

function stockCounts(available: number) {
  return { available, reserved: 0, held: 0, sold: 0, damaged: 0, total: available };
}

async function installCatalogueApiMock(page: Page) {
  const category = taxonomyItem({
    id: "category:019f65c1-74fe-7bd3-8400-000000000011",
    kind: "category",
    name: "Denim",
    slug: "denim",
    imageUrl: "https://res.cloudinary.com/reviewer/image/upload/denim.jpg",
    position: 0,
    productCount: 1,
    previewImageUrls: [],
  });
  const collection = taxonomyItem({
    id: "collection:019f65c1-74fe-7bd3-8400-000000000021",
    kind: "collection",
    name: "Archive edit",
    slug: "archive-edit",
    imageUrl: null,
    position: 0,
    productCount: 1,
    previewImageUrls: ["https://res.cloudinary.com/reviewer/image/upload/archive.jpg"],
  });
  const taxonomy = [category, collection];
  const products = [
    catalogueProduct("019f65c1-74fe-7bd3-8400-000000000101", "Archive jacket", "Archive edit"),
    catalogueProduct("019f65c1-74fe-7bd3-8400-000000000102", "Midnight coat", "Evening edit"),
  ];
  const patches: Array<Record<string, unknown>> = [];

  await page.route("**/api/v1/admin/products/taxonomy", async (route) => {
    if (route.request().method() === "GET") return json(route, { data: taxonomy });
    return route.fallback();
  });
  await page.route("**/api/v1/admin/products/taxonomy/**", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    const input = route.request().postDataJSON() as Record<string, unknown>;
    patches.push(input);
    const item = input.kind === "category" ? category : collection;
    Object.assign(item, {
      name: input.name,
      imageUrl: input.kind === "category" ? input.imageUrl : item.imageUrl,
      position: input.position,
      productCount:
        input.kind === "collection" && Array.isArray(input.productIds)
          ? input.productIds.length
          : item.productCount,
    });
    await json(route, { data: { item, message: `${input.kind} updated.` } });
  });
  await page.route("**/api/v1/admin/products?page=**", async (route) => {
    await json(route, {
      data: products,
      meta: { page: 1, pageSize: 500, total: products.length, pageCount: 1 },
    });
  });
  return { patches };
}

function taxonomyItem<TInput extends Record<string, unknown>>(input: TInput) {
  return {
    ...input,
    createdAt: "2026-07-28T10:00:00.000Z",
    updatedAt: "2026-07-28T10:00:00.000Z",
  };
}

function catalogueProduct(id: string, name: string, collection: string) {
  return {
    id,
    slug: name.toLocaleLowerCase("en-NG").replaceAll(" ", "-"),
    name,
    description: "Acceptance product",
    category: "Denim",
    collection,
    brand: "Laitstyles",
    image: "https://res.cloudinary.com/reviewer/image/upload/product.jpg",
    media: [],
    price: 50000,
    referencePrice: null,
    cost: null,
    lifecycle: "draft",
    publication: "unpublished",
    channels: [],
    lowStockThreshold: 1,
    fulfilment: {
      weightKg: null,
      pickupAvailable: true,
      deliveryRestrictions: "",
      packagingNotes: "",
    },
    scheduledAt: "",
    createdAt: "2026-07-28T10:00:00.000Z",
    updatedAt: "2026-07-28T10:00:00.000Z",
    inventoryMode: "unique",
    archiveNumber: `ARC-${id.slice(-3)}`,
    condition: "Excellent",
    size: "M",
    colour: "Indigo",
    measurements: [],
    stock: stockCounts(1),
  };
}

async function installFakeCloudinaryUploadWidget(page: Page) {
  await page.route("https://upload-widget.cloudinary.com/global/all.js", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `window.cloudinary = {
        createUploadWidget: function (_options, callback) {
          return {
            open: function () {
              callback({ event: "queues-start", info: {} });
              callback({
                event: "success",
                info: {
                  public_id: "laitstyles/categories/category-acceptance",
                  secure_url: "https://res.cloudinary.com/reviewer/image/upload/category-acceptance.jpg",
                  width: 1200,
                  height: 800,
                  format: "jpg",
                  bytes: 2048
                }
              });
              callback({ event: "queues-end", info: {} });
            },
            destroy: function () {},
            close: function () {},
            isDestroyed: function () { return false; }
          };
        }
      };`,
    });
  });
  await mockCloudinaryImages(page);
}

async function mockCloudinaryImages(page: Page) {
  await page.route("https://res.cloudinary.com/**", async (route) => {
    await route.fulfill({
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
      contentType: "image/png",
    });
  });
}

function observeBrowserDiagnostics(page: Page) {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.failure()?.errorText ?? "failed"} ${request.url()}`);
  });
  return { consoleErrors, failedRequests };
}

async function expectPrimaryTouchTarget(page: Page, name: string) {
  const box = await page.getByRole("button", { name }).boundingBox();
  expect(box, `${name} must have a measurable touch target`).not.toBeNull();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
}

async function expectSelectedImport(page: Page, name: string) {
  const picker = page.getByLabel("Imported product");
  if (await picker.isVisible()) {
    await expect(picker.locator("option:checked")).toContainText(name);
    return;
  }
  await expect(
    page.locator('[aria-label="Imported product queue"] button[aria-current="true"]'),
  ).toContainText(name);
}

async function expectImportCount(page: Page, count: number) {
  const picker = page.getByLabel("Imported product");
  if (await picker.isVisible()) {
    await expect(picker.locator("option")).toHaveCount(count);
    return;
  }
  await expect(page.getByText(`${count} products to review`)).toBeVisible();
}

async function json(route: Route, body: unknown) {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: "application/json",
    headers: { "cache-control": "private, no-store" },
  });
}
