"use client";

import { AuthProvider } from "@/src/components/auth/AuthProvider";
import { MembershipProvider } from "@/src/context/MembershipContext";
import { SettingsProvider } from "@/src/context/SettingsContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MembershipProvider>
        <SettingsProvider>{children}</SettingsProvider>
      </MembershipProvider>
    </AuthProvider>
  );
}
