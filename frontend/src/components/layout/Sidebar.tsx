"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  History,
  Trash2,
  Bell,
  Settings,
  FileText,
  Menu,
  X,
} from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "History",
    href: "/history",
    icon: History,
  },
  {
    name: "Devices",
    href: "/devices",
    icon: Trash2,
  },
  {
    name: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    name: "Logs",
    href: "/logs",
    icon: FileText,
    adminOnly: true,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  const visibleItems = menuItems.filter((item) => !item.adminOnly || isAdmin);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <>
      {/* =========================
          Mobile Menu Button
      ========================= */}

      <button
        onClick={() => setMobileOpen(true)}
        className="
          fixed
          left-4
          top-4
          z-50
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-xl
          border
          border-[#235347]
          bg-[#0B2B26]
          text-[#DAF1DE]
          shadow-lg
          transition
          hover:bg-[#235347]
          lg:hidden
        "
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* =========================
          Mobile Overlay
      ========================= */}

      {mobileOpen && (
        <button
          className="
            fixed
            inset-0
            z-40
            bg-black/60
            backdrop-blur-sm
            lg:hidden
          "
          onClick={closeMobileMenu}
          aria-label="Close menu"
        />
      )}

      {/* =========================
          Sidebar
      ========================= */}

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
          bg-[#0B2B26]
          shadow-2xl
          transition-transform
          duration-300

          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* =========================
            Logo
        ========================= */}

        <div className="border-b border-[#235347]/50 p-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className="flex items-center gap-3"
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-2xl
                  bg-[#235347]
                  text-[#DAF1DE]
                  shadow-lg
                "
              >
                <Trash2 className="h-6 w-6" />
              </div>

              <div>
                <h1 className="font-bold text-[#DAF1DE]">Smart Bin</h1>

                <p className="text-xs text-[#8EB69B]">Monitoring System</p>
              </div>
            </Link>

            {/* Mobile Close */}

            <button
              onClick={closeMobileMenu}
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                text-[#8EB69B]
                transition
                hover:bg-[#163831]
                hover:text-[#DAF1DE]
                lg:hidden
              "
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* =========================
            Navigation
        ========================= */}

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {visibleItems.map((item) => {
            const active = pathname === item.href;
            const IconComponent = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={`
                  group
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  px-4
                  py-3
                  transition-all
                  duration-200

                  ${
                    active
                      ? "bg-[#235347] text-[#DAF1DE] shadow-lg"
                      : "text-[#8EB69B] hover:bg-[#163831] hover:text-[#DAF1DE]"
                  }
                `}
              >
                <IconComponent
                  className={`
                    h-5
                    w-5
                    transition-transform
                    duration-200
                    ${active ? "scale-110" : "group-hover:scale-110"}
                  `}
                />

                <span className="font-medium">{item.name}</span>

                {active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-[#8EB69B]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* =========================
            User
        ========================= */}

        <div className="border-t border-[#235347]/50 p-4">
          <div className="rounded-xl border border-[#235347]/40 bg-[#051F20] p-3">
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-[#8EB69B]
                  font-bold
                  text-[#051F20]
                "
              >
                {(session?.user?.name || session?.user?.email || "G")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#DAF1DE]">
                  {session?.user?.name || session?.user?.email || "Guest"}
                </p>

                <p className="mt-1 text-xs capitalize text-[#8EB69B]">
                  {session?.user?.role || "guest"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
