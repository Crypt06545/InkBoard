"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { gsap, useMotion } from "@/lib/gsap";


import Container from "../common/Container";
import FlowDiagram from "./Flowdiagram";

type Stroke = { color: string; d: string };
type Wander = { pts: [number, number][]; speed: number };

const COLORS = [
  { value: "var(--hb-ink)", label: "Ink" },
  { value: "var(--hb-brand)", label: "Teal" },
  { value: "var(--hb-accent)", label: "Orange" },
];

/* cursor paths as fractions (0..1) of the scene area */
const WANDER: Record<string, Wander> = {
  c1: {
    pts: [
      [0.1, 0.25],
      [0.35, 0.6],
      [0.55, 0.2],
      [0.25, 0.8],
    ],
    speed: 1.8,
  },
  c2: {
    pts: [
      [0.75, 0.7],
      [0.6, 0.4],
      [0.9, 0.5],
      [0.7, 0.15],
    ],
    speed: 2.1,
  },
};

const Cursor = ({
  id,
  name,
  tone,
}: {
  id: string;
  name: string;
  tone: "1" | "2";
}) => (
  <div
    id={id}
    className="cur pointer-events-none absolute left-0 top-0 z-10 flex items-start gap-1"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      className={tone === "1" ? "fill-hb-cur1" : "fill-hb-cur2"}
      stroke="#fff"
      strokeWidth="1.6"
    >
      <path d="M3 2l17 8-7 2-2 7z" />
    </svg>
    <b
      className={`mt-3.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${
        tone === "1" ? "bg-hb-cur1" : "bg-hb-cur2"
      }`}
    >
      {name}
    </b>
  </div>
);

