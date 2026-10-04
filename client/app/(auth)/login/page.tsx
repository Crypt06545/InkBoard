"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/common/FieldError";
import { useAuthEntrance, shake } from "@/hooks/UseAuthAnimation";
import { useLogin, getErrorMessage } from "@/hooks/use-auth";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const container = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLogin();

  useAuthEntrance(container);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const res = await loginMutation.mutateAsync(data);

      if (res.data.twoFactorRequired && res.data.tempToken) {
        sessionStorage.setItem("2fa_temp_token", res.data.tempToken);
        toast.info("Enter your 2FA code to continue.");
        router.push("/verify-2fa");
        return;
      }

      toast.success("Logged in successfully.");
      router.push("/");
    } catch (error) {
      const message = getErrorMessage(error, "Invalid email or password.");
      toast.error(message);
      setError("root", { message });
    }
  };

  const onInvalid = () =>
    shake(container.current?.querySelectorAll("input[aria-invalid='true']"));

  const togglePassword = () => setShowPassword((prev) => !prev);

  return (
    <div ref={container} className="w-full max-w-[420px]">
      <div data-anim="heading" className="mb-8">
        <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-hb-ink">
          Welcome back
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-hb-muted">
          Sign in to your account to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5">
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
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-hb-ink"
            >
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-hb-muted transition-colors hover:text-hb-ink"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              className="h-11 rounded-lg border-hb-line bg-hb-surface px-3.5 pr-11 text-hb-ink shadow-none transition-shadow placeholder:text-hb-muted focus-visible:ring-2"
              {...register("password")}
            />
            <button
              type="button"
              onClick={togglePassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-hb-muted transition-colors hover:text-hb-ink"
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
          <FieldError message={errors.password?.message} />
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
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </div>
      </form>

      <p data-form-item className="mt-8 text-center text-sm text-hb-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-hb-ink underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
