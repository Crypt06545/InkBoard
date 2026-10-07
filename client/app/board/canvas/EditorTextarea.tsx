"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";

const BULLET = "• ";

type EditorTextareaProps = {
  defaultValue: string;
  placeholder?: string;
  style: CSSProperties;
  bullet?: boolean;
  onCommit: (value: string) => void;
  /* ⚠️ প্রতি keystroke এ instant live broadcast — কোনো throttle নেই */
  onLiveChange?: (value: string) => void;
  /* text-er asol content height (px), likhar shathe shathe */
  onFit: (contentHeight: number) => void;
};

const measure = (el: HTMLTextAreaElement) => {
  const prev = el.style.height;
  el.style.height = "0px";
  const height = el.scrollHeight;
  el.style.height = prev;
  return height;
};

/* Bullet prefix strip করার helper — commit আর live দুইজায়গায় দরকার */
const stripBullets = (value: string, bullet: boolean) =>
  bullet
    ? value
        .split("\n")
        .map((line) => line.replace(/^•\s?/, ""))
        .join("\n")
    : value;

const EditorTextarea = ({
  defaultValue,
  placeholder,
  style,
  bullet = false,
  onCommit,
  onLiveChange,
  onFit,
}: EditorTextareaProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const report = () => {
    if (ref.current) onFit(measure(ref.current));
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
    onFit(measure(el));
    // shudhu mount e ekbar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <textarea
      ref={ref}
      defaultValue={defaultValue}
      placeholder={placeholder}
      spellCheck={false}
      onPointerDown={(event) => event.stopPropagation()}
      onInput={(event) => {
        // Resize height (auto-grow)
        report();

        // ✅ Instant live broadcast — কোনো debounce/throttle নেই
        if (onLiveChange) {
          const value = stripBullets(event.currentTarget.value, bullet);
          onLiveChange(value);
        }
      }}
      onBlur={(event) => {
        // Blur এ authoritative commit (DB save)
        const value = stripBullets(event.target.value, bullet);
        onCommit(value);
      }}
      onKeyDown={(event) => {
        const el = event.currentTarget;

        if (event.key === "Escape") {
          el.blur();
          return;
        }

        if (!bullet) return;

        /* Enter: notun bullet line */
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          el.setRangeText(
            "\n" + BULLET,
            el.selectionStart,
            el.selectionEnd,
            "end",
          );
          report();
          return;
        }

        /* Backspace: khali bullet line muche dao */
        if (
          event.key === "Backspace" &&
          el.selectionStart === el.selectionEnd
        ) {
          const pos = el.selectionStart;
          const lineStart = el.value.lastIndexOf("\n", pos - 1) + 1;

          if (el.value.slice(lineStart, pos) === BULLET) {
            event.preventDefault();
            el.setRangeText("", Math.max(0, lineStart - 1), pos, "end");
            report();
          }
        }
      }}
      style={{ ...style, overflow: "hidden" }}
    />
  );
};

export default EditorTextarea;
