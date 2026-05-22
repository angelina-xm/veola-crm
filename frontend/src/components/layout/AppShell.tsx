"use client";

import { useState } from "react";
import { cn } from "@/src/lib/cn";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--vx-bg)]">
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[var(--vx-sidebar-width)] -translate-x-full transition-transform duration-200 lg:translate-x-0",
          mobileNav && "translate-x-0"
        )}
      >
        <Sidebar onNavigate={() => setMobileNav(false)} />
      </div>
      {mobileNav ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      ) : null}

      <div className="flex min-h-screen flex-col lg:pl-[var(--vx-sidebar-width)]">
        <Topbar
          menuOpen={mobileNav}
          onMenuToggle={() => setMobileNav((v) => !v)}
        />
        <main className="vx-container flex-1 py-6 pb-12 vx-animate-in">{children}</main>
      </div>
    </div>
  );
}
