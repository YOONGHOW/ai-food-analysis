"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, MapPin, Star, Navigation, RefreshCw, BookOpen, Trash2, Trophy, RotateCcw, Zap, Heart, Search, WifiOff } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import RestaurantDetailsModal from "../components/RestaurantDetailsModal";
import FoodDetailsModal from "../components/FoodDetailsModal";

interface Place {
  id: string;
  name: string;
  rating: number;
  userRatingsTotal: number;
  priceLevel: number;
  vicinity: string;
  location: { lat: number; lng: number };
  openNow?: boolean;
  photoReference?: string;
}

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

const matchesPriceTier = (place: { name: string; priceLevel?: number }, tier: string): boolean => {
  if (tier === "all") return true;
  if (place.priceLevel !== undefined && place.priceLevel !== null) {
    if (tier === "1") return place.priceLevel <= 1;
    if (tier === "2") return place.priceLevel === 2;
    if (tier === "3") return place.priceLevel >= 3;
  }
  const name = place.name.toLowerCase();
  let guessedLevel = 1;
  if (name.includes("fine dining") || name.includes("steakhouse") || name.includes("bistro") || name.includes("hotel") || name.includes("cuisine")) {
    guessedLevel = 3;
  } else if (name.includes("cafe") || name.includes("restaurant") || name.includes("kitchen") || name.includes("bar") || name.includes("coffee") || name.includes("japanese") || name.includes("korean") || name.includes("brunch")) {
    guessedLevel = 2;
  }
  if (tier === "1") return guessedLevel === 1;
  if (tier === "2") return guessedLevel === 2;
  if (tier === "3") return guessedLevel === 3;
  return true;
};

const filterPlacesByVibe = (
  placeList: Place[],
  answers: {
    style: "soup" | "dry" | null;
    flavor: "spicy" | "non-spicy" | null;
    vibe: "casual" | "comfortable" | null;
  }
) => {
  return placeList.filter(p => {
    const text = `${p.name} ${p.vicinity}`.toLowerCase();

    // Style check
    if (answers.style) {
      let score = 0;
      const soupKeywords = ["soup", "hotpot", "steamboat", "ramen", "bak kut teh", "pho", "shabu", "tom yam", "curry mee", "koay teow soup", "fish head", "porridge", "bubur", "laksa", "udon", "broth", "steam"];
      const dryKeywords = ["rice", "nasi", "chicken rice", "fried rice", "bento", "wonton mee", "char koay teow", "economy rice", "nasi lemak", "burger", "pizza", "pasta", "sushi", "bread", "toast", "sandwich", "waffle", "pancake", "fry", "grilled", "roasted", "dry"];

      soupKeywords.forEach(k => { if (text.includes(k)) score += 1; });
      dryKeywords.forEach(k => { if (text.includes(k)) score -= 1; });

      if (answers.style === "soup" && score < 0) return false;
      if (answers.style === "dry" && score > 0) return false;
    }

    // Flavor check
    if (answers.flavor) {
      let score = 0;
      const spicyKeywords = ["spicy", "mala", "chili", "curry", "tom yam", "thai", "szechuan", "indian", "sambal", "kimchi", "mexican", "kandar", "nasi kandar", "pedas", "tandoori", "sichuan", "masala"];
      const nonSpicyKeywords = ["bakery", "dessert", "sushi", "pasta", "pizza", "porridge", "dim sum", "western", "cafe", "sweet", "cake", "ice cream", "waffle", "toast", "salad", "chicken chop"];

      spicyKeywords.forEach(k => { if (text.includes(k)) score += 1; });
      nonSpicyKeywords.forEach(k => { if (text.includes(k)) score -= 1; });

      if (answers.flavor === "spicy" && score < 0) return false;
      if (answers.flavor === "non-spicy" && score > 0) return false;
    }

    // Vibe check
    if (answers.vibe) {
      let score = 0;
      const casualKeywords = ["kopitiam", "hawker", "food court", "stall", "coffee shop", "kedai kopi", "nasi kandar", "warung", "medan selera", "pasar", "street", "center", "restoran", "canteen", "kedai", "lorong", "food stall"];
      const comfortableKeywords = ["cafe", "bistro", "restaurant", "kitchen", "dining", "cuisine", "coffee", "bakery", "patisserie", "steakhouse", "bar", "lounge", "grill", "house", "studio", "lab", "parlor", "cozy", "loft", "boutique"];

      casualKeywords.forEach(k => { if (text.includes(k)) score += 1; });
      comfortableKeywords.forEach(k => { if (text.includes(k)) score -= 1; });

      if (answers.vibe === "casual" && score < 0) return false;
      if (answers.vibe === "comfortable" && score > 0) return false;
    }

    return true;
  });
};

