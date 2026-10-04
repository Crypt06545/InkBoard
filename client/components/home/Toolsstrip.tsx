"use client";

import { useRef } from "react";
import type { ComponentType } from "react";
import {
  ArrowRight,
  BarChart3,
  Circle,
  Diamond,
  Eraser,
  Feather,
  Hand,
  Image as ImageIcon,
  List,
  Minus,
  MousePointer2,
  Pencil,
  Smile,
  Square,
  StickyNote,
  Type,
} from "lucide-react";
import { gsap, useMotion } from "@/lib/gsap";

import SplitWords from "../common/Splitwords";
import Container from "../common/Container";

type Tool = {
  icon: ComponentType<{ className?: string }>;
  name: string;
  key?: string;
};

const TOOLS: Tool[] = [
  { icon: MousePointer2, name: "Select", key: "V" },
  { icon: Hand, name: "Pan", key: "H" },
  { icon: Type, name: "Text", key: "T" },
  { icon: Feather, name: "Handwriting", key: "G" },
  { icon: StickyNote, name: "Sticky note", key: "S" },
  { icon: List, name: "Bullet list", key: "B" },
  { icon: Square, name: "Rectangle", key: "R" },
  { icon: Circle, name: "Ellipse", key: "O" },
  { icon: Diamond, name: "Diamond", key: "D" },
  { icon: Minus, name: "Line", key: "L" },
  { icon: ArrowRight, name: "Arrow", key: "A" },
  { icon: Pencil, name: "Draw", key: "P" },
  { icon: Eraser, name: "Eraser", key: "E" },
  { icon: Smile, name: "Emoji" },
  { icon: ImageIcon, name: "Image" },
  { icon: BarChart3, name: "Chart" },
];

const ToolsStrip = () => {
  const root = useRef<HTMLElement>(null);

  useMotion(root, () => {
    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
    });
    tl.from(".tools-word", { yPercent: 115, duration: 0.7, stagger: 0.06 })
      .from(".tools-sub", { y: 16, opacity: 0, duration: 0.5 }, "-=0.4")
      .from(
        ".tool-chip",
        {
          y: 24,
          opacity: 0,
          scale: 0.85,
          duration: 0.5,
          ease: "back.out(1.6)",
          stagger: { each: 0.04, grid: [4, 4], from: "start" },
        },
        "-=0.3",
      );
  });

  return (
    <section ref={root} id="tools" className="scroll-mt-24 py-16 sm:py-24">
      <Container>
        <h2 className="max-w-[18ch] text-[clamp(1.9rem,4.4vw,3rem)] font-extrabold leading-[1.04] tracking-[-0.03em]">
          <SplitWords
            text="One toolbar for everything you sketch."
            wordClass="tools-word"
          />
        </h2>
        <p className="tools-sub mt-4 max-w-[52ch] text-hb-muted sm:text-lg">
          Every tool has a single-key shortcut, so your hands never leave the
          canvas.
        </p>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TOOLS.map(({ icon: Icon, name, key }) => (
            <li
              key={name}
              className="tool-chip flex items-center gap-3 rounded-2xl border border-hb-line bg-hb-surface p-3 transition-[translate,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-hb-brand hover:shadow-[0_14px_28px_-18px_var(--hb-brand)]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-hb-brand-soft text-hb-brand">
                <Icon className="size-[18px]" />
              </span>
              <span className="truncate text-sm font-semibold">{name}</span>
              {key && (
                <kbd className="ml-auto rounded-md border border-hb-line px-1.5 py-0.5 font-sans text-xs font-semibold text-hb-muted">
                  {key}
                </kbd>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};

export default ToolsStrip;
