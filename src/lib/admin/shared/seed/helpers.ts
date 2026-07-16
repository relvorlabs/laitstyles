import type { InventoryCounts, ProductMedia } from "@/lib/admin/shared/types";

export const driveImage = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;

export const stock = (
  totalReceived: number,
  available: number,
  reserved: number,
  sold: number,
  returned = 0,
  damaged = 0,
): InventoryCounts => ({
  totalReceived,
  available,
  reserved,
  sold,
  returned,
  damaged,
});

export const productMedia = (
  productId: string,
  name: string,
  coverId: string,
  detailId?: string,
  defectId?: string,
): ProductMedia[] => {
  const media: ProductMedia[] = [
    {
      id: `${productId}-cover`,
      url: driveImage(coverId),
      alt: `${name} front view`,
      kind: "cover",
      position: 0,
    },
  ];

  if (detailId) {
    media.push({
      id: `${productId}-detail`,
      url: driveImage(detailId),
      alt: `${name} fabric and construction detail`,
      kind: "detail",
      position: 1,
    });
  }

  if (defectId) {
    media.push({
      id: `${productId}-defect`,
      url: driveImage(defectId),
      alt: `${name} condition detail`,
      kind: "defect",
      position: media.length,
    });
  }

  return media;
};