const DemoBoard = () => {
  const root = useRef<HTMLElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const drawing = useRef<boolean>(false);
  const [color, setColor] = useState<string>(COLORS[0].value);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  /* ---------- drawing ---------- */
  const point = (e: ReactPointerEvent<HTMLDivElement>): [string, string] => {
    const el = board.current;
    if (!el) return ["0", "0"];
    const r = el.getBoundingClientRect();
    return [(e.clientX - r.left).toFixed(1), (e.clientY - r.top).toFixed(1)];
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = board.current;
    if (!el || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-nodraw]")) return;
    el.setPointerCapture(e.pointerId);
    drawing.current = true;
    const [x, y] = point(e);
    setStrokes((s) => [...s, { color, d: `M${x} ${y}` }]);
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drawing.current) return;
    const [x, y] = point(e);
    setStrokes((s) => {
      if (s.length === 0) return s;
      const copy = s.slice();
      const last = copy[copy.length - 1];
      copy[copy.length - 1] = { ...last, d: `${last.d} L${x} ${y}` };
      return copy;
    });
  };

  const onUp = () => {
    drawing.current = false;
  };

  /* ---------- animation ---------- */
  useMotion(root, () => {
    const area = scene.current;
    if (!area) return;

    /* keep cursor chips inside the scene */
    const px = (f: number) => f * Math.max(0, area.clientWidth - 110);
    const py = (f: number) => f * Math.max(0, area.clientHeight - 40);

    /* prepare the arrows so they can be "drawn" */
    const lines = gsap.utils.toArray<SVGPathElement>(".flow-line");
    lines.forEach((l) => {
      const len = l.getTotalLength();
      gsap.set(l, { strokeDasharray: len, strokeDashoffset: len });
    });

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      scrollTrigger: { trigger: board.current, start: "top 82%", once: true },
    });
    tl.from(board.current, { y: 56, opacity: 0, duration: 0.8 })
      .from(
        "[data-nodraw]",
        { opacity: 0, y: -12, duration: 0.4, stagger: 0.1 },
        "-=0.4",
      )
      .from(
        ".note",
        {
          y: -40,
          opacity: 0,
          scale: 0.9,
          duration: 0.6,
          ease: "back.out(1.5)",
          stagger: 0.12,
        },
        "-=0.2",
      )
      .from(
        ".flow-node",
        {
          scale: 0.6,
          opacity: 0,
          transformOrigin: "50% 50%",
          duration: 0.45,
          ease: "back.out(1.6)",
          stagger: 0.12,
        },
        "-=0.3",
      )
      .to(
        lines,
        {
          strokeDashoffset: 0,
          duration: 0.6,
          stagger: 0.15,
          ease: "power1.inOut",
        },
        "-=0.2",
      )
      .from(
        ".flow-label",
        { opacity: 0, duration: 0.4, stagger: 0.06 },
        "-=0.5",
      )
      .from(".cur", { opacity: 0, duration: 0.5 }, "-=0.2");

    /* remote cursors wander forever */
    Object.entries(WANDER).forEach(([id, { pts, speed }]) => {
      gsap.set(`#${id}`, { x: px(pts[0][0]), y: py(pts[0][1]) });
      const t = gsap.timeline({ repeat: -1, delay: 1.2 });
      [...pts.slice(1), pts[0]].forEach(([fx, fy]) => {
        t.to(`#${id}`, {
          x: () => px(fx),
          y: () => py(fy),
          duration: speed,
          ease: "power2.inOut",
        }).to(`#${id}`, { duration: 0.6 });
      });
    });
  });

  return (
    <section ref={root} id="demo" className="scroll-mt-24 pb-6 pt-2">
      <Container>
        <div
          ref={board}
          aria-label="Interactive demo whiteboard. Draw anywhere on it."
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="relative isolate flex min-h-[460px] cursor-crosshair touch-none flex-col overflow-hidden rounded-3xl border border-hb-line bg-hb-surface bg-[radial-gradient(var(--hb-dot)_1.4px,transparent_1.4px)] bg-[size:24px_24px] shadow-[0_30px_60px_-34px_rgba(11,31,42,0.45)] sm:min-h-[520px]"
        >
          {/* top bar */}
          <div
            data-nodraw
            className="relative z-30 flex cursor-default items-center justify-between gap-3 border-b border-hb-line bg-hb-surface/85 px-4 py-3 text-sm font-semibold backdrop-blur"
          >
            <span className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-hb-brand" />
              Q4 launch plan
            </span>
            <span className="flex items-center pl-2 font-medium text-hb-muted">
              <span className="mr-3 hidden sm:inline">3 editing</span>
              {[
                ["MR", "bg-hb-amber"],
                ["AK", "bg-hb-mint"],
                ["JS", "bg-hb-peach"],
              ].map(([n, c]) => (
                <span
                  key={n}
                  className={`-ml-2 grid size-7 place-items-center rounded-full border-2 border-hb-surface text-[11px] font-extrabold text-hb-paper-ink first:ml-0 ${c}`}
                >
                  {n}
                </span>
              ))}
            </span>
          </div>

          {/* scene: notes + diagram */}
          <div
            ref={scene}
            className="relative grid flex-1 items-center gap-8 px-4 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.1fr_1fr] lg:gap-10"
          >
            <div className="pointer-events-none grid grid-cols-3 items-start gap-2 sm:gap-4">
              <div className="note aspect-square -rotate-[4deg] select-none rounded-md bg-hb-amber p-2 font-hand text-[15px] leading-[1.1] text-hb-paper-ink shadow-[0_10px_18px_-10px_rgba(3,12,16,0.5)] sm:p-3.5 sm:text-xl lg:text-2xl">
                Who owns the launch email?
              </div>
              <div className="note mt-4 aspect-square rotate-[3deg] select-none rounded-md bg-hb-mint p-2 font-hand text-[15px] leading-[1.1] text-hb-paper-ink shadow-[0_10px_18px_-10px_rgba(3,12,16,0.5)] sm:mt-8 sm:p-3.5 sm:text-xl lg:text-2xl">
                Pricing page copy
              </div>
              <div className="note mt-1 aspect-square -rotate-2 select-none rounded-md bg-hb-peach p-2 font-hand text-[15px] leading-[1.1] text-hb-paper-ink shadow-[0_10px_18px_-10px_rgba(3,12,16,0.5)] sm:mt-3 sm:p-3.5 sm:text-xl lg:text-2xl">
                Demo video by Friday
              </div>
            </div>

            <FlowDiagram />

            <Cursor id="c1" name="Amina" tone="1" />
            <Cursor id="c2" name="Jonas" tone="2" />
          </div>

          {/* ink layer */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          >
            {strokes.map((s, i) => (
              <path
                key={i}
                d={s.d}
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ stroke: s.color }}
              />
            ))}
          </svg>

          {/* pen tools */}
          <div
            data-nodraw
            role="toolbar"
            aria-label="Pen colour"
            className="relative z-30 mx-auto mb-4 flex cursor-default items-center gap-2 rounded-full border border-hb-line bg-hb-surface px-3 py-2"
          >
            {COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                aria-label={c.label}
                aria-pressed={color === c.value}
                onClick={() => setColor(c.value)}
                style={{ background: c.value }}
                className="size-6 cursor-pointer rounded-full border-[3px] border-hb-surface outline-1 outline-hb-line transition-transform hover:scale-110 aria-pressed:outline-2 aria-pressed:outline-hb-ink"
              />
            ))}
            <button
              type="button"
              onClick={() => setStrokes([])}
              className="cursor-pointer rounded-full px-2 py-1 text-sm font-semibold text-hb-muted transition-colors hover:text-hb-ink"
            >
              Clear
            </button>
          </div>
        </div>

        <p className="mt-4 px-1 text-sm text-hb-muted">
          This board is live. Draw on it with your mouse or finger.
        </p>
      </Container>
    </section>
  );
};

export default DemoBoard;
