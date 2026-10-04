"use client";

import { forwardRef, useState } from "react";
import type { InputHTMLAttributes, MouseEvent } from "react";
import gsap from "gsap";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "../../hooks/UseAuthAnimation";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Password field with a show/hide toggle. Works with react-hook-form's register(). */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false);

    const toggle = (e: MouseEvent<HTMLButtonElement>) => {
      setShow((prev) => !prev);

      if (prefersReducedMotion()) return;

      gsap.fromTo(
        e.currentTarget,
        { scale: 0.7 },
        { scale: 1, duration: 0.35, ease: "back.out(2)" },
      );
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn(
            "h-11 rounded-lg px-3.5 pr-11 shadow-none transition-shadow focus-visible:ring-2",
            className,
          )}
          {...props}
        />

        <button
          type="button"
          onClick={toggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? (
            <EyeOff className="h-[18px] w-[18px]" />
          ) : (
            <Eye className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
