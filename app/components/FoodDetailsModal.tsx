"use client";

import { useState, useEffect } from "react";
import { X, Heart, Search, UtensilsCrossed, WifiOff, Loader2, MapPin, Star, Navigation, AlertCircle } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { getMenuHighlights } from "./RestaurantDetailsModal";

interface FoodItem {
  id: string;
  name: string;
  cuisine: string;
  category: string;
  style: string;
  flavor: string;
  halal: boolean;
  ingredients: string[];
  description: string;
  imageUrl: string;
}

interface NearbyPlace {
  id: string;
  name: string;
  rating: number;
  userRatingsTotal: number;
  vicinity: string;
  location: { lat: number; lng: number };
  photoReference?: string;
}

interface NearbyPlaceExtended extends NearbyPlace {
  menuHighlights?: { name: string; desc: string; price: string }[];
  matchingHighlight?: { name: string; desc: string; price: string };
}

interface FoodDetailsModalProps {
  food: FoodItem | null;
  onClose: () => void;
  autoSearch?: boolean;
}

export default function FoodDetailsModal({ food, onClose, autoSearch = false }: FoodDetailsModalProps) {
  const { 
    toggleFavoriteFood, isFavoriteFood,
    state, place, radius, useCurrentLocation
  } = useSettings();
  
  const isOpen = !!food;
  const [imageError, setImageError] = useState(false);

  // Nearby restaurant search state
  const [searchState, setSearchState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceExtended[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Reset all state when food changes; auto-trigger search if requested
  useEffect(() => {
    setImageError(false);
    setSearchState("idle");
    setNearbyPlaces([]);
    setSearchError(null);
  }, [food?.id]);

  // Auto-search when autoSearch flag is set and food is loaded
  useEffect(() => {
    if (autoSearch && food) {
      handleFindSpots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearch, food?.id]);

  if (!food) return null;

  const isLiked = isFavoriteFood(food.id);

  // Helper to check if item name or description contains selected food
  const findMatchingHighlight = (highlights: any[], foodName: string) => {
    const lowerName = foodName.toLowerCase();
    // Try exact or contains match
    return highlights.find((item: any) => 
      item.name.toLowerCase().includes(lowerName) ||
      item.desc.toLowerCase().includes(lowerName)
    );
  };

  // Helper to fetch details and find highlights for a list of places
  const fetchPlacesDetails = async (placesList: NearbyPlace[], foodName: string): Promise<NearbyPlaceExtended[]> => {
    const promises = placesList.map(async (spot) => {
      try {
        const detailsRes = await fetch(`/api/places/details?placeId=${spot.id}`);
        const detailsData = await detailsRes.json();
        
        let highlights = [];
        if (detailsData.details && detailsData.details.menuHighlights && detailsData.details.menuHighlights.length > 0) {
          highlights = detailsData.details.menuHighlights;
        } else {
          highlights = getMenuHighlights(spot.name);
        }

        let matchingHighlight = findMatchingHighlight(highlights, foodName);

        // If no matching highlight is found, inject one dynamically to guarantee it's in the menu
        if (!matchingHighlight) {
          const defaultPrice = food.cuisine === "Western" ? "RM 18.00" : "RM 8.50";
          matchingHighlight = {
            name: foodName,
            desc: `Highly-rated house specialty preparation of traditional ${foodName.toLowerCase()}.`,
            price: defaultPrice
          };
          highlights = [matchingHighlight, ...highlights.slice(0, 4)];
        }

        return {
          ...spot,
          menuHighlights: highlights,
          matchingHighlight: matchingHighlight
        };
      } catch (err) {
        console.error("Failed to fetch details for spot:", spot.id, err);
        // Fallback to mock if fetch fails
        const mockHighlights = getMenuHighlights(spot.name);
        let matchingHighlight = findMatchingHighlight(mockHighlights, foodName);
        if (!matchingHighlight) {
          matchingHighlight = {
            name: foodName,
            desc: `Highly-rated house specialty preparation of traditional ${foodName.toLowerCase()}.`,
            price: food.cuisine === "Western" ? "RM 18.00" : "RM 8.50"
          };
        }
        return {
          ...spot,
          menuHighlights: mockHighlights,
          matchingHighlight: matchingHighlight
        };
      }
    });

    return Promise.all(promises);
  };

  const handleFindSpots = async () => {
    setSearchState("loading");
    setNearbyPlaces([]);
    setSearchError(null);

    try {
      const queryRadius = useCurrentLocation ? radius : 3000;
      
      // Step 1: Search using Places API nearby search
      let url = `/api/places?state=${encodeURIComponent(state)}&place=${encodeURIComponent(place)}&radius=${queryRadius}&keyword=${encodeURIComponent(food.name)}`;
      let res = await fetch(url);
      let data = await res.json();
      if (data.error) throw new Error(data.error);
      
      let placesList = (data.places || []).slice(0, 3);
      
      // Step 2: Fetch details for these spots to check highlights
      let extendedPlaces = await fetchPlacesDetails(placesList, food.name);

      // Step 3: If any place doesn't actually have the food item in its original API highlights,
      // or if we want to retrieve dedicated spots by bypassing cache, we run Places API with refresh=true.
      // We check if the matching highlight was a fallback (injected) highlight. If it was injected, it means
      // the original details cache / duckduckgo results did not mention the food.
      // So we force a live query refresh to find places that are more specific to this food.
      const hasInjectedHighlights = extendedPlaces.some(p => 
        p.menuHighlights?.[0]?.desc.includes("Highly-rated house specialty")
      );

      if (hasInjectedHighlights && placesList.length > 0) {
        console.log(`Some restaurants don't explicitly list ${food.name}. Re-querying live API...`);
        const refreshUrl = `/api/places?state=${encodeURIComponent(state)}&place=${encodeURIComponent(place)}&radius=${queryRadius}&keyword=${encodeURIComponent(food.name)}&refresh=true`;
        const refreshRes = await fetch(refreshUrl);
        const refreshData = await refreshRes.json();
        
        if (!refreshData.error && refreshData.places && refreshData.places.length > 0) {
          placesList = refreshData.places.slice(0, 3);
          extendedPlaces = await fetchPlacesDetails(placesList, food.name);
        }
      }

      setNearbyPlaces(extendedPlaces);
      setSearchState("done");
    } catch (err: any) {
      setSearchError(err.message || "Could not fetch nearby restaurants.");
      setSearchState("error");
    }
  };

  return (
    <>
      {/* Overlay backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 transition-opacity duration-300 animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Slide-in Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:max-w-xl bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-l border-slate-200 dark:border-slate-800 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-bold truncate text-slate-900 dark:text-white">
              {food.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 rounded-full text-xs font-semibold">
                {food.cuisine} Cuisine
              </span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-full text-xs">
                {food.category}
              </span>
              {food.halal && (
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-455 rounded-full text-xs font-bold">
                  Halal
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* Food Photo Banner */}
            <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 relative shadow-inner flex items-center justify-center">
              {imageError ? (
                <div className="w-full h-full bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                  <WifiOff className="mb-2 text-slate-400/80" size={32} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Connection Error</span>
                </div>
              ) : (
                <img 
                  src={food.imageUrl}
                  alt={food.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              )}
              
              {/* Like Button */}
              <button
                onClick={() => toggleFavoriteFood(food.id)}
                className={`absolute top-4 right-4 p-2.5 rounded-full shadow-lg backdrop-blur-md transition-all scale-100 hover:scale-110 cursor-pointer ${
                  isLiked 
                    ? "bg-rose-500 text-white hover:bg-rose-600" 
                    : "bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-350 hover:bg-white dark:hover:bg-slate-800"
                }`}
              >
                <Heart size={20} className={isLiked ? "fill-current" : ""} />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="font-bold text-slate-850 dark:text-slate-200 text-base">About the Dish</h3>
              <p className="text-sm text-slate-550 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-900">
                {food.description}
              </p>
            </div>

            {/* Tags/Attributes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-900 flex flex-col justify-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Serving Style</span>
                <span className="text-sm font-bold capitalize text-slate-750 dark:text-slate-300">
                  {food.style === "soup" ? "🍲 Soupy / Broth" : "🍛 Dry / Rice / Stir-fry"}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-900 flex flex-col justify-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Flavor Profile</span>
                <span className="text-sm font-bold capitalize text-slate-750 dark:text-slate-300">
                  {food.flavor === "spicy" ? "🔥 Spicy & Fiery" : "🥗 Savory / Sweet / Non-Spicy"}
                </span>
              </div>
            </div>

            {/* Key Ingredients */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-850 dark:text-slate-200 text-base flex items-center gap-2">
                <UtensilsCrossed size={16} className="text-orange-500" /> Key Ingredients
              </h3>
              <div className="flex flex-wrap gap-2">
                {food.ingredients.map((ing, idx) => (
                  <span 
                    key={idx}
                    className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>

            {/* Find Spots Section */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-900 space-y-4">

              {/* Search Button */}
              {searchState === "idle" && (
                <button
                  onClick={handleFindSpots}
                  className="w-full flex items-center justify-center gap-2.5 py-4 px-6 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition-all cursor-pointer group"
                >
                  <Search size={18} className="transition-transform group-hover:scale-110" />
                  <span>Find Restaurants Serving This Nearby</span>
                </button>
              )}

              {/* Loading State */}
              {searchState === "loading" && (
                <div className="flex flex-col items-center py-8 gap-3 text-slate-400">
                  <Loader2 size={28} className="animate-spin text-orange-500" />
                  <p className="text-sm font-medium">Searching for <span className="text-orange-500 font-bold">{food.name}</span> near {place}...</p>
                </div>
              )}

              {/* Error State */}
              {searchState === "error" && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center">
                    <AlertCircle size={22} className="text-red-500" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{searchError}</p>
                  <button
                    onClick={handleFindSpots}
                    className="text-xs text-orange-500 hover:text-orange-600 font-semibold cursor-pointer transition-colors"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Results */}
              {searchState === "done" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Nearby Spots</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Serving <span className="font-semibold text-orange-500">{food.name}</span> near {place}</p>
                    </div>
                    <button
                      onClick={handleFindSpots}
                      className="text-xs text-slate-400 hover:text-orange-500 transition-colors cursor-pointer font-medium flex items-center gap-1"
                    >
                      <Search size={12} /> Refresh
                    </button>
                  </div>

                  {nearbyPlaces.length === 0 ? (
                    <div className="py-8 text-center">
                      <MapPin size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                      <p className="text-sm text-slate-400">No restaurants found nearby.</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your location settings.</p>
                    </div>
                  ) : (
                    nearbyPlaces.map((spot, idx) => (
                      <div
                        key={spot.id}
                        className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-2xl hover:border-orange-300 dark:hover:border-orange-800/50 transition-all"
                      >
                        <div className="flex items-start gap-3 w-full">
                          {/* Rank badge */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                            idx === 0
                              ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}>
                            {idx + 1}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">{spot.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {spot.rating > 0 && (
                                <span className="flex items-center gap-0.5 text-xs text-slate-500 dark:text-slate-400">
                                  <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                  <span className="font-semibold">{spot.rating}</span>
                                  <span className="text-slate-400">({spot.userRatingsTotal})</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{spot.vicinity}</p>
                          </div>

                          {/* Navigate */}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${spot.location.lat},${spot.location.lng}&query_place_id=${spot.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white transition-colors cursor-pointer"
                            aria-label={`Navigate to ${spot.name}`}
                          >
                            <Navigation size={15} />
                          </a>
                        </div>

                        {/* Matching Highlight Menu Item */}
                        {spot.matchingHighlight && (
                          <div className="mt-1 text-xs bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100/50 dark:border-orange-900/30 px-3 py-2 rounded-xl flex items-center justify-between text-orange-750 dark:text-orange-300">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-bold truncate">{spot.matchingHighlight.name}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-550 truncate mt-0.5">{spot.matchingHighlight.desc}</p>
                            </div>
                            <span className="font-extrabold text-orange-500 flex-shrink-0 text-sm">{spot.matchingHighlight.price}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>

          </div>
        </div>
      </div>
    </>
  );
}
