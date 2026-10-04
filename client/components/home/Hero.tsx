"use client";

import { useRef } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { gsap, useMotion } from "@/lib/gsap";
import Container from "../common/Container";
import SplitWords from "../common/Splitwords";
import { btnGhost, btnPrimary } from "../common/Ui";

const POINTS = ["Real-time cursors", "AI on the canvas", "PNG & SVG export"];

const Hero = () => {
  const root = useRef<HTMLElement | null>(null);

  useMotion(root, () => {
    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
    });

    tl.from(
      ".hero-glow",
      {
        opacity: 0,
        duration: 1.2,
      },
      0,
    )
      .from(
        ".hero-word",
        {
          yPercent: 115,
          duration: 0.85,
          stagger: 0.07,
        },
        0.15,
      )
      .from(
        ".hero-fade",
        {
          y: 18,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
        },
        "-=0.45",
      )
      .from(
        ".hero-check",
        {
          scale: 0,
          duration: 0.4,
          stagger: 0.1,
          ease: "back.out(2)",
        },
        "-=0.3",
      );
  });

  return (
    <section ref={root} className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="hero-glow hb-glow pointer-events-none absolute inset-0 -z-10"
      />

      <Container className="pb-10 pt-12 sm:pt-16 lg:pt-24">
        <h1
          aria-label="Think together on one infinite canvas."
          className="max-w-[14ch] text-[clamp(2.5rem,7.2vw,5.25rem)] font-extrabold leading-[0.98] tracking-[-0.04em]"
        >
          <SplitWords
            text="Think together on one infinite canvas."
            wordClass="hero-word"
          />
        </h1>

        <p className="hero-fade mt-6 max-w-[52ch] text-lg text-hb-muted sm:text-xl">
          Sketch, write and map ideas with your team in real time. When you get
          stuck, ask the AI to fill the board for you.
        </p>

        <div className="hero-fade mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard" className={btnPrimary}>
            Start a board
          </Link>

          <a href="#features" className={btnGhost}>
            See what&apos;s inside
          </a>
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-hb-muted">
          {POINTS.map((p) => (
            <li key={p} className="hero-fade flex items-center gap-2">
              <span className="hero-check grid size-5 place-items-center rounded-full bg-hb-brand text-hb-brand-ink">
                <Check className="size-3" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};

export default Hero;
