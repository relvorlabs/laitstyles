import { err, ok, type Result } from "@/lib/errors";
import {
  productImportCsvRowSchema,
  productImportJsonFileSchema,
} from "@/modules/products/import/schema";
import {
  PRODUCT_IMPORT_MAX_BYTES,
  PRODUCT_IMPORT_MAX_ROWS,
  type ProductImportFileInput,
  type ProductImportFileIssue,
  type ProductImportParseResult,
} from "@/modules/products/import/types";

type CsvParseResult = Result<Record<string, string>[], ProductImportFileIssue>;
type CsvSourceRow = { sourceRow: number; values: string[] };
type CsvTable = { headers: string[]; rows: CsvSourceRow[] };

export function parseCsvTable(text: string): CsvParseResult {
  const table = parseCsvTableWithSourceRows(text);
  if (!table.ok) return table;

  return ok(
    table.value.rows.map(({ values }) =>
      Object.fromEntries(table.value.headers.map((header, index) => [header, values[index] ?? ""])),
    ),
  );
}

function parseCsvTableWithSourceRows(text: string): Result<CsvTable, ProductImportFileIssue> {
  const rows: CsvSourceRow[] = [];
  let row: string[] = [];
  let field = "";
  let insideQuotes = false;
  let quoteClosed = false;
  let fieldStartedQuoted = false;
  let fieldStartRow = 1;
  let fieldStartColumn = 1;
  let physicalRow = 1;
  let rowStartRow = 1;

  const finishField = () => {
    row.push(field);
    field = "";
    quoteClosed = false;
    fieldStartedQuoted = false;
    fieldStartColumn = row.length + 1;
  };
  const finishRow = () => {
    finishField();
    if (row.some((value) => value.trim().length > 0))
      rows.push({ sourceRow: rowStartRow, values: row });
    row = [];
    physicalRow += 1;
    fieldStartRow = physicalRow;
    fieldStartColumn = 1;
    rowStartRow = physicalRow;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text.charAt(index);

    if (insideQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          insideQuotes = false;
          quoteClosed = true;
        }
      } else if (character === "\r" && text[index + 1] === "\n") {
        field += "\n";
        physicalRow += 1;
        index += 1;
      } else {
        field += character;
        if (character === "\n" || character === "\r") physicalRow += 1;
      }
      continue;
    }

    if (quoteClosed) {
      if (character === ",") {
        finishField();
        fieldStartRow = physicalRow;
        continue;
      }
      if (character === "\n" || character === "\r") {
        if (character === "\r" && text[index + 1] === "\n") index += 1;
        finishRow();
        continue;
      }
      return err({
        code: "malformed-csv",
        message: "Unexpected text after a closing CSV quote.",
        row: physicalRow,
        column: row.length + 1,
      });
    }

    if (character === '"') {
      if (field.length > 0) {
        return err({
          code: "malformed-csv",
          message: "CSV quotes must begin at the start of a field.",
          row: physicalRow,
          column: row.length + 1,
        });
      }
      insideQuotes = true;
      fieldStartedQuoted = true;
      fieldStartRow = physicalRow;
      fieldStartColumn = row.length + 1;
      continue;
    }
    if (character === ",") {
      finishField();
      fieldStartRow = physicalRow;
      continue;
    }
    if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      finishRow();
      continue;
    }
    field += character;
  }

  if (insideQuotes) {
    return err({
      code: "malformed-csv",
      message: "CSV field has an opening quote without a closing quote.",
      row: fieldStartRow,
      column: fieldStartColumn,
    });
  }

  if (field.length > 0 || row.length > 0 || fieldStartedQuoted) finishRow();
  if (!rows.length) return ok([]);

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow?.values;
  if (!headers || headers.some((header) => !header.trim())) {
    return err({
      code: "malformed-csv",
      message: "CSV headers must be non-empty.",
      row: 1,
    });
  }
  if (new Set(headers).size !== headers.length) {
    return err({
      code: "malformed-csv",
      message: "CSV headers must be unique.",
      row: 1,
    });
  }
  for (const dataRow of dataRows) {
    if (dataRow.values.length > headers.length) {
      return err({
        code: "malformed-csv",
        message: "CSV row has more cells than the header.",
        row: dataRow.sourceRow,
        column: headers.length + 1,
      });
    }
  }

  return ok({ headers, rows: dataRows });
}

export function parseProductImportText(input: ProductImportFileInput): ProductImportParseResult {
  if (input.size > PRODUCT_IMPORT_MAX_BYTES) {
    return err({
      code: "file-too-large",
      message: "Import files must be 10 MiB or smaller.",
    });
  }

  const extension = input.fileName.trim().toLocaleLowerCase("en-NG").split(".").pop();
  if (extension === "csv") return parseCsvImport(input.text);
  if (extension === "json") return parseJsonImport(input.text);
  return err({
    code: "unsupported-file-type",
    message: "Choose a CSV or JSON product import file.",
  });
}

function parseCsvImport(text: string): ProductImportParseResult {
  const table = parseCsvTableWithSourceRows(text);
  if (!table.ok) return table;
  if (table.value.rows.length > PRODUCT_IMPORT_MAX_ROWS) return tooManyProducts();

  for (const sourceRow of table.value.rows) {
    const row = Object.fromEntries(
      table.value.headers.map((header, index) => [header, sourceRow.values[index] ?? ""]),
    );
    for (const [columnIndex, [key, value]] of Object.entries(row).entries()) {
      if (!isNestedJsonColumn(key) || !value.trim()) continue;
      try {
        JSON.parse(value);
      } catch {
        return err({
          code: "invalid-json-cell",
          message: "CSV cell must contain valid JSON.",
          row: sourceRow.sourceRow,
          column: columnIndex + 1,
        });
      }
    }

    const parsed = productImportCsvRowSchema.safeParse(row);
    if (!parsed.success) return invalidImport(sourceRow.sourceRow);
  }

  const rows = table.value.rows.map(({ values }) =>
    productImportCsvRowSchema.parse(
      Object.fromEntries(table.value.headers.map((header, index) => [header, values[index] ?? ""])),
    ),
  );
  return ok({ source: "csv", rows });
}

function parseJsonImport(text: string): ProductImportParseResult {
  let source: unknown;
  try {
    source = JSON.parse(text);
  } catch {
    return err({ code: "invalid-json", message: "Import JSON must be valid JSON." });
  }

  if (Array.isArray(source) && source.length > PRODUCT_IMPORT_MAX_ROWS) return tooManyProducts();
  const parsed = productImportJsonFileSchema.safeParse(source);
  if (!parsed.success) return invalidImport();
  return ok({ source: "json", rows: parsed.data });
}

function isNestedJsonColumn(column: string) {
  return ["variants", "measurements", "optionNames", "channels", "fulfilment"].includes(column);
}

function invalidImport(row?: number) {
  return err({
    code: "invalid-import",
    message: "The import contains an invalid product row.",
    ...(row === undefined ? {} : { row }),
  });
}

function tooManyProducts() {
  return err({
    code: "too-many-products",
    message: "Import files may contain at most 1,000 products.",
  });
}
