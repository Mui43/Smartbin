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
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-[#212b3d] bg-[#131822] text-slate-300 shadow-xl transition hover:bg-[#212b3d] hover:text-white active:scale-95 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop Overlay (Mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-[#212b3d] bg-[#131822] shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="border-b border-[#212b3d] p-5">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 transition opacity-90 hover:opacity-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-inner">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-bold tracking-wide text-white">
                  Smart Bin
                </h1>
                <p className="text-xs text-slate-400">Monitoring System</p>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-[#212b3d] hover:text-white lg:hidden"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
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
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-sm"
                    : "text-slate-400 hover:bg-[#212b3d]/50 hover:text-slate-200"
                }`}
              >
                <IconComponent className={`h-5 w-5 shrink-0 ${isActive ? "text-emerald-400" : ""}`} />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Auth Footer */}
        <div className="border-t border-[#212b3d] p-4">
          <div className="rounded-xl border border-[#212b3d] bg-[#0a0d14] p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="truncate text-sm font-semibold text-white">
                  {session?.user?.name || session?.user?.email || "Guest User"}
                </p>
                <p className="mt-0.5 text-xs capitalize text-slate-400">
                  Role: {session?.user?.role || "guest"}
                </p>
              </div>

              {session ? (
                <button
                  onClick={() => signOut()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 transition hover:bg-rose-500/20 active:scale-95"
                  title="Sign Out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 active:scale-95"
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