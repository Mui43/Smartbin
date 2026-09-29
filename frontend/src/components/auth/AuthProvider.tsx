"use client";

import { SessionProvider } from "next-auth/react";
import TokenExpiryWatcher from "./TokenExpiryWatcher";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <TokenExpiryWatcher />
      {children}
    </SessionProvider>
  );
}
