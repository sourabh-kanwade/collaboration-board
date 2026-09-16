"use client";

import * as React from "react";
import { useTheme } from "@/components/theme-provider";

type CanvasSettings = {
  background: string;
};

type CanvasSettingsContextType = {
  settings: CanvasSettings;
  setSettings: React.Dispatch<React.SetStateAction<CanvasSettings>>;
};

const CanvasSettingsContext = React.createContext<CanvasSettingsContextType | undefined>(undefined);

export function CanvasSettingsProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  const [settings, setSettings] = React.useState<CanvasSettings>({
    background: resolvedTheme === "dark" ? "#212529" : "#ffffff",
  });
  const [prevTheme, setPrevTheme] = React.useState(resolvedTheme);

  if (resolvedTheme !== prevTheme) {
    setPrevTheme(resolvedTheme);
    setSettings((prev) => ({
      ...prev,
      background: resolvedTheme === "dark" ? "#212529" : "#ffffff",
    }));
  }

  return (
    <CanvasSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </CanvasSettingsContext.Provider>
  );
}

export function useCanvasSettings() {
  const context = React.useContext(CanvasSettingsContext);
  if (context === undefined) {
    throw new Error("useCanvasSettings must be used within a CanvasSettingsProvider");
  }
  return context;
}

