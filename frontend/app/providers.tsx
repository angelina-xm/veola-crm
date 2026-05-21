"use client";

import { AuthProvider } from "@/src/components/auth/AuthProvider";
import { MembershipProvider } from "@/src/context/MembershipContext";
import { SettingsProvider } from "@/src/context/SettingsContext";
import { ThemeProvider } from "@/src/context/ThemeContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MembershipProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </MembershipProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
