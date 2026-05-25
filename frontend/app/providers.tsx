"use client";

import { AuthProvider } from "@/src/components/auth/AuthProvider";
import LocaleHtmlLang from "@/src/components/i18n/LocaleHtmlLang";
import { LocaleProvider } from "@/src/context/LocaleContext";
import { MembershipProvider } from "@/src/context/MembershipContext";
import { SettingsProvider } from "@/src/context/SettingsContext";
import { ThemeProvider } from "@/src/context/ThemeContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LocaleProvider>
        <LocaleHtmlLang />
        <ThemeProvider>
          <MembershipProvider>
            <SettingsProvider>{children}</SettingsProvider>
          </MembershipProvider>
        </ThemeProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
