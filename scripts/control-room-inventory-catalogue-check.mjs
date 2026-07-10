import { chromium } from "playwright";
import path from "node:path";

const baseUrl =
  process.env.CONTROL_ROOM_BASE_URL || "http://127.0.0.1:3000";
const screenshotDir =
  process.env.CONTROL_ROOM_SCREENSHOT_DIR || "control-room-screenshots";
const failures = [];

function watchPage(page, label) {
  page.on("pageerror", (error) => {
    failures.push(`${label} page error: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      failures.push(`${label} console error: ${message.text()}`);
    }
  });
}

async function expectVisible(locator, message) {
  await locator.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
    throw new Error(message);
  });
}

async function chooseOption(page, trigger, optionName) {
  await trigger.click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

async function runCatalogueFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  watchPage(page, "Inventory catalogue flow");
  await page.goto(`${baseUrl}/admin/inventory`, { waitUntil: "networkidle" });

  const grid = page.locator("[data-inventory-grid]");
  const columns = await grid.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length,
  );
  if (columns !== 5) {
    throw new Error(`Inventory grid expected 5 columns, received ${columns}.`);
  }

  await page.getByRole("button", { name: "Manage catalogue groups" }).click();
  const manager = page.getByRole("dialog").last();
  await expectVisible(manager, "Catalogue group manager did not open.");

  await manager.getByRole("textbox", { name: "New category name" }).fill("Acceptance Denim");
  await manager.getByRole("button", { name: "Add category" }).click();
  await expectVisible(
    manager.getByText("Acceptance Denim", { exact: true }),
    "Created category did not appear in the manager.",
  );

  await manager.getByRole("tab", { name: "Collections" }).click();
  await manager.getByRole("textbox", { name: "New collection name" }).fill("Acceptance Edit");
  await manager.getByRole("button", { name: "Add collection" }).click();
  await expectVisible(
    manager.getByText("Acceptance Edit", { exact: true }),
    "Created collection did not appear in the manager.",
  );
  await manager.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Add product" }).click();
  const editor = page.getByRole("dialog").last();
  await editor.getByRole("button", { name: /Stocked product/ }).click();
  await editor.getByRole("button", { name: "Continue" }).click();

  await editor.getByRole("textbox", { name: "Product name" }).fill("Acceptance Adidas Jeans");
  await editor.getByRole("textbox", { name: "Brand or label" }).fill("Adidas");
  await editor
    .getByRole("textbox", { name: "Product description" })
    .fill("Relaxed Adidas denim jeans used to verify catalogue, stock, image and pricing behavior.");
  await chooseOption(
    page,
    editor.getByRole("combobox", { name: "Category" }),
    "Acceptance Denim",
  );
  await chooseOption(
    page,
    editor.getByRole("combobox", { name: "Collection" }),
    "Acceptance Edit",
  );

  await editor.getByRole("button", { name: "Manage categories" }).click();
  const editorManager = page.getByRole("dialog").last();
  await editorManager.getByRole("button", { name: "Rename Acceptance Denim" }).click();
  await editorManager
    .getByRole("textbox", { name: "Rename Acceptance Denim" })
    .fill("Acceptance Denim Updated");
  await editorManager.getByRole("button", { name: "Save", exact: true }).click();
  await editorManager.getByRole("button", { name: "Close" }).click();
  const selectedCategory = await editor
    .getByRole("combobox", { name: "Category" })
    .textContent();
  if (!selectedCategory?.includes("Acceptance Denim Updated")) {
    throw new Error("Renaming the selected category did not update the open product editor.");
  }

  await editor.getByRole("button", { name: "Auto-generate reference" }).click();
  const generatedReference = await editor
    .getByRole("textbox", { name: /Internal reference \/ SKU seed/ })
    .inputValue();
  if (!generatedReference.startsWith("LS-STK-ADI-")) {
    throw new Error(`Unexpected generated stocked SKU: ${generatedReference}`);
  }

  await editor.getByRole("button", { name: "Continue" }).click();
  const imageUrl = editor.getByRole("textbox", { name: "Or add an image URL" });
  await imageUrl.fill(`${baseUrl}/product-placeholder.svg`);
  await editor.getByRole("button", { name: "Add image" }).click();
  await imageUrl.fill(`${baseUrl}/brand/laitstyle-symbol.svg`);
  await editor.getByRole("button", { name: "Add image" }).click();
  await expectVisible(
    editor.getByText("2/12 images", { exact: true }),
    "Multiple images were not added to the product record.",
  );

  const descriptions = editor.getByRole("textbox", { name: "Image description" });
  await descriptions.nth(0).fill("Front view of the relaxed denim jeans");
  await descriptions.nth(1).fill("Laitstyle brand detail for the product record");
  await editor
    .getByRole("button", { name: "Set as featured cover" })
    .nth(1)
    .click();
  const featuredCount = await editor.getByText("Featured cover", { exact: true }).count();
  if (featuredCount !== 1) {
    throw new Error(`Expected exactly one featured cover, received ${featuredCount}.`);
  }

  await editor.getByRole("button", { name: "Continue" }).click();
  await editor.getByRole("textbox", { name: "Size or fit label" }).fill("Relaxed M/L");
  await editor.getByRole("textbox", { name: "Colour" }).fill("Indigo");
  await editor.getByRole("spinbutton", { name: "Total received" }).fill("50");
  await expectVisible(
    editor.getByText("Available after save", { exact: true }),
    "Available-stock preview was not visible.",
  );

  await editor.getByRole("button", { name: "Continue" }).click();
  await editor.getByRole("spinbutton", { name: "Compare-at price" }).fill("30000");
  await editor.getByRole("spinbutton", { name: "Unit cost" }).fill("12000");
  await editor.getByRole("spinbutton", { name: "Apply discount percentage" }).fill("20");
  await editor.getByRole("button", { name: "Calculate price" }).click();
  const sellingPrice = await editor
    .getByRole("spinbutton", { name: "Selling price" })
    .inputValue();
  if (sellingPrice !== "24000") {
    throw new Error(`Discount calculator expected 24000, received ${sellingPrice}.`);
  }

  await page.screenshot({
    path: path.join(screenshotDir, "inventory-editor-catalogue-pricing-1440x900.png"),
    fullPage: false,
  });
  await editor.getByRole("button", { name: "Save draft" }).click();
  await editor.waitFor({ state: "hidden", timeout: 10000 });
  await expectVisible(
    page.getByText("Acceptance Adidas Jeans saved as a draft."),
    "Product draft did not save after the catalogue flow.",
  );

  await chooseOption(
    page,
    page.getByRole("combobox", { name: "Category" }),
    "Acceptance Denim Updated",
  );
  await expectVisible(
    page.getByText("Acceptance Adidas Jeans", { exact: true }).first(),
    "Managed category filter did not return the saved product.",
  );

  await chooseOption(
    page,
    page.getByRole("combobox", { name: "Inventory items per page" }),
    "10",
  );
  await page.waitForURL(/pageSize=10/);
  await page.getByRole("button", { name: "table", exact: true }).click();
  await expectVisible(
    page.getByRole("navigation", { name: "Inventory pagination" }),
    "Pagination was not retained in table mode.",
  );
  await expectVisible(
    page.getByRole("button", { name: "Preview images for Acceptance Adidas Jeans" }),
    "Table image preview was not available for the created product.",
  );

  await page.screenshot({
    path: path.join(screenshotDir, "inventory-table-pagination-1440x900.png"),
    fullPage: true,
  });
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await runCatalogueFlow(browser);
} finally {
  await browser.close();
}

if (failures.length) throw new Error(failures.join("\n"));

console.log("Inventory catalogue CRUD, editor and pagination checks passed.");
