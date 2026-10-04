// lib/api/auth.api.ts
import { API } from "@/lib/axios";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  data: {
    twoFactorRequired?: boolean;
    tempToken?: string;
    accessToken?: string;
    user?: { id: string; name: string; email: string };
  };
}

export const registerApi = (payload: RegisterPayload) =>
  API.post("/auth/register", payload).then((res) => res.data);

export const loginApi = (payload: LoginPayload): Promise<LoginResponse> =>
  API.post("/auth/login", payload).then((res) => res.data);

export const forgotPasswordApi = (email: string) =>
  API.post("/auth/forgot-password", { email }).then((res) => res.data);

export const verifyOtpApi = (email: string, otp: string) =>
  API.post("/auth/verify-otp", { email, otp }).then((res) => res.data);

export const resetPasswordApi = (resetToken: string, newPassword: string) =>
  API.post("/auth/reset-password", { resetToken, newPassword }).then(
    (res) => res.data,
  );

export const verifyEmailApi = (token: string) =>
  API.get("/auth/verify-email", { params: { token } }).then((res) => res.data);

export const resendVerificationApi = (email: string) =>
  API.post("/auth/resend-verification", { email }).then((res) => res.data);

export const logoutApi = () => API.post("/auth/logout").then((res) => res.data);

export const getMeApi = () => API.get("/auth/me").then((res) => res.data);

// ─── 2FA ───

export const generate2faApi = () =>
  API.post("/auth/2fa/generate").then((res) => res.data);

export const enable2faApi = (code: string) =>
  API.post("/auth/2fa/enable", { code }).then((res) => res.data);

export const disable2faApi = (password: string, code: string) =>
  API.post("/auth/2fa/disable", { password, code }).then((res) => res.data);

export const verify2faLoginApi = (
  tempToken: string,
  code: string,
  trustDevice: boolean,
) =>
  API.post("/auth/2fa/verify-login", { tempToken, code, trustDevice }).then(
    (res) => res.data,
  );

export const verifyRecoveryCodeApi = (
  tempToken: string,
  recoveryCode: string,
  trustDevice: boolean,
) =>
  API.post("/auth/2fa/verify-recovery", {
    tempToken,
    recoveryCode,
    trustDevice,
  }).then((res) => res.data);
