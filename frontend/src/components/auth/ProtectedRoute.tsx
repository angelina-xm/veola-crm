"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import AppShell from "@/src/components/layout/AppShell";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isReady, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login?reason=missing_tokens");
    }
  }, [isReady, isAuthenticated, router]);

  if (!isReady) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center"
        aria-busy="true"
        aria-label="Loading"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
