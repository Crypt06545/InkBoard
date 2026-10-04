// lib/axios.ts
import axios from "axios";
import { useAuthStore } from "@/store/auth-store";

export const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // refreshToken httpOnly cookie পাঠাতে/পেতে জরুরি
});

// প্রতিটা request এ accessToken automatic বসিয়ে দিচ্ছি
API.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// একাধিক request একসাথে 401 পেলে যেন বারবার refresh call না হয়,
// একটাই promise শেয়ার করছি সব request এর মধ্যে
let refreshPromise: Promise<string> | null = null;

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(
              `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
              {},
              { withCredentials: true },
            )
            .then((res) => {
              const newToken = res.data.data.accessToken;
              useAuthStore.getState().setAccessToken(newToken);
              return newToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return API(originalRequest);
      } catch {
        // Refresh ও fail করলে session সত্যিই শেষ, logout করে দিচ্ছি
        useAuthStore.getState().clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);
