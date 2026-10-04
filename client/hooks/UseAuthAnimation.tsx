"use client";

import type { RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Page-load sequence shared by every auth page.
 *
 * Markup contract (same as the login page):
 *   data-anim="heading"  -> wrapper whose direct children slide in one by one
 *   data-form-item       -> each block of the form, staggered
 *   data-line            -> optional divider lines that grow outward
 */
export function useAuthEntrance(container: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from("[data-anim='heading'] > *", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
      }).from(
        "[data-form-item]",
        { y: 24, opacity: 0, duration: 0.55, stagger: 0.08 },
        0.25,
      );

      if (container.current?.querySelector("[data-line]")) {
        tl.from(
          "[data-line]",
          {
            scaleX: 0,
            duration: 0.7,
            ease: "power2.inOut",
            transformOrigin: (i: number) =>
              i === 0 ? "right center" : "left center",
          },
          "-=0.5",
        );
      }
    },
    { scope: container },
  );
}

/** Horizontal shake used when a submit fails validation. */
export function shake(
  targets: Element | Element[] | NodeListOf<Element> | null | undefined,
) {
  if (!targets || prefersReducedMotion()) return;
  if ("length" in targets && targets.length === 0) return;

  gsap.to(targets, {
    keyframes: { x: [-8, 8, -5, 5, 0], easeEach: "power1.inOut" },
    duration: 0.4,
  });
}
