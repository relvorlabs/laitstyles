"use client";

import Image, { type ImageProps } from "next/image";
import { CldImage } from "next-cloudinary";

const CLOUDINARY_DELIVERY_URL =
  /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/v\d+\//;

export type CloudImageProps = ImageProps;

/**
 * Centralized image renderer for the whole app. Assets actually uploaded through the
 * Cloudinary pipeline (their secure_url always carries `/upload/v<version>/`) render through
 * `CldImage` for automatic format/quality delivery. Any other source — legacy seed URLs, local
 * `public/` paths — falls back to `next/image` unchanged so non-migrated imagery keeps working.
 */
export function CloudImage({ src, ...props }: CloudImageProps) {
  if (typeof src === "string" && CLOUDINARY_DELIVERY_URL.test(src)) {
    return <CldImage src={src} {...props} />;
  }
  return <Image src={src} {...props} />;
}
