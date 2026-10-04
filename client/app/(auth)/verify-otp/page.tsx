"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import type {
  ClipboardEvent,
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
} from "react";
import gsap from "gsap";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/common/FieldError";
import {
  prefersReducedMotion,
  shake,
  useAuthEntrance,
} from "@/hooks/UseAuthAnimation";
import {
  useVerifyOtp,
  useForgotPassword,
  getErrorMessage,
} from "@/hooks/use-auth";
import { toast } from "sonner";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const VerifyOtpForm = () => {
  const container = useRef<HTMLDivElement>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email");

  const verifyOtp = useVerifyOtp();
  const forgotPassword = useForgotPassword();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useAuthEntrance(container);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const focusInput = (index: number) => inputs.current[index]?.focus();

  const updateDigit = (index: number, value: string) =>
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

  const fillFrom = (start: number, value: string) => {
    const chars = value.slice(0, OTP_LENGTH - start).split("");
    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((char, i) => {
        next[start + i] = char;
      });
      return next;
    });
    setError("");
    focusInput(Math.min(start + chars.length, OTP_LENGTH - 1));
  };

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");

    if (!value) {
      updateDigit(index, "");
      return;
    }
    if (value.length > 1) {
      fillFrom(index, value);
      return;
    }

    updateDigit(index, value);
    setError("");

    if (!prefersReducedMotion()) {
      gsap.fromTo(
        e.target,
        { scale: 0.9 },
        { scale: 1, duration: 0.2, ease: "power2.out" },
      );
    }
    if (index < OTP_LENGTH - 1) focusInput(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      updateDigit(index - 1, "");
      focusInput(index - 1);
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    }
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    fillFrom(pasted.length >= OTP_LENGTH ? 0 : index, pasted);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = digits.join("");

    if (code.length < OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code`);
      shake(container.current?.querySelectorAll("[data-otp]"));
      return;
    }

    if (!email) {
      setError("Email is missing. Please restart the process.");
      toast.error("Email is missing. Please restart the process.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await verifyOtp.mutateAsync({ email, otp: code });
      sessionStorage.setItem("reset_token", res.data.resetToken);
      toast.success("Code verified successfully.");
      router.push("/reset-password");
    } catch (err) {
      const message = getErrorMessage(err, "Invalid or expired code.");
      setError(message);
      toast.error(message);
      shake(container.current?.querySelectorAll("[data-otp]"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResend = async () => {
    if (seconds > 0 || !email) return;

    try {
      await forgotPassword.mutateAsync(email);
      toast.success("A new code has been sent.");
    } catch {
      // এইখানেও security practice অনুযায়ী error দেখাই না
    } finally {
      setSeconds(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      setError("");
      focusInput(0);
    }
  };

  const timer = `0:${String(seconds).padStart(2, "0")}`;

  return (
    <div ref={container} className="w-full max-w-[420px]">
      <div data-anim="heading" className="mb-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-hb-brand-soft text-hb-ink">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-hb-ink">
          Verify your email
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-hb-muted">
          We sent a {OTP_LENGTH}-digit code to{" "}
          <span className="font-medium text-hb-ink">
            {email ?? "your email"}
          </span>
          . Enter it below to continue.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div data-form-item className="space-y-2">
          <div
            role="group"
            aria-label="Verification code"
            className="grid grid-cols-6 gap-2.5"
          >
            {digits.map((digit, i) => (
              <Input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                data-otp
                value={digit}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                autoFocus={i === 0}
                aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                aria-invalid={!!error}
                onChange={(e) => handleChange(i, e)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={(e) => handlePaste(i, e)}
                onFocus={(e) => e.target.select()}
                className="h-12 rounded-lg border-hb-line bg-hb-surface px-0 text-center text-lg font-semibold text-hb-ink shadow-none transition-shadow focus-visible:ring-2"
              />
            ))}
          </div>
          <FieldError message={error} />
        </div>

        <div data-form-item>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-lg bg-hb-brand text-sm font-medium text-hb-brand-ink shadow-sm transition-all hover:bg-hb-brand/90 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify code"
            )}
          </Button>
        </div>
      </form>

      <p data-form-item className="mt-8 text-center text-sm text-hb-muted">
        Didn&apos;t get the code?{" "}
        {seconds > 0 ? (
          <span className="font-medium tabular-nums text-hb-ink">
            Resend in {timer}
          </span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            className="font-medium text-hb-ink underline underline-offset-4"
          >
            Resend code
          </button>
        )}
      </p>

      <p data-form-item className="mt-4 text-center">
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-hb-muted transition-colors hover:text-hb-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Use a different email
        </Link>
      </p>
    </div>
  );
};

const VerifyOtpPage = () => (
  <Suspense>
    <VerifyOtpForm />
  </Suspense>
);

export default VerifyOtpPage;
