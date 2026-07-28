import { describe, expect, it } from "vitest";
import { parseCsvTable, parseProductImportText } from "@/modules/products/import/csv";

describe("parseCsvTable", () => {
  it("keeps quoted commas, escaped quotes, CRLF, and embedded newlines in their fields", () => {
    const result = parseCsvTable(
      'name,description\r\n"Varsity, Blue","A ""rare"" jacket\nwith contrast trim"\r\n',
    );

    expect(result).toEqual({
      ok: true,
      value: [
        {
          name: "Varsity, Blue",
          description: 'A "rare" jacket\nwith contrast trim',
        },
      ],
    });
  });

  it("ignores blank trailing rows", () => {
    expect(parseCsvTable("mode,name\nunique,Archive coat\n\n\r\n")).toEqual({
      ok: true,
      value: [{ mode: "unique", name: "Archive coat" }],
    });
  });

  it("reports the row and column for an unterminated quoted field", () => {
    expect(parseCsvTable('mode,name\nunique,"Archive coat')).toEqual({
      ok: false,
      error: {
        code: "malformed-csv",
        message: "CSV field has an opening quote without a closing quote.",
        row: 2,
        column: 2,
      },
    });
  });

  it("rejects rows with cells beyond the header width", () => {
    expect(parseCsvTable("mode,name\nunique,Archive coat,unexpected")).toEqual({
      ok: false,
      error: {
        code: "malformed-csv",
        message: "CSV row has more cells than the header.",
        row: 2,
        column: 3,
      },
    });
  });
});

describe("parseProductImportText", () => {
  it("parses variants and measurements JSON cells", () => {
    const csv =
      'mode,name,variants,measurements\r\nvariant,"Varsity, Blue","[{""label"":""S"",""stock"":2}]","[]"';

    const result = parseProductImportText({
      fileName: "products.csv",
      size: csv.length,
      text: csv,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        source: "csv",
        rows: [
          expect.objectContaining({
            mode: "variant",
            name: "Varsity, Blue",
            variants: [{ label: "S", stock: 2 }],
            measurements: [],
          }),
        ],
      },
    });
  });

  it("accepts blank columns that belong to the other inventory modes", () => {
    const csv =
      "mode,name,condition,size,sizeLabel,stock,variants,measurements\nunique,Archive coat,Excellent,M,,,,[]";

    expect(
      parseProductImportText({ fileName: "products.csv", size: csv.length, text: csv }),
    ).toMatchObject({
      ok: true,
      value: {
        source: "csv",
        rows: [
          expect.objectContaining({
            mode: "unique",
            name: "Archive coat",
            condition: "Excellent",
            measurements: [],
          }),
        ],
      },
    });
  });

  it("accepts direct JSON rows with nested arrays and rejects database ids", () => {
    const accepted = JSON.stringify([
      {
        mode: "unique",
        name: "Archive coat",
        measurements: [{ label: "Chest", value: "48 cm" }],
      },
    ]);
    const rejected = JSON.stringify([
      { mode: "stocked", name: "Tee", productId: "019f65c1-74fe-7bd3-8400-000000000011" },
    ]);

    expect(
      parseProductImportText({ fileName: "products.json", size: accepted.length, text: accepted }),
    ).toMatchObject({
      ok: true,
      value: {
        source: "json",
        rows: [
          expect.objectContaining({
            mode: "unique",
            measurements: [expect.objectContaining({ label: "Chest" })],
          }),
        ],
      },
    });
    expect(
      parseProductImportText({ fileName: "products.json", size: rejected.length, text: rejected }),
    ).toMatchObject({ ok: false, error: { code: "invalid-import" } });
  });

  it.each([false, true])("preserves pickupAvailable=%s from direct JSON", (pickupAvailable) => {
    const text = JSON.stringify([
      {
        mode: "unique",
        name: "Archive coat",
        fulfilment: { pickupAvailable },
      },
    ]);

    expect(
      parseProductImportText({ fileName: "products.json", size: text.length, text }),
    ).toMatchObject({
      ok: true,
      value: {
        rows: [expect.objectContaining({ fulfilment: { pickupAvailable } })],
      },
    });
  });

  it("rejects a string pickupAvailable value instead of coercing it", () => {
    const text = JSON.stringify([
      {
        mode: "unique",
        name: "Archive coat",
        fulfilment: { pickupAvailable: "false" },
      },
    ]);

    expect(
      parseProductImportText({ fileName: "products.json", size: text.length, text }),
    ).toMatchObject({ ok: false, error: { code: "invalid-import" } });
  });

  it("reports invalid nested JSON CSV cells with their row and column", () => {
    const csv = 'mode,name,variants\nvariant,Varsity,"[{not json}]"';

    expect(
      parseProductImportText({ fileName: "products.csv", size: csv.length, text: csv }),
    ).toEqual({
      ok: false,
      error: {
        code: "invalid-json-cell",
        message: "CSV cell must contain valid JSON.",
        row: 2,
        column: 3,
      },
    });
  });

  it("reports the physical source row for nested JSON after an embedded newline", () => {
    const csv = 'mode,name,variants\nvariant,"Line one\nLine two",[]\nvariant,Later,"[{not json}]"';

    expect(
      parseProductImportText({ fileName: "products.csv", size: csv.length, text: csv }),
    ).toEqual({
      ok: false,
      error: {
        code: "invalid-json-cell",
        message: "CSV cell must contain valid JSON.",
        row: 4,
        column: 3,
      },
    });
  });

  it("reports the physical source row for schema errors after an embedded newline", () => {
    const csv = 'mode,name,stock\nstocked,"Line one\nLine two",2\nstocked,Later,not-a-number';

    expect(
      parseProductImportText({ fileName: "products.csv", size: csv.length, text: csv }),
    ).toEqual({
      ok: false,
      error: {
        code: "invalid-import",
        message: "The import contains an invalid product row.",
        row: 4,
      },
    });
  });

  it("rejects files larger than 10 MiB before parsing", () => {
    const result = parseProductImportText({
      fileName: "products.csv",
      size: 10 * 1024 * 1024 + 1,
      text: "mode,name\nunique,Archive coat",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "file-too-large",
        message: "Import files must be 10 MiB or smaller.",
      },
    });
  });

  it("rejects files with more than 1,000 products", () => {
    const rows = Array.from({ length: 1001 }, (_, index) => `unique,Piece ${index + 1}`);
    const csv = `mode,name\n${rows.join("\n")}`;

    expect(
      parseProductImportText({ fileName: "products.csv", size: csv.length, text: csv }),
    ).toEqual({
      ok: false,
      error: {
        code: "too-many-products",
        message: "Import files may contain at most 1,000 products.",
      },
    });
  });
});
