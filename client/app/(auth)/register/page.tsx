"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { GoogleIcon } from "@/components/common/GoogleIcon";
import { FieldError } from "@/components/common/FieldError";
import { PasswordInput } from "@/components/common/PasswordInput";
import { shake, useAuthEntrance } from "@/hooks/UseAuthAnimation";
import { useRegister, getErrorMessage } from "@/hooks/use-auth";
import { toast } from "sonner";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Full name is required")
      .min(2, "Full name must be at least 2 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    terms: z.boolean().refine((value) => value === true, {
      message: "You must accept the Terms and Privacy Policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// Register সফল হলে এইটা দেখাবে — email এ link গেছে, code না, তাই OTP box দরকার নাই
const CheckEmailNotice = ({ email }: { email: string }) => {
  const container = useRef<HTMLDivElement>(null);
  useAuthEntrance(container);

  return (
    <div ref={container} className="w-full max-w-[420px]">
      <div data-anim="heading" className="mb-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-hb-brand-soft text-hb-ink">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-hb-ink">
          Check your inbox
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-hb-muted">
          We sent a verification link to{" "}
          <span className="font-medium text-hb-ink">{email}</span>. Click the
          link in that email to activate your account, then sign in.
        </p>
      </div>

      <div data-form-item>
        <Link
          href="/login"
          className="flex h-11 w-full items-center justify-center rounded-lg bg-hb-brand text-sm font-medium text-hb-brand-ink shadow-sm transition-all hover:bg-hb-brand/90 active:scale-[0.99]"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const container = useRef<HTMLDivElement>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const registerMutation = useRegister();

  useAuthEntrance(container);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await registerMutation.mutateAsync({
        name: data.fullName,
        email: data.email,
        password: data.password,
      });
      toast.success("Account created! Check your email to verify.");
      setRegisteredEmail(data.email);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Registration failed. Please try again.",
      );
      toast.error(message);
      setError("root", { message });
    }
  };

  const onInvalid = () =>
    shake(container.current?.querySelectorAll("input[aria-invalid='true']"));

  if (registeredEmail) return <CheckEmailNotice email={registeredEmail} />;

  return (
    <div ref={container} className="w-full max-w-[420px]">
      {/* Heading */}
      <div data-anim="heading" className="mb-8">
        <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-hb-ink">
          Create your account
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-hb-muted">
          Sign up to get started. It only takes a minute.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5">
        <div data-form-item className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium text-hb-ink">
            Full name
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Your full name"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            className="h-11 rounded-lg border-hb-line bg-hb-surface px-3.5 text-hb-ink shadow-none transition-shadow placeholder:text-hb-muted focus-visible:ring-2"
            {...register("fullName")}
          />
          <FieldError message={errors.fullName?.message} />
        </div>

        <div data-form-item className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-hb-ink">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            className="h-11 rounded-lg border-hb-line bg-hb-surface px-3.5 text-hb-ink shadow-none transition-shadow placeholder:text-hb-muted focus-visible:ring-2"
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div data-form-item className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-hb-ink">
            Password
          </Label>
          <PasswordInput
            id="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <div data-form-item className="space-y-2">
          <Label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-hb-ink"
          >
            Confirm password
          </Label>
          <PasswordInput
            id="confirmPassword"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          <FieldError message={errors.confirmPassword?.message} />
        </div>

        <div data-form-item className="space-y-2">
          <div className="flex items-start gap-2">
            <input
              id="terms"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-hb-line accent-hb-brand"
              {...register("terms")}
            />
            <Label
              htmlFor="terms"
              className="cursor-pointer text-sm font-normal leading-5 text-hb-muted"
            >
              <span>
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-medium text-hb-ink underline underline-offset-2"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-hb-ink underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </Label>
          </div>
          <FieldError message={errors.terms?.message} />
        </div>

        <FieldError message={errors.root?.message} />

        <div data-form-item>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-lg bg-hb-brand text-sm font-medium text-hb-brand-ink shadow-sm transition-all hover:bg-hb-brand/90 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </div>
      </form>

      <div data-form-item className="my-7 flex items-center gap-4">
        <div data-line className="h-px flex-1 bg-hb-line" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-hb-muted">
          Or continue with
        </span>
        <div data-line className="h-px flex-1 bg-hb-line" />
      </div>

      <div data-form-item>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-lg border-hb-line bg-hb-surface text-sm font-medium text-hb-ink shadow-none transition-colors hover:bg-hb-brand-soft"
        >
          <GoogleIcon className="mr-2.5 h-[18px] w-[18px]" />
          Continue with Google
        </Button>
      </div>

      <p data-form-item className="mt-8 text-center text-sm text-hb-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-hb-ink underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default RegisterPage;
