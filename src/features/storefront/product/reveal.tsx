"use client";

import { useReducedMotion } from "motion/react";
import { createElement, useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type RevealOwnProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
};

type RevealProps<T extends ElementType> = RevealOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof RevealOwnProps<T>>;

/**
 * Wraps its children in an element carrying the existing `.reveal` /
 * `.visible` CSS (see storefront.css). On mount it observes itself with an
 * IntersectionObserver and adds `visible` once it enters the viewport,
 * revealing once. Reduced-motion users (and environments without
 * IntersectionObserver) get the content visible immediately, no animation.
 */
export function Reveal<T extends ElementType = "div">({
  as,
  children,
  className,
  ...rest
}: RevealProps<T>) {
  const Component = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduceMotion]);

  const classes = ["reveal", visible ? "visible" : null, className].filter(Boolean).join(" ");

  return createElement(
    Component,
    { ref, className: classes, ...rest },
    children,
  );
}
