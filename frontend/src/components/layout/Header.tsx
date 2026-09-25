"use client";

import { useSession } from "next-auth/react";
import LogoutButton from "@/components/auth/LogoutButton";

export default function Header() {
  const { data: session } = useSession();

  const displayName =
    session?.user?.name ||
    session?.user?.email ||
    "Guest";

  const initial = displayName
    .charAt(0)
    .toUpperCase();

  return (
    <header
      className="
        mb-6
        flex
        flex-col
        gap-4
        pt-16
        sm:mb-8
        sm:flex-row
        sm:items-center
        sm:justify-between
        sm:pt-0
      "
    >
      {/* =========================
          Title
      ========================= */}

      <div>
        <p className="mb-1 text-sm font-medium text-[#90AB8B]">
          IoT Monitoring
        </p>

        <h1
          className="
            text-2xl
            font-bold
            tracking-tight
            text-[#EBF4DD]
            sm:text-3xl
          "
        >
          Monitoring
        </h1>

        <p className="mt-1 text-sm text-[#90AB8B]">
          Solar-Powered Recycling Waste Sorting System
        </p>
      </div>

      {/* =========================
          User
      ========================= */}

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-[#EBF4DD]">
              {displayName}
            </p>

            <p className="mt-1 text-xs capitalize text-[#90AB8B]">
              {session?.user?.role || "guest"}
            </p>
          </div>

          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-[#90AB8B]
              font-bold
              text-[#202A30]
              shadow-lg
            "
          >
            {initial}
          </div>
        </div>

        <LogoutButton />
      </div>
    </header>
  );
}
