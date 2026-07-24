import "server-only";

import { revalidateTag } from "next/cache";

export function invalidateProductCatalogue(slugs: Iterable<string | null | undefined>): void {
  revalidateTag("catalogue", "max");
  for (const slug of new Set([...slugs].filter((value): value is string => Boolean(value)))) {
    revalidateTag(`product-${slug}`, "max");
  }
}
