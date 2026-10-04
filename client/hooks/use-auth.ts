// hooks/use-auth.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useAuthStore } from "@/store/auth-store";
import {
  disable2faApi,
  enable2faApi,
  forgotPasswordApi,
  generate2faApi,
  loginApi,
  logoutApi,
  registerApi,
  resendVerificationApi,
  resetPasswordApi,
  verify2faLoginApi,
  verifyEmailApi,
  verifyOtpApi,
  verifyRecoveryCodeApi,
  type LoginPayload,
  type RegisterPayload,
} from "@/lib/api/auth.api";

// Backend সবসময় { success, message, statusCode } shape এ error পাঠায়,
// এইখান থেকে সরাসরি message বের করার helper
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

export const useRegister = () =>
  useMutation({
    mutationFn: (payload: RegisterPayload) => registerApi(payload),
  });

export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginApi(payload),
    onSuccess: (res) => {
      // 2FA লাগলে token সেট করবো না, login এখনো সম্পূর্ণ হয়নি
      if (res.data.twoFactorRequired) return;

      if (res.data.accessToken && res.data.user) {
        setAuth(res.data.accessToken, res.data.user);
      }
    },
  });
};

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (email: string) => forgotPasswordApi(email),
  });

export const useVerifyOtp = () =>
  useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) =>
      verifyOtpApi(email, otp),
  });

export const useResetPassword = () =>
  useMutation({
    mutationFn: ({
      resetToken,
      newPassword,
    }: {
      resetToken: string;
      newPassword: string;
    }) => resetPasswordApi(resetToken, newPassword),
  });

export const useVerifyEmail = () =>
  useMutation({
    mutationFn: (token: string) => verifyEmailApi(token),
  });

export const useResendVerification = () =>
  useMutation({
    mutationFn: (email: string) => resendVerificationApi(email),
  });

export const useLogout = () => {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => clearAuth(),
  });
};

// ─── 2FA ───

export const useGenerate2fa = () => useMutation({ mutationFn: generate2faApi });

export const useEnable2fa = () =>
  useMutation({ mutationFn: (code: string) => enable2faApi(code) });

export const useDisable2fa = () =>
  useMutation({
    mutationFn: ({ password, code }: { password: string; code: string }) =>
      disable2faApi(password, code),
  });

export const useVerify2faLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: ({
      tempToken,
      code,
      trustDevice,
    }: {
      tempToken: string;
      code: string;
      trustDevice: boolean;
    }) => verify2faLoginApi(tempToken, code, trustDevice),
    onSuccess: (res) => {
      setAuth(res.data.accessToken, res.data.user);
    },
  });
};

export const useVerifyRecoveryCode = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: ({
      tempToken,
      recoveryCode,
      trustDevice,
    }: {
      tempToken: string;
      recoveryCode: string;
      trustDevice: boolean;
    }) => verifyRecoveryCodeApi(tempToken, recoveryCode, trustDevice),
    onSuccess: (res) => {
      setAuth(res.data.accessToken, res.data.user);
    },
  });
};
