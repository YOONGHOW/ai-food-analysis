"use client";

import React, { createContext, useContext, useState } from "react";

interface SettingsContextType {
  state: string;
  setState: (state: string) => void;
  place: string;
  setPlace: (place: string) => void;
  radius: number;
  setRadius: (radius: number) => void;
  priceTier: string;
  setPriceTier: (tier: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState("Penang");
  const [place, setPlace] = useState("George Town");
  const [radius, setRadius] = useState(10000); // 10km default
  const [priceTier, setPriceTier] = useState("all"); // 'all', '1', '2', '3'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <SettingsContext.Provider 
      value={{ 
        state, setState, 
        place, setPlace,
        radius, setRadius,
        priceTier, setPriceTier,
        isSidebarOpen, setIsSidebarOpen
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
