"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/cn";
import { ShellLayoutContext } from "@/src/context/ShellLayoutContext";
import { ROUTES } from "@/src/lib/product";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false);
  const pathname = usePathname();
  const isDealsWorkspace =
    pathname === ROUTES.deals || pathname === ROUTES.pipeline;

  const shellCtx = useMemo(
    () => ({
      toggleMobileNav: () => setMobileNav((v) => !v),
      isDealsWorkspace,
    }),
    [isDealsWorkspace]
  );

  return (
    <ShellLayoutContext.Provider value={shellCtx}>
      <div
        className={cn(
          "min-h-screen bg-[var(--vx-bg)]",
          isDealsWorkspace && "vx-app--deals"
        )}
      >
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[var(--vx-sidebar-width)] -translate-x-full transition-transform duration-200 lg:translate-x-0",
            mobileNav && "translate-x-0",
            isDealsWorkspace && "vx-sidebar-dock"
          )}
        >
          <Sidebar onNavigate={() => setMobileNav(false)} />
        </div>
        {mobileNav ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileNav(false)}
          />
        ) : null}

        <div className="flex min-h-screen flex-col lg:pl-[var(--vx-sidebar-width)]">
          <Topbar
            menuOpen={mobileNav}
            onMenuToggle={() => setMobileNav((v) => !v)}
            minimal={isDealsWorkspace}
          />
          <main
            className={cn(
              "flex-1 vx-animate-in",
              isDealsWorkspace
                ? "vx-main--deals max-w-none px-0 py-0"
                : "vx-container py-6 pb-12"
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </ShellLayoutContext.Provider>
  );
}
