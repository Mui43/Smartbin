"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import { useState, useEffect, ElementType } from "react";
import {
  LayoutDashboard,
  History,
  Trash2,
  Bell,
  Settings,
  FileText,
  Menu,
  X,
  LogOut,
  LogIn,
} from "lucide-react";

interface MenuItem {
  name: string;
  href: string;
  icon: ElementType;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "History", href: "/history", icon: History },
  { name: "Devices", href: "/devices", icon: Trash2 },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Logs", href: "/logs", icon: FileText, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  const visibleItems = menuItems.filter((item) => !item.adminOnly || isAdmin);

  // ป้องกันการ Scroll หน้าจอหลักเมื่อเปิด Mobile Menu
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-[#5A7863]/40 bg-[#3B4953] text-[#EBF4DD] shadow-lg transition hover:bg-[#202A30] active:scale-95 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop Overlay (Mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-[#5A7863]/30 bg-[#3B4953] shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="border-b border-[#5A7863]/30 p-5">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 transition opacity-90 hover:opacity-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5A7863] text-[#EBF4DD] shadow-inner">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-bold tracking-wide text-[#EBF4DD]">
                  Smart Bin
                </h1>
                <p className="text-xs text-[#90AB8B]">Monitoring System</p>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#90AB8B] transition hover:bg-[#202A30] hover:text-[#EBF4DD] lg:hidden"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const IconComponent = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#5A7863] text-[#EBF4DD] shadow-md"
                    : "text-[#90AB8B] hover:bg-[#202A30] hover:text-[#EBF4DD]"
                }`}
              >
                <IconComponent className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Auth Footer */}
        <div className="border-t border-[#5A7863]/30 p-4">
          <div className="rounded-xl bg-[#202A30] p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="truncate text-sm font-semibold text-[#EBF4DD]">
                  {session?.user?.name || session?.user?.email || "Guest User"}
                </p>
                <p className="mt-0.5 text-xs text-[#90AB8B] capitalize">
                  Role: {session?.user?.role || "guest"}
                </p>
              </div>

              {session ? (
                <button
                  onClick={() => signOut()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10 text-red-300 transition hover:bg-red-400/20"
                  title="Sign Out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#5A7863] px-2.5 py-1.5 text-xs font-medium text-[#EBF4DD] transition hover:bg-[#90AB8B] hover:text-[#202A30]"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
