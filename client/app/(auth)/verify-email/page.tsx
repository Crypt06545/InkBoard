"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useVerifyEmail, getErrorMessage } from "@/hooks/use-auth";
import { toast } from "sonner";

const VerifyEmailContent = () => {
  const params = useSearchParams();
  const token = params.get("token");
  const verifyEmail = useVerifyEmail();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    verifyEmail.mutate(token, {
      onSuccess: (res) => {
        setStatus("success");
        setMessage(res.message);
        toast.success("Email verified successfully.");
      },
      onError: (error) => {
        const message = getErrorMessage(error, "Verification failed.");
        setStatus("error");
        setMessage(message);
        toast.error(message);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="w-full max-w-[420px] text-center">
      {status === "loading" && (
        <>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-hb-ink" />
          <p className="mt-4 text-sm text-hb-muted">Verifying your email...</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-hb-ink" />
          <h1 className="mt-4 text-2xl font-semibold text-hb-ink">
            Email Verified
          </h1>
          <p className="mt-2 text-sm text-hb-muted">{message}</p>
          <Link
            href="/login"
            className="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-hb-brand text-sm font-medium text-hb-brand-ink shadow-sm transition-all hover:bg-hb-brand/90 active:scale-[0.99]"
          >
            Continue to sign in
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-2xl font-semibold text-hb-ink">
            Verification Failed
          </h1>
          <p className="mt-2 text-sm text-hb-muted">{message}</p>
          <Link
            href="/login"
            className="mt-6 flex h-11 w-full items-center justify-center rounded-lg border border-hb-line bg-hb-surface text-sm font-medium text-hb-ink transition-colors hover:bg-hb-brand-soft"
          >
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
};

const VerifyEmailPage = () => (
  <Suspense>
    <VerifyEmailContent />
  </Suspense>
);

export default VerifyEmailPage;
