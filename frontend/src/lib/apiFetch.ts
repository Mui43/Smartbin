"use client";

import { signOut } from "next-auth/react";

let signingOut = false;

export function expireSession() {
  if (signingOut) return;
  signingOut = true;
  void signOut({ callbackUrl: "/login" }).catch(() => {
    window.location.assign("/login");
  });
}

/** Fetch a backend endpoint and end the session if its bearer token is rejected. */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const authorization = new Headers(init?.headers).get("Authorization");

  if (response.status === 401 && authorization?.startsWith("Bearer ")) {
    expireSession();
  }

  return response;
}
