import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check, PenLine } from "lucide-react";

const POINTS = ["Real-time cursors", "AI on the canvas", "PNG & SVG export"];

const Logo = ({ className = "" }: { className?: string }) => (
  <Link
    href="/"
    aria-label="Inkboard home"
    className={`flex items-center gap-2.5 text-xl font-extrabold tracking-tight ${className}`}
  >
    <span className="grid size-8 place-items-center rounded-[10px] bg-hb-brand text-hb-brand-ink">
      <PenLine className="size-[18px]" strokeWidth={2.4} />
    </span>
    Inkboard
  </Link>
);

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="home flex min-h-svh bg-hb-bg text-hb-ink antialiased">
      {/* Left: brand panel */}
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-hb-deep p-10 text-hb-deep-ink lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.12)_1.2px,transparent_1.2px)] bg-[size:24px_24px]"
        />

        <Logo className="relative" />

        <div className="relative max-w-lg">
          <h2 className="text-[clamp(2rem,3.4vw,3rem)] font-extrabold leading-[1.04] tracking-[-0.03em]">
            Think together on one infinite canvas.
          </h2>
          <p className="mt-4 max-w-[44ch] text-lg text-hb-deep-ink/70">
            Sketch, write and map ideas with your team in real time. When you
            get stuck, ask the AI to fill the board for you.
          </p>

          {/* sticky note collage */}
          <div
            aria-hidden="true"
            className="mt-10 grid max-w-md grid-cols-3 items-start gap-4"
          >
            <div className="aspect-square -rotate-[4deg] rounded-md bg-hb-amber p-3 font-hand text-xl leading-[1.1] text-hb-paper-ink shadow-[0_10px_18px_-10px_rgba(0,0,0,0.6)]">
              Who owns the launch email?
            </div>
            <div className="mt-6 aspect-square rotate-[3deg] rounded-md bg-hb-mint p-3 font-hand text-xl leading-[1.1] text-hb-paper-ink shadow-[0_10px_18px_-10px_rgba(0,0,0,0.6)]">
              Pricing page copy
            </div>
            <div className="mt-2 aspect-square -rotate-2 rounded-md bg-hb-peach p-3 font-hand text-xl leading-[1.1] text-hb-paper-ink shadow-[0_10px_18px_-10px_rgba(0,0,0,0.6)]">
              Demo video by Friday
            </div>
          </div>
        </div>

        <div className="relative">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-hb-deep-ink/70">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-hb-deep-ink text-hb-deep">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-hb-deep-ink/50">© 2026 Inkboard</p>
        </div>
      </aside>

      {/* Right: form */}
      <div className="flex min-h-svh flex-1 flex-col bg-hb-bg">
        <header className="flex items-center justify-between px-6 py-5 sm:px-8">
          <Logo className="lg:hidden" />
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-hb-muted transition-colors hover:text-hb-ink"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;
