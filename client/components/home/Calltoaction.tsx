"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useMotion } from "@/lib/gsap";


import { btnInverse, btnOutlineInverse } from "../common/Ui";
import Container from "../common/Container";
import SplitWords from "../common/Splitwords";

const CallToAction = () => {
  const root = useRef<HTMLElement>(null);

  useMotion(root, () => {
    gsap
      .timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
      })
      .from(".cta-panel", { y: 60, opacity: 0, scale: 0.96, duration: 0.8 })
      .from(
        ".cta-word",
        { yPercent: 115, duration: 0.7, stagger: 0.07 },
        "-=0.4",
      )
      .from(
        ".cta-fade",
        { y: 16, opacity: 0, duration: 0.5, stagger: 0.1 },
        "-=0.35",
      )
      .from(
        ".cta-float",
        {
          scale: 0,
          opacity: 0,
          duration: 0.6,
          ease: "back.out(2)",
          stagger: 0.12,
        },
        "-=0.5",
      );

    /* gentle floating shapes */
    gsap.to(".cta-float", {
      y: -14,
      duration: 2.4,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      stagger: { each: 0.6, from: "start" },
    });
  });

  return (
    <section ref={root} className="pb-20 pt-6 sm:pb-28">
      <Container>
        <div className="cta-panel relative isolate overflow-hidden rounded-3xl bg-hb-brand p-8 text-hb-brand-ink sm:p-12 lg:p-16">
          {/* dot pattern */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(currentColor_1.2px,transparent_1.2px)] bg-[size:22px_22px] opacity-20"
          />
          {/* floating paper shapes */}
          <div
            aria-hidden="true"
            className="cta-float absolute -right-6 -top-6 size-24 rounded-full bg-hb-amber sm:size-32"
          />
          <div
            aria-hidden="true"
            className="cta-float absolute bottom-8 right-10 hidden size-14 rotate-12 rounded-xl bg-hb-peach sm:block lg:right-28"
          />

          <h2 className="max-w-[16ch] text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
            <SplitWords
              text="Open a blank board in seconds."
              wordClass="cta-word"
            />
          </h2>
          <p className="cta-fade mt-4 max-w-[44ch] text-lg opacity-85">
            Start sketching now and invite your team when you&apos;re ready.
          </p>
          <div className="cta-fade mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className={btnInverse}>
              Start a board
            </Link>
            <Link href="/login" className={btnOutlineInverse}>
              Sign in
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default CallToAction;
