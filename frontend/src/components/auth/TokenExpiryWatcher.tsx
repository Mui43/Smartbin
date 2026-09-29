"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { expireSession } from "@/lib/apiFetch";

function tokenExpiresAt(token: string): number {
  try {
    const payload = token.split(".")[1];
    if (!payload) return 0;
    const parsed = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof parsed.exp === "number" ? parsed.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export default function TokenExpiryWatcher() {
  const { data: session, status } = useSession();
  const accessToken = session?.user?.accessToken;

  useEffect(() => {
    if (status !== "authenticated") return;
    const expiresAt = accessToken ? tokenExpiresAt(accessToken) : 0;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      expireSession();
      return;
    }
    const timer = window.setTimeout(() => {
      expireSession();
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [accessToken, status]);

  return null;
}
