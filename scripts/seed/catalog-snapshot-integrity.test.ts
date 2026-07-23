import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { prepareCatalogSnapshot } from "./catalog-snapshot";

const snapshotPath = join(__dirname, "storefront-catalog-snapshot.json");

function loadSnapshot(): Record<string, unknown> & {
  product_channels: Array<Record<string, unknown>>;
  product_media: Array<Record<string, unknown>>;
  stock_levels: Array<Record<string, unknown>>;
} {
  return JSON.parse(readFileSync(snapshotPath, "utf8"));
}

describe("retained catalogue snapshot integrity", () => {
  it("passes the strict Phase 2 snapshot validator without normalization", () => {
    expect(() => prepareCatalogSnapshot(loadSnapshot())).not.toThrow();
  });

  it("rejects duplicate channel, media-position and stock-target keys", () => {
    const channel = loadSnapshot();
    channel.product_channels.push({ ...channel.product_channels[0] });
    expect(() => prepareCatalogSnapshot(channel)).toThrow(/product_channels\.product_id\+channel/);

    const media = loadSnapshot();
    media.product_media.push({
      ...media.product_media[0],
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    });
    expect(() => prepareCatalogSnapshot(media)).toThrow(
      /product_media\.product_id\+variant_id\+position/,
    );

    const stock = loadSnapshot();
    stock.stock_levels.push({
      ...stock.stock_levels[0],
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    });
    expect(() => prepareCatalogSnapshot(stock)).toThrow(
      /stock_levels\.product_id\+variant_id/,
    );
  });
});
