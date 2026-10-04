const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hb-brand";

export const btnPrimary = `${base} bg-hb-brand text-hb-brand-ink hover:shadow-[0_12px_28px_-12px_var(--hb-brand)]`;

export const btnGhost = `${base} border border-hb-line bg-hb-surface text-hb-ink hover:border-hb-ink`;

export const btnInverse = `${base} bg-hb-brand-ink text-hb-brand hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.6)]`;

export const btnOutlineInverse = `${base} border border-hb-brand-ink/40 text-hb-brand-ink hover:border-hb-brand-ink`;