const filterFoodsByVibe = (
  foodList: FoodItem[],
  answers: {
    style: "soup" | "dry" | null;
    flavor: "spicy" | "non-spicy" | null;
    vibe: "casual" | "comfortable" | null;
  }
) => {
  return foodList.filter(f => {
    // Style check
    if (answers.style && f.style !== answers.style) {
      return false;
    }
    // Flavor check
    if (answers.flavor && f.flavor !== answers.flavor) {
      return false;
    }
    // Vibe check
    if (answers.vibe) {
      const isDessertOrWestern = f.cuisine === "Western" || f.category === "Desserts & Drinks";
      if (answers.vibe === "casual" && isDessertOrWestern) return false;
      if (answers.vibe === "comfortable" && !isDessertOrWestern && f.category !== "Hotpot") return false;
    }
    return true;
  });
};

export default function RoulettePage() {
  const { 
    state, place, radius, priceTier, useCurrentLocation, 
    favorites, toggleFavorite, isFavorite,
    favoriteFoods, toggleFavoriteFood, isFavoriteFood
  } = useSettings();

  // Mode state
  const [viewMode, setViewMode] = useState<"restaurant" | "food">("restaurant");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [rouletteImageError, setRouletteImageError] = useState(false);

  // Restaurant lists
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(0);
  const [winner, setWinner] = useState<any | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Favorites Only Mode toggle
  const [useFavoritesOnly, setUseFavoritesOnly] = useState(false);

  // Veto Elimination Mode
  const [vetoModeEnabled, setVetoModeEnabled] = useState(false);
  const [vetoedIds, setVetoedIds] = useState<string[]>([]);
  const [showVetoFlash, setShowVetoFlash] = useState(false);
  const [isLastOne, setIsLastOne] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  // Vibe Funnel Mode
  const [vibeFunnelEnabled, setVibeFunnelEnabled] = useState(false);
  const [vibeStep, setVibeStep] = useState(0);
  const [vibeAnswers, setVibeAnswers] = useState<{
    style: "soup" | "dry" | null;
    flavor: "spicy" | "non-spicy" | null;
    vibe: "casual" | "comfortable" | null;
  }>({ style: null, flavor: null, vibe: null });
  const [vibeFallbackActive, setVibeFallbackActive] = useState(false);
  const [spinPool, setSpinPool] = useState<any[]>([]);

  const spinInterval = useRef<NodeJS.Timeout | null>(null);

  // Filter lists dynamically based on mode
  const filteredPlaces = places.filter(p => matchesPriceTier(p, priceTier));
  const activePlaces = vetoModeEnabled
    ? filteredPlaces.filter(p => !vetoedIds.includes(p.id))
    : filteredPlaces;
  const vetoedPlaces = filteredPlaces.filter(p => vetoedIds.includes(p.id));

  const activeFoods = useFavoritesOnly
    ? foods.filter(f => favoriteFoods.includes(f.id))
    : foods;
  const filteredFoods = vetoModeEnabled
    ? activeFoods.filter(f => !vetoedIds.includes(f.id))
    : activeFoods;
  const vetoedFoods = activeFoods.filter(f => vetoedIds.includes(f.id));

  const displayPool = (isSpinning || winner) && spinPool.length > 0 
    ? spinPool 
    : (viewMode === "restaurant" ? activePlaces : filteredFoods);

  const currentItem = displayPool[currentDisplayIndex];
  const vetoedItems = viewMode === "restaurant" ? vetoedPlaces : vetoedFoods;

  useEffect(() => {
    setRouletteImageError(false);
  }, [currentItem?.id]);

  const fetchPlaces = async () => {
    setLoading(true);
    setError(null);
    setVetoedIds([]);
    setWinner(null);
    setIsLastOne(false);
    setIsAccepted(false);
    setVibeStep(0);
    setVibeAnswers({ style: null, flavor: null, vibe: null });
    setVibeFallbackActive(false);
    setSpinPool([]);

    if (viewMode === "food") {
      if (useFavoritesOnly && favoriteFoods.length === 0) {
        setError("No favorite foods saved yet! Add some from the Browse page first.");
      }
      setLoading(false);
      return;
    }

    if (useFavoritesOnly) {
      const localFavorites = favorites.filter(p =>
        p.state?.toLowerCase() === state.toLowerCase() &&
        p.placeName?.toLowerCase() === place.toLowerCase()
      );
      if (localFavorites.length === 0) {
        setError(`No favorite restaurants saved in ${place}, ${state} yet! Add some from the Browse page first.`);
        setPlaces([]);
      } else {
        setPlaces(localFavorites);
      }
      setLoading(false);
      return;
    }

    try {
      const queryRadius = useCurrentLocation ? radius : 3000;
      const res = await fetch(`/api/places?state=${encodeURIComponent(state)}&place=${encodeURIComponent(place)}&radius=${queryRadius}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.places.length === 0) throw new Error("No places found.");
      setPlaces(data.places);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Pre-load static foods
  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const res = await fetch("/data/malaysian_foods.json");
        const data = await res.json();
        setFoods(data);
      } catch (err) {
        console.error("Failed to load foods:", err);
      }
    };
    fetchFoods();
  }, []);

  useEffect(() => {
    fetchPlaces();
    setWinner(null);
    setIsSpinning(false);
    setVetoedIds([]);
    setIsAccepted(false);
    setVibeStep(0);
    setVibeAnswers({ style: null, flavor: null, vibe: null });
    setVibeFallbackActive(false);
    setSpinPool([]);
  }, [state, place, radius, useCurrentLocation, useFavoritesOnly, favorites, viewMode]);

  const startSpin = (pool: any[] = (viewMode === "restaurant" ? activePlaces : filteredFoods), fast = false) => {
    if (pool.length === 0) return;
    setSpinPool(pool);
    setIsSpinning(true);
    setWinner(null);
    setIsAccepted(false);

    let duration = fast ? 1200 : 3000;
    let speed = fast ? 40 : 50;
    let elapsed = 0;

    const spin = () => {
      setCurrentDisplayIndex(Math.floor(Math.random() * pool.length));
      elapsed += speed;

      if (elapsed < duration) {
        if (elapsed > duration * 0.7) speed = fast ? 80 : 150;
        if (elapsed > duration * 0.9) speed = fast ? 160 : 300;
        spinInterval.current = setTimeout(spin, speed);
      } else {
        setIsSpinning(false);
        const finalWinner = pool[Math.floor(Math.random() * pool.length)];
        setWinner(finalWinner);
        setCurrentDisplayIndex(pool.findIndex(item => item.id === finalWinner.id));
        if (!vetoModeEnabled) {
          setTimeout(() => {
            if (viewMode === "restaurant") {
              setSelectedPlaceId(finalWinner.id);
            } else {
              setSelectedFood(finalWinner);
            }
          }, 1550);
        }
        setIsLastOne(pool.length <= 1);
      }
    };

    spin();
  };

  const handleVeto = () => {
    if (!winner) return;
    const newVetoedIds = [...vetoedIds, winner.id];
    setVetoedIds(newVetoedIds);

    // Flash animation
    setShowVetoFlash(true);
    setTimeout(() => setShowVetoFlash(false), 600);

    const fullPool = viewMode === "restaurant" ? filteredPlaces : activeFoods;
    const newPool = fullPool.filter(item => !newVetoedIds.includes(item.id));
    if (newPool.length === 0) {
      setWinner(null);
      return;
    }
    // Auto re-spin with reduced pool
    setTimeout(() => startSpin(newPool, true), 400);
  };

  const handleResetVeto = () => {
    setVetoedIds([]);
    setWinner(null);
    setIsLastOne(false);
    setIsAccepted(false);
    setVibeStep(0);
    setVibeAnswers({ style: null, flavor: null, vibe: null });
    setVibeFallbackActive(false);
    setSpinPool([]);
  };

  useEffect(() => {
    return () => {
      if (spinInterval.current) clearTimeout(spinInterval.current);
    };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
        <p className="text-red-550 mb-4">{error}</p>
        <button onClick={fetchPlaces} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg">
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  const handleSpinClick = () => {
    if (vibeFunnelEnabled) {
      setVibeStep(1);
      setVibeAnswers({ style: null, flavor: null, vibe: null });
      setVibeFallbackActive(false);
    } else {
      startSpin();
    }
  };

  const handleVibeSelect = (key: "style" | "flavor" | "vibe", value: any) => {
    const updatedAnswers = { ...vibeAnswers, [key]: value };
    setVibeAnswers(updatedAnswers);

    if (vibeStep < 3) {
      setVibeStep(s => s + 1);
    } else {
      setVibeStep(0);

      if (viewMode === "restaurant") {
        const matchedPool = filterPlacesByVibe(activePlaces, updatedAnswers);
        if (matchedPool.length > 0) {
          setVibeFallbackActive(false);
          startSpin(matchedPool);
        } else {
          setVibeFallbackActive(true);
          startSpin(activePlaces);
        }
      } else {
        const matchedPool = filterFoodsByVibe(filteredFoods, updatedAnswers);
        if (matchedPool.length > 0) {
          setVibeFallbackActive(false);
          startSpin(matchedPool);
        } else {
          setVibeFallbackActive(true);
          startSpin(filteredFoods);
        }
      }
    }
  };


  return (
    <div className="flex flex-col items-center w-full px-4 py-8">
      <div className="max-w-md w-full flex flex-col items-center">

        <h1 className="text-3xl font-bold mb-1">Food Roulette</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-center text-sm">
          Let fate decide your next meal in {place}, {state}.
        </p>

        {/* Mode Toggle Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl w-full mb-6 border border-slate-200/50 dark:border-slate-800/40">
          <button
            onClick={() => setViewMode("restaurant")}
            className={`flex-1 px-6 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              viewMode === "restaurant"
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Spin Restaurants
          </button>
          <button
            onClick={() => setViewMode("food")}
            className={`flex-1 px-6 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              viewMode === "food"
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-505 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Spin Food
          </button>
        </div>

        {/* Favorites Only Mode Toggle */}
        <div
          onClick={() => {
            setUseFavoritesOnly(v => !v);
            setWinner(null);
            setIsAccepted(false);
          }}
          className={`w-full mb-4 p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all duration-300 ${useFavoritesOnly
            ? "border-rose-500 bg-rose-50 dark:bg-rose-955/30"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
            }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${useFavoritesOnly ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
              <Heart size={18} className={useFavoritesOnly ? "fill-white text-white" : ""} />
            </div>
            <div>
              <p className={`text-sm font-bold ${useFavoritesOnly ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                {viewMode === "restaurant" ? "Favorites Only Mode" : "Favorite Foods Only Mode"}
              </p>
              <p className="text-xs text-slate-400">
                {viewMode === "restaurant"
                  ? (useFavoritesOnly ? "Only spinning your favorited spots in this area" : "Tap to enable — only spin your saved favorites")
                  : (useFavoritesOnly ? "Only spinning your saved favorite dishes" : "Tap to enable — only spin your saved favorite foods")
                }
              </p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${useFavoritesOnly ? "bg-rose-500 justify-end" : "bg-slate-200 dark:bg-slate-700 justify-start"}`}>
            <div className="w-4 h-4 bg-white rounded-full shadow" />
          </div>
        </div>

        {/* Veto Mode Toggle */}
        <div
          onClick={() => { setVetoModeEnabled(v => !v); setVetoedIds([]); setWinner(null); setIsAccepted(false); }}
          className={`w-full mb-4 p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all duration-300 ${vetoModeEnabled
            ? "border-rose-500 bg-rose-50 dark:bg-rose-955/30"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
            }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${vetoModeEnabled ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
              <Trash2 size={18} />
            </div>
            <div>
              <p className={`text-sm font-bold ${vetoModeEnabled ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                Veto Elimination Mode
              </p>
              <p className="text-xs text-slate-400">
                {vetoModeEnabled ? "Reject & shrink the pool until one survives" : "Tap to enable — reject items one by one"}
              </p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${vetoModeEnabled ? "bg-rose-500 justify-end" : "bg-slate-200 dark:bg-slate-700 justify-start"}`}>
            <div className="w-4 h-4 bg-white rounded-full shadow" />
          </div>
        </div>


        {loading ? (
          <div className="flex flex-col items-center text-slate-400 py-12">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-sm">Pre-filtering local items...</p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            
            {/* VIBE FUNNEL SELECTIONS */}
            {vibeStep > 0 && !isSpinning && !winner && (
              <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Vibe Funnel Setup</span>
                  <span>Step {vibeStep} of 3</span>
                </div>

                {vibeStep === 1 && (
                  <div className="animate-in slide-in-from-right duration-200">
                    <h3 className="text-xl font-extrabold mb-1">What is the style?</h3>
                    <p className="text-xs text-slate-400 mb-5">Choose serving style preference</p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => handleVibeSelect("style", "soup")}
                        className="py-3.5 bg-orange-50/50 dark:bg-slate-800/40 hover:bg-orange-50 dark:hover:bg-slate-850 text-orange-600 dark:text-orange-400 font-bold rounded-xl border border-orange-200 dark:border-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        🍲 Soup / Hotpot
                      </button>
                      <button
                        onClick={() => handleVibeSelect("style", "dry")}
                        className="py-3.5 bg-orange-50/50 dark:bg-slate-800/40 hover:bg-orange-50 dark:hover:bg-slate-850 text-orange-600 dark:text-orange-400 font-bold rounded-xl border border-orange-200 dark:border-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        🍚 Dry / Rice / Noodles
                      </button>
                    </div>
                  </div>
                )}

                {vibeStep === 2 && (
                  <div className="animate-in slide-in-from-right duration-200">
                    <h3 className="text-xl font-extrabold mb-1">What is the flavor?</h3>
                    <p className="text-xs text-slate-400 mb-5">Choose your spice preference</p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => handleVibeSelect("flavor", "spicy")}
                        className="py-3.5 bg-orange-50/50 dark:bg-slate-800/40 hover:bg-orange-50 dark:hover:bg-slate-850 text-orange-600 dark:text-orange-400 font-bold rounded-xl border border-orange-200 dark:border-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        🌶️ Spicy / Mala
                      </button>
                      <button
                        onClick={() => handleVibeSelect("flavor", "non-spicy")}
                        className="py-3.5 bg-orange-50/50 dark:bg-slate-800/40 hover:bg-orange-50 dark:hover:bg-slate-850 text-orange-600 dark:text-orange-400 font-bold rounded-xl border border-orange-200 dark:border-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        🍲 Non-Spicy / Savory
                      </button>
                    </div>
                  </div>
                )}

                {vibeStep === 3 && (
                  <div className="animate-in slide-in-from-right duration-200">
                    <h3 className="text-xl font-extrabold mb-1">What is the vibe?</h3>
                    <p className="text-xs text-slate-400 mb-5">Choose the dining atmosphere</p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => handleVibeSelect("vibe", "casual")}
                        className="py-3.5 bg-orange-50/50 dark:bg-slate-800/40 hover:bg-orange-50 dark:hover:bg-slate-850 text-orange-600 dark:text-orange-400 font-bold rounded-xl border border-orange-200 dark:border-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        🏪 Casual Kopitiam / Hawker
                      </button>
                      <button
                        onClick={() => handleVibeSelect("vibe", "comfortable")}
                        className="py-3.5 bg-orange-50/50 dark:bg-slate-800/40 hover:bg-orange-50 dark:hover:bg-slate-850 text-orange-600 dark:text-orange-400 font-bold rounded-xl border border-orange-200 dark:border-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        ☕ Comfortable Cafe / AC
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4 text-xs font-semibold">
                  <button
                    onClick={() => {
                      if (vibeStep > 1) {
                        setVibeStep(v => v - 1);
                      } else {
                        setVibeStep(0);
                      }
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setVibeStep(0);
                      startSpin();
                    }}
                    className="text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
                  >
                    Skip questions & spin all
                  </button>
                </div>
              </div>
            )}

            {isSpinning && vibeFunnelEnabled && vibeAnswers.style && (
              <div className="mb-4 text-xs font-bold px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-350 animate-pulse flex items-center gap-1.5">
                <Zap size={12} className="text-orange-500" />
                <span>
                  {vibeFallbackActive
                    ? "No exact vibe match — widening search to spin all!"
                    : `Vibe Funnel: ${vibeAnswers.style === "soup" ? "🍲 Soup/Hotpot" : "🍚 Dry/Rice/Noodles"} · ${vibeAnswers.flavor === "spicy" ? "🌶️ Spicy/Mala" : "🍲 Non-Spicy"} · ${vibeAnswers.vibe === "casual" ? "🏪 Casual" : "☕ Comfortable"}`}
                </span>
              </div>
            )}

            {winner && vibeFunnelEnabled && vibeAnswers.style && (
              <div className="mb-4 text-xs font-bold px-4 py-2 rounded-full bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                <Zap size={12} className="text-orange-500" />
                <span>
                  {vibeFallbackActive
                    ? "Widen search winner"
                    : `Matches: ${vibeAnswers.style === "soup" ? "Soup/Hotpot" : "Dry/Rice/Noodles"} · ${vibeAnswers.flavor === "spicy" ? "Spicy/Mala" : "Non-Spicy"} · ${vibeAnswers.vibe === "casual" ? "Casual" : "AC/Comfort"}`}
                </span>
              </div>
            )}

            {(isSpinning || winner) && currentItem && (
              <div className={`w-full relative transition-all duration-300 transform ${showVetoFlash ? "scale-90 opacity-0" : "scale-100 opacity-100"}`}>
                <div className={`w-full bg-white dark:bg-slate-900 border-2 ${isLastOne && winner ? "border-yellow-400 shadow-xl shadow-yellow-400/20"
                  : winner ? "border-orange-500 shadow-xl shadow-orange-500/20"
                    : "border-slate-200 dark:border-slate-800"
                  } rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 transform ${isSpinning ? "scale-95 opacity-80" : "scale-100 opacity-100"}`}>

                  {/* Favorite Button at top-right corner */}
                  {winner && (
                    <button
                      type="button"
                      onClick={() => {
                        if (viewMode === "restaurant") {
                          toggleFavorite(currentItem);
                        } else {
                          toggleFavoriteFood(currentItem.id);
                        }
                      }}
                      className="absolute top-4 right-4 p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-full shadow-sm transition-all hover:scale-110 cursor-pointer z-10"
                      aria-label={
                        viewMode === "restaurant"
                          ? (isFavorite(currentItem.id) ? "Remove from favorites" : "Add to favorites")
                          : (isFavoriteFood(currentItem.id) ? "Remove from favorites" : "Add to favorites")
                      }
                    >
                      <Heart 
                        size={18} 
                        className={
                          viewMode === "restaurant"
                            ? (isFavorite(currentItem.id) ? "fill-rose-500 text-rose-500" : "")
                            : (isFavoriteFood(currentItem.id) ? "fill-rose-500 text-rose-500" : "")
                        } 
                      />
                    </button>
                  )}

                  {/* Trophy for last one */}
                  {isLastOne && winner && (
                    <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 text-xs font-bold">
                      <Trophy size={14} /> Last Item Standing!
                    </div>
                  )}

                  {viewMode === "restaurant" && currentItem.location ? (
                    currentItem.photoReference ? (
                      <div className="w-24 h-24 rounded-full overflow-hidden mb-4 ring-4 ring-orange-500/20 flex-shrink-0">
                        <img src={`/api/places/photo?ref=${currentItem.photoReference}`} alt={currentItem.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 flex-shrink-0">
                        <MapPin size={32} className="text-orange-500" />
                      </div>
                    )
                  ) : (
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-4 ring-4 ring-orange-500/20 flex-shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      {rouletteImageError ? (
                        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                          <WifiOff className="text-slate-400/80 mb-0.5" size={18} />
                          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 text-slate-400/80">Connection Error</span>
                        </div>
                      ) : (
                        <img 
                          src={currentItem.imageUrl} 
                          alt={currentItem.name} 
                          className="w-full h-full object-cover" 
                          onError={() => setRouletteImageError(true)}
                        />
                      )}
                    </div>
                  )}

                  <h2 className="text-2xl font-bold mb-2">{currentItem.name}</h2>
                  
                  {viewMode === "restaurant" && currentItem.location ? (
                    <>
                      <div className="flex items-center gap-4 text-slate-550 dark:text-slate-400 mb-2 font-normal">
                        <div className="flex items-center gap-1">
                          <Star size={16} className="text-yellow-500 fill-yellow-500" />
                          <span>{currentItem.rating || "N/A"}</span>
                          <span className="text-xs">({currentItem.userRatingsTotal || 0})</span>
                        </div>
                        {currentItem.priceLevel !== undefined && (
                          <div className="text-green-600 font-medium">{"$".repeat(currentItem.priceLevel)}</div>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{currentItem.vicinity}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 rounded-full text-xs font-semibold">
                          {currentItem.cuisine}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-xs">
                          {currentItem.category}
                        </span>
                        {currentItem.halal && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 rounded-full text-xs font-bold">
                            Halal
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-550 dark:text-slate-450 mb-6 max-w-sm px-4 leading-relaxed italic line-clamp-3">
                        "{currentItem.description}"
                      </p>
                    </>
                  )}

                  {winner && (
                    <div className="w-full flex flex-col gap-3 mt-2 animate-in fade-in slide-in-from-bottom-4">
                      {/* Veto Mode Actions */}
                      {vetoModeEnabled && !isAccepted && (
                        <div className="flex gap-3 w-full">
                          <button
                            onClick={handleVeto}
                            disabled={isLastOne}
                            className={`flex-1 py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${isLastOne
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                              : "bg-rose-50 dark:bg-rose-955/30 text-rose-600 dark:text-rose-400 border-2 border-rose-205 dark:border-rose-800 hover:bg-rose-100"
                              }`}
                          >
                            <Trash2 size={18} />
                            {isLastOne ? "Can't Veto" : "Remove"}
                          </button>
                          <button
                            onClick={() => {
                              setIsAccepted(true);
                              if (viewMode === "restaurant") {
                                setSelectedPlaceId(currentItem.id);
                              } else {
                                setSelectedFood(currentItem);
                              }
                            }}
                            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            <Trophy size={18} />
                            Accept!
                          </button>
                        </div>
                      )}

                      {/* Normal Mode Actions or Accepted Veto Mode Actions */}
                      {(!vetoModeEnabled || isAccepted) && (
                        <>
                          {viewMode === "restaurant" && currentItem.location ? (
                            <>
                              <button
                                onClick={() => setSelectedPlaceId(currentItem.id)}
                                className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors cursor-pointer"
                              >
                                <BookOpen size={18} />
                                See Menu & Reviews
                              </button>

                              <div className="flex gap-3 w-full">
                                <button
                                  onClick={() => startSpin()}
                                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium rounded-xl hover:bg-slate-205 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                >
                                  Spin Again
                                </button>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${currentItem.location?.lat},${currentItem.location?.lng}&query_place_id=${currentItem.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer border border-slate-205 dark:border-slate-800"
                                >
                                  <Navigation size={18} />
                                  Navigate
                                </a>
                              </div>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setSelectedFood(currentItem)}
                                className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors cursor-pointer"
                              >
                                <BookOpen size={18} />
                                Details & Ingredients
                              </button>

                              <div className="flex gap-3 w-full">
                                <button
                                  onClick={() => startSpin()}
                                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                >
                                  Spin Again
                                </button>
                                <button
                                  onClick={() => setSelectedFood(currentItem)}
                                  className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer border border-slate-202 dark:border-slate-800"
                                >
                                  <Search size={18} />
                                  Find spots
                                </button>
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {/* McD Escape Hatch */}
                      <a
                        href="https://www.google.com/maps/search/McDonald%27s+near+me"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-505 transition-colors"
                      >
                        🍟 Still can't decide? Just go to McD.
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Vetoed List */}
            {vetoModeEnabled && vetoedItems.length > 0 && (
              <div className="w-full mt-8 animate-in fade-in">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Trash2 size={12} /> Eliminated ({vetoedItems.length})
                </p>
                <div className="space-y-2">
                  {vetoedItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 opacity-50">
                      <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                        <Trash2 size={14} className="text-rose-505" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-through text-slate-505 truncate">{item.name}</p>
                      </div>
                      <button
                        onClick={() => setVetoedIds(ids => ids.filter(id => id !== item.id))}
                        className="text-xs text-slate-400 hover:text-orange-500 transition-colors cursor-pointer flex-shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SPIN BUTTON */}
            {!isSpinning && !winner && vibeStep === 0 && (
              <button
                onClick={handleSpinClick}
                className="w-56 h-56 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 hover:scale-105 active:scale-95 text-white font-black text-2xl shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer select-none border-8 border-white dark:border-slate-950"
              >
                <RotateCcw size={32} />
                <span>SPIN!</span>
              </button>
            )}

            {winner && !isSpinning && (
              <button
                onClick={handleResetVeto}
                className="mt-6 px-6 py-2.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Reset & Spin Again
              </button>
            )}

          </div>
        )}
      </div>

      {/* Details Modals */}
      <RestaurantDetailsModal
        placeId={selectedPlaceId}
        onClose={() => setSelectedPlaceId(null)}
      />

      <FoodDetailsModal 
        food={selectedFood}
        onClose={() => setSelectedFood(null)}
      />
    </div>
  );
}
