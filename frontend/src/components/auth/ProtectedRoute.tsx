"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

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
        className="min-h-[240px] w-full animate-pulse rounded-lg bg-gray-100"
        aria-busy="true"
        aria-label="Загрузка"
      />
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
