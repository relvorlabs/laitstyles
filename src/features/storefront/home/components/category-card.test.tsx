// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType, ImgHTMLAttributes } from "react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) => (
    // biome-ignore lint/performance/noImgElement: test double for next/image.
    <img src={typeof src === "string" ? src : undefined} alt={alt} {...props} />
  ),
}));

import { CategoryCard } from "./category-card";

const NullableCategoryCard = CategoryCard as ComponentType<{
  name: string;
  image: string | null;
  count: number;
  onClick: () => void;
}>;

afterEach(cleanup);

it("renders the existing card-surface fallback when a category has no image", () => {
  const { container } = render(
    <NullableCategoryCard name="Jackets" image={null} count={2} onClick={() => undefined} />,
  );

  expect(screen.queryByRole("img")).toBeNull();
  expect(container.querySelector('[data-slot="category-image-fallback"]')).toBeTruthy();
  expect(screen.getByRole("button", { name: /2 pieces\s*jackets/i })).toBeTruthy();
});
