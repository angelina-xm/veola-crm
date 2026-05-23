"use client";

import { createContext, useContext } from "react";

type ShellLayoutContextValue = {
  toggleMobileNav: () => void;
  isDealsWorkspace: boolean;
};

export const ShellLayoutContext = createContext<ShellLayoutContextValue>({
  toggleMobileNav: () => {},
  isDealsWorkspace: false,
});

export function useShellLayout() {
  return useContext(ShellLayoutContext);
}
