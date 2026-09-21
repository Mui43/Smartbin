"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

const menuItems = [
  { name: "Dashboard", href: "/", icon: "📊" },
  { name: "History", href: "/history", icon: "📜" },
  { name: "Devices", href: "/devices", icon: "🗑️" },
  {
    name: "Notifications",
    href: "/notifications",
    icon: "🔔",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: "⚙️",
  },
  {
    name: "Logs",
    href: "/logs",
    icon: "📝",
    adminOnly: true,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [open, setOpen] = useState(false);

  const isAdmin =
    session?.user?.role === "admin";

  const visibleItems = menuItems.filter(
    (item) =>
      !item.adminOnly || isAdmin
  );

  return (
    <>
      {/* Mobile button */}

      <button
        onClick={() => setOpen(true)}
        className="
          fixed
          left-4
          top-4
          z-50
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          border
          border-[#5A7863]/40
          bg-[#3B4953]
          text-lg
          text-[#EBF4DD]
          shadow-lg
          lg:hidden
        "
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* Overlay */}

      {open && (
        <button
          className="
            fixed
            inset-0
            z-40
            bg-black/60
            backdrop-blur-sm
            lg:hidden
          "
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar */}

      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          flex
          h-screen
          w-64
          flex-col
          border-r
          border-[#5A7863]/30
          bg-[#3B4953]
          shadow-2xl
          transition-transform
          duration-300
          lg:translate-x-0
          ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* Logo */}

        <div className="border-b border-[#5A7863]/30 p-5">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() =>
                setOpen(false)
              }
              className="flex items-center gap-3"
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#5A7863]
                  text-xl
                "
              >
                🗑️
              </div>

              <div>
                <h1 className="font-bold text-[#EBF4DD]">
                  Smart Bin
                </h1>

                <p className="text-xs text-[#90AB8B]">
                  Monitoring System
                </p>
              </div>
            </Link>

            {/* Mobile close */}

            <button
              onClick={() =>
                setOpen(false)
              }
              className="
                rounded-lg
                px-2
                py-1
                text-[#90AB8B]
                hover:bg-[#202A30]
                lg:hidden
              "
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation */}

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {visibleItems.map((item) => {
            const active =
              pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() =>
                  setOpen(false)
                }
                className={`
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  px-4
                  py-3
                  transition
                  ${
                    active
                      ? "bg-[#5A7863] text-[#EBF4DD] shadow"
                      : "text-[#90AB8B] hover:bg-[#202A30] hover:text-[#EBF4DD]"
                  }
                `}
              >
                <span className="text-lg">
                  {item.icon}
                </span>

                <span className="font-medium">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User */}

        <div className="border-t border-[#5A7863]/30 p-4">
          <div className="rounded-xl bg-[#202A30] p-3">
            <p className="truncate text-sm font-medium text-[#EBF4DD]">
              {session?.user?.name ||
                session?.user?.email ||
                "Guest"}
            </p>

            <p className="mt-1 text-xs text-[#90AB8B]">
              Role:{" "}
              {session?.user?.role ||
                "guest"}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}