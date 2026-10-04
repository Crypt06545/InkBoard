"use client";

import { useRef } from "react";
import type { ComponentType } from "react";
import { Download, PenTool, Sparkles, Users } from "lucide-react";
import { gsap, useMotion } from "@/lib/gsap";

import SplitWords from "../common/Splitwords";
import Container from "../common/Container";

type Feature = {
  icon: ComponentType<{ className?: string }>;
  tint: string;
  title: string;
  text: string;
};

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    tint: "bg-hb-amber",
    title: "Ask AI to build or edit",
    text: "Generate sticky notes, outlines, flow diagrams and charts. Select items and tell the AI how to change them, or get a summary with action items.",
  },
  {
    icon: Users,
    tint: "bg-hb-mint",
    title: "Work together, live",
    text: "See everyone's cursor and edits as they happen. Invite people by email as editors or viewers.",
  },
  {
    icon: PenTool,
    tint: "bg-hb-peach",
    title: "Draw, type or drop things in",
    text: "Shapes with an optional hand-drawn style, sticky notes, bullet lists, emoji and charts. Paste or drag in images.",
  },
  {
    icon: Download,
    tint: "bg-hb-sky",
    title: "Take it with you",
    text: "Export any board as PNG or SVG. Undo and redo up to 80 steps.",
  },
];

const Features = () => {
  const root = useRef<HTMLElement>(null);

  useMotion(root, () => {
    /* heading */
    gsap
      .timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: ".feat-head", start: "top 80%", once: true },
      })
      .from(".feat-word", { yPercent: 115, duration: 0.7, stagger: 0.06 });

    /* each row animates on its own as it enters */
    gsap.utils.toArray<HTMLElement>(".feat-row").forEach((row) => {
      const q = gsap.utils.selector(row);
      gsap
        .timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: { trigger: row, start: "top 85%", once: true },
        })
        .from(q(".feat-line"), {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 0.7,
        })
        .from(
          q(".feat-icon"),
          {
            scale: 0.4,
            rotate: -25,
            opacity: 0,
            duration: 0.55,
            ease: "back.out(2)",
          },
          "-=0.45",
        )
        .from(q(".feat-body"), { x: 32, opacity: 0, duration: 0.6 }, "-=0.45");
    });
  });

  return (
    <section ref={root} id="features" className="scroll-mt-24 py-16 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
        <div className="feat-head self-start lg:sticky lg:top-28">
          <h2 className="max-w-[14ch] text-[clamp(1.9rem,4.4vw,3rem)] font-extrabold leading-[1.04] tracking-[-0.03em]">
            <SplitWords
              text="Everything your team needs around the canvas."
              wordClass="feat-word"
            />
          </h2>
        </div>

        <ul>
          {FEATURES.map(({ icon: Icon, tint, title, text }) => (
            <li key={title} className="feat-row relative py-7 last:pb-0">
              <div className="feat-line absolute left-0 right-0 top-0 h-px bg-hb-line" />
              <div className="flex gap-5">
                <span
                  className={`feat-icon grid size-12 shrink-0 place-items-center rounded-2xl text-hb-paper-ink ${tint}`}
                >
                  <Icon className="size-6" />
                </span>
                <div className="feat-body">
                  <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {title}
                  </h3>
                  <p className="mt-2 max-w-[52ch] text-hb-muted">{text}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};

export default Features;
