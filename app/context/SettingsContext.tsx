"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useRouter } from "next/navigation";

export interface Place {
  id: string;
  name: string;
  rating: number;
  userRatingsTotal: number;
  priceLevel: number;
  vicinity: string;
  location: { lat: number; lng: number };
  openNow?: boolean;
  photoReference?: string;
  state?: string;
  placeName?: string;
}

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
  useCurrentLocation: boolean;
  setUseCurrentLocation: (useIt: boolean) => void;
  favorites: Place[];
  toggleFavorite: (place: Place) => void;
  isFavorite: (id: string) => boolean;
  favoriteFoods: string[];
  toggleFavoriteFood: (foodId: string) => void;
  isFavoriteFood: (foodId: string) => boolean;
  prefersSpicy: boolean;
  setPrefersSpicy: (prefers: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  const [state, setState] = useState("Penang");
  const [place, setPlace] = useState("George Town");
  const [radius, setRadius] = useState(10000); // 10km default
  const [priceTier, setPriceTier] = useState("all"); // 'all', '1', '2', '3'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>([]);
  const [prefersSpicy, setPrefersSpicyState] = useState(false);

  // Load settings and favorites scoped to the logged-in user
  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = user ? user.id : "guest";

      // Load location settings from local storage database
      const savedState = localStorage.getItem(`search_state_${id}`);
      if (savedState) setState(savedState);

      const savedPlace = localStorage.getItem(`search_place_${id}`);
      if (savedPlace) setPlace(savedPlace);

      const savedRadius = localStorage.getItem(`search_radius_${id}`);
      if (savedRadius) setRadius(Number(savedRadius));

      const savedPriceTier = localStorage.getItem(`search_price_tier_${id}`);
      if (savedPriceTier) setPriceTier(savedPriceTier);

      const savedUseLocation = localStorage.getItem(`search_use_location_${id}`);
      if (savedUseLocation) setUseCurrentLocation(savedUseLocation === "true");

      if (user) {
        const saved = localStorage.getItem(`favorites_restaurants_${user.id}`);
        if (saved) {
          try {
            setFavorites(JSON.parse(saved));
          } catch (e) {
            console.warn("Failed to parse favorites from localStorage:", e);
          }
        } else {
          setFavorites([]);
        }

        const savedFoods = localStorage.getItem(`favorites_foods_${user.id}`);
        if (savedFoods) {
          try {
            setFavoriteFoods(JSON.parse(savedFoods));
          } catch (e) {
            console.warn("Failed to parse favorite foods from localStorage:", e);
          }
        } else {
          setFavoriteFoods([]);
        }

        const savedSpicy = localStorage.getItem(`prefers_spicy_${user.id}`);
        setPrefersSpicyState(savedSpicy === "true");
      } else {
        setFavorites([]);
        setFavoriteFoods([]);
        const savedSpicy = localStorage.getItem("prefers_spicy_guest");
        setPrefersSpicyState(savedSpicy === "true");
      }
    }
  }, [user]);

  const updateState = (val: string) => {
    setState(val);
    if (typeof window !== "undefined") {
      const id = user ? user.id : "guest";
      localStorage.setItem(`search_state_${id}`, val);
    }
  };

  const updatePlace = (val: string) => {
    setPlace(val);
    if (typeof window !== "undefined") {
      const id = user ? user.id : "guest";
      localStorage.setItem(`search_place_${id}`, val);
    }
  };

  const updateRadius = (val: number) => {
    setRadius(val);
    if (typeof window !== "undefined") {
      const id = user ? user.id : "guest";
      localStorage.setItem(`search_radius_${id}`, String(val));
    }
  };

  const updatePriceTier = (val: string) => {
    setPriceTier(val);
    if (typeof window !== "undefined") {
      const id = user ? user.id : "guest";
      localStorage.setItem(`search_price_tier_${id}`, val);
    }
  };

  const updateUseCurrentLocation = (val: boolean) => {
    setUseCurrentLocation(val);
    if (typeof window !== "undefined") {
      const id = user ? user.id : "guest";
      localStorage.setItem(`search_use_location_${id}`, String(val));
    }
  };

  const toggleFavorite = (placeObj: Place) => {
    if (!user) {
      router.push("/auth");
      return;
    }
    setFavorites(prev => {
      const exists = prev.some(p => p.id === placeObj.id);
      let updated;
      if (exists) {
        updated = prev.filter(p => p.id !== placeObj.id);
      } else {
        const taggedPlace = {
          ...placeObj,
          state: placeObj.state || state,
          placeName: placeObj.placeName || place
        };
        updated = [...prev, taggedPlace];
      }
      localStorage.setItem(`favorites_restaurants_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (id: string) => {
    if (!user) return false;
    return favorites.some(p => p.id === id);
  };

  const toggleFavoriteFood = (foodId: string) => {
    if (!user) {
      router.push("/auth");
      return;
    }
    setFavoriteFoods(prev => {
      const exists = prev.includes(foodId);
      let updated;
      if (exists) {
        updated = prev.filter(id => id !== foodId);
      } else {
        updated = [...prev, foodId];
      }
      localStorage.setItem(`favorites_foods_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const isFavoriteFood = (foodId: string) => {
    if (!user) return false;
    return favoriteFoods.includes(foodId);
  };

  const setPrefersSpicy = (val: boolean) => {
    setPrefersSpicyState(val);
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem(`prefers_spicy_${user.id}`, String(val));
      } else {
        localStorage.setItem("prefers_spicy_guest", String(val));
      }
    }
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        state, setState: updateState, 
        place, setPlace: updatePlace,
        radius, setRadius: updateRadius,
        priceTier, setPriceTier: updatePriceTier,
        isSidebarOpen, setIsSidebarOpen,
        useCurrentLocation, setUseCurrentLocation: updateUseCurrentLocation,
        favorites, toggleFavorite, isFavorite,
        favoriteFoods, toggleFavoriteFood, isFavoriteFood,
        prefersSpicy, setPrefersSpicy
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
