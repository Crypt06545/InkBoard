"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowUp, PenLine } from "lucide-react";
import { gsap, useMotion } from "@/lib/gsap";
import Container from "./Container";

const linkClass =
  "text-hb-deep-ink/70 transition-colors hover:text-hb-deep-ink";

const Footer = () => {
  const root = useRef<HTMLElement>(null);

  useMotion(root, () => {
    gsap
      .timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: root.current, start: "top 92%", once: true },
      })
      .from(".foot-col", { y: 28, opacity: 0, duration: 0.6, stagger: 0.1 })
      .from(".foot-bottom", { opacity: 0, duration: 0.5 }, "-=0.2");
  });

  return (
    <footer ref={root} className="bg-hb-deep text-hb-deep-ink">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div className="foot-col">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight"
          >
            <span className="grid size-8 place-items-center rounded-[10px] bg-hb-brand text-hb-brand-ink">
              <PenLine className="size-[18px]" strokeWidth={2.4} />
            </span>
            Inkboard
          </Link>
          <p className="mt-4 max-w-[34ch] text-hb-deep-ink/70">
            Made for teams who think out loud.
          </p>
        </div>

        <div className="foot-col">
          <h3 className="text-sm font-bold">Product</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href="#tools" className={linkClass}>
                Tools
              </a>
            </li>
            <li>
              <a href="#features" className={linkClass}>
                Features
              </a>
            </li>
          </ul>
        </div>

        <div className="foot-col">
          <h3 className="text-sm font-bold">Account</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Link href="/login" className={linkClass}>
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className={linkClass}>
                Start a board
              </Link>
            </li>
          </ul>
        </div>
      </Container>

      <Container className="foot-bottom flex flex-col items-start justify-between gap-4 border-t border-white/10 py-6 text-sm text-hb-deep-ink/60 sm:flex-row sm:items-center">
        <span>© 2026 Inkboard</span>
        <a
          href="#top"
          className="group inline-flex items-center gap-2 font-semibold text-hb-deep-ink/80 hover:text-hb-deep-ink"
        >
          Back to top
          <ArrowUp className="size-4 transition-transform group-hover:-translate-y-0.5" />
        </a>
      </Container>
    </footer>
  );
};

export default Footer;
