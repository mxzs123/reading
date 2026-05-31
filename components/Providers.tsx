"use client";

import { SettingsProvider } from "@/contexts/SettingsContext";
import { I18nProvider } from "@/contexts/I18nContext";

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </I18nProvider>
  );
}
