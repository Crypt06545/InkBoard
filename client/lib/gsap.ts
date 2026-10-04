import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

/**
 * Runs `setup` inside a scoped gsap.matchMedia, only when the user has NOT
 * asked for reduced motion. Everything created inside is cleaned up on unmount.
 */
export const useMotion = (
  scope: RefObject<HTMLElement | null>,
  setup: () => void | (() => void),
  dependencies: unknown[] = [],
) => {
  useGSAP(
    () => {
      const mm = gsap.matchMedia(scope.current ?? undefined);
      mm.add("(prefers-reduced-motion: no-preference)", setup);
      return () => mm.revert();
    },
    { scope, dependencies },
  );
};

export { gsap, ScrollTrigger, useGSAP };
