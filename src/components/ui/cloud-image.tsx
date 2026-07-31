"use client";

import Image, { type ImageProps } from "next/image";
import { CldImage } from "next-cloudinary";

const CLOUDINARY_DELIVERY_URL =
  /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/v\d+\//;

export type CloudImageProps = ImageProps;

function isCloudinaryDeliverySource(src: ImageProps["src"]): src is string {
  return typeof src === "string" && CLOUDINARY_DELIVERY_URL.test(src);
}

/**
 * The single application-level image boundary. Cloudinary delivery URLs use
 * CldImage for optimized delivery; local, static and legacy sources retain
 * Next Image behavior without requiring consumers to understand the provider.
 */
export function CloudImage({ src, alt, ...props }: CloudImageProps) {
  if (isCloudinaryDeliverySource(src)) {
    return <CldImage {...props} alt={alt} src={src} />;
  }

  return <Image {...props} alt={alt} src={src} />;
}
