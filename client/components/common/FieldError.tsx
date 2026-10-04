"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "../../hooks/UseAuthAnimation";

/** Error message that slides open when it appears. */
export const FieldError = ({ message }: { message?: string }) => {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      if (!message || !ref.current || prefersReducedMotion()) return;

      gsap.fromTo(
        ref.current,
        { opacity: 0, y: -6, height: 0 },
        {
          opacity: 1,
          y: 0,
          height: "auto",
          duration: 0.28,
          ease: "power2.out",
        },
      );
    },
    { dependencies: [message] },
  );

  if (!message) return null;

  return (
    <p
      ref={ref}
      role="alert"
      className="overflow-hidden text-xs font-medium text-destructive"
    >
      {message}
    </p>
  );
};
