"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, PenLine, X } from "lucide-react";
import { gsap, useGSAP, useMotion } from "@/lib/gsap";

import { btnGhost, btnPrimary } from "../common/Ui";
import Container from "../common/Container";

const LINKS = [
  { href: "#tools", label: "Tools" },
  { href: "#features", label: "Features" },
];

const Navbar = () => {
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  /* glass + border once the page scrolls */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* entrance + scroll progress bar */
  useMotion(root, () => {
    gsap.from(root.current, {
      yPercent: -100,
      duration: 0.7,
      ease: "power3.out",
    });
    gsap.from(".nav-item", {
      y: -12,
      opacity: 0,
      duration: 0.5,
      stagger: 0.07,
      delay: 0.25,
      ease: "power2.out",
    });
    gsap.fromTo(
      progress.current,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: document.documentElement,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.2,
        },
      },
    );
  });

  /* mobile menu open / close */
  useGSAP(
    () => {
      const el = panel.current;
      if (!el) return;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      gsap.to(el, {
        height: open ? "auto" : 0,
        opacity: open ? 1 : 0,
        duration: reduce ? 0 : 0.35,
        ease: "power2.out",
      });
      if (open && !reduce) {
        gsap.from(".m-link", {
          y: -10,
          opacity: 0,
          duration: 0.3,
          stagger: 0.06,
          delay: 0.1,
        });
      }
    },
    { scope: root, dependencies: [open] },
  );

  const close = () => setOpen(false);

  return (
    <header
      ref={root}
      data-scrolled={scrolled || open}
      className="sticky top-0 z-50 w-full border-b border-transparent pt-[env(safe-area-inset-top)] transition-[background-color,border-color,box-shadow] duration-300 data-[scrolled=true]:border-hb-line data-[scrolled=true]:bg-hb-bg/85 data-[scrolled=true]:shadow-[0_10px_30px_-20px_rgba(11,31,42,0.45)] data-[scrolled=true]:backdrop-blur-xl"
    >
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          onClick={close}
          aria-label="Inkboard home"
          className="nav-item flex items-center gap-2.5 text-xl font-extrabold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-[10px] bg-hb-brand text-hb-brand-ink">
            <PenLine className="size-[18px]" strokeWidth={2.4} />
          </span>
          Inkboard
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="nav-item rounded-full px-4 py-2 text-[15px] font-semibold text-hb-muted transition-colors hover:text-hb-ink"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            className="nav-item rounded-full px-4 py-2 text-[15px] font-semibold text-hb-muted transition-colors hover:text-hb-ink"
          >
            Sign in
          </Link>
          <Link href="/dashboard" className={`nav-item ml-2 ${btnPrimary}`}>
            Start a board
          </Link>
        </nav>

        <button
          type="button"
          className="nav-item grid size-11 place-items-center rounded-full border border-hb-line bg-hb-surface md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </Container>

      {/* mobile panel */}
      <div
        id="mobile-menu"
        ref={panel}
        aria-hidden={!open}
        inert={!open}
        className="h-0 overflow-hidden opacity-0 md:hidden"
      >
        <Container className="flex flex-col gap-1 pb-5 pt-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={close}
              className="m-link rounded-xl px-3 py-3 text-lg font-semibold hover:bg-hb-brand-soft"
            >
              {l.label}
            </a>
          ))}
          <div className="m-link mt-2 grid grid-cols-2 gap-3">
            <Link href="/login" onClick={close} className={btnGhost}>
              Sign in
            </Link>
            <Link href="/dashboard" onClick={close} className={btnPrimary}>
              Start a board
            </Link>
          </div>
        </Container>
      </div>

      {/* scroll progress */}
      <div
        ref={progress}
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-hb-brand"
        style={{ transform: "scaleX(0)" }}
      />
    </header>
  );
};

export default Navbar;
