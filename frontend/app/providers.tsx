"use client";

import { AuthProvider } from "@/src/components/auth/AuthProvider";
import { SettingsProvider } from "@/src/context/SettingsContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </AuthProvider>
  );
}
