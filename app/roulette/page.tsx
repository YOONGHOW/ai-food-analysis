"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, MapPin, Star, Navigation, RefreshCw, BookOpen, Trash2, Trophy, RotateCcw, Zap } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import RestaurantDetailsModal from "../components/RestaurantDetailsModal";

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

export default function RoulettePage() {
  const { state, place, radius, priceTier } = useSettings();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(0);
  const [winner, setWinner] = useState<Place | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

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
  const [spinPool, setSpinPool] = useState<Place[]>([]);

  const spinInterval = useRef<NodeJS.Timeout | null>(null);

  const filteredPlaces = places.filter(p => matchesPriceTier(p, priceTier));
  const activePlaces = vetoModeEnabled
    ? filteredPlaces.filter(p => !vetoedIds.includes(p.id))
    : filteredPlaces;
  const vetoedPlaces = filteredPlaces.filter(p => vetoedIds.includes(p.id));

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
    try {
      const res = await fetch(`/api/places?state=${encodeURIComponent(state)}&place=${encodeURIComponent(place)}&radius=${radius}`);
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
  }, [state, place, radius]);

  const startSpin = (pool: Place[] = activePlaces, fast = false) => {
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
        setCurrentDisplayIndex(pool.findIndex(p => p.id === finalWinner.id));
        if (!vetoModeEnabled) setSelectedPlaceId(finalWinner.id);
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

    const newPool = filteredPlaces.filter(p => !newVetoedIds.includes(p.id));
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
        <p className="text-red-500 mb-4">{error}</p>
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
      
      const matchedPool = filterPlacesByVibe(activePlaces, updatedAnswers);
      if (matchedPool.length > 0) {
        setVibeFallbackActive(false);
        startSpin(matchedPool);
      } else {
        setVibeFallbackActive(true);
        startSpin(activePlaces);
      }
    }
  };

  const displayPool = (isSpinning || winner) && spinPool.length > 0 ? spinPool : activePlaces;
  const currentPlace = displayPool[currentDisplayIndex];

  return (
    <div className="flex flex-col items-center w-full px-4 py-8">
      <div className="max-w-md w-full flex flex-col items-center">

        <h1 className="text-3xl font-bold mb-1">Food Roulette</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-center text-sm">
          Let fate decide your next meal in {place}, {state}.
        </p>

        {/* Veto Mode Toggle */}
        <div
          onClick={() => { setVetoModeEnabled(v => !v); setVetoedIds([]); setWinner(null); setIsAccepted(false); }}
          className={`w-full mb-4 p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all duration-300 ${
            vetoModeEnabled
              ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30"
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
                {vetoModeEnabled ? "Reject & shrink the pool until one survives" : "Tap to enable — reject restaurants one by one"}
              </p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${vetoModeEnabled ? "bg-rose-500 justify-end" : "bg-slate-200 dark:bg-slate-700 justify-start"}`}>
            <div className="w-4 h-4 bg-white rounded-full shadow" />
          </div>
        </div>

        {/* Vibe Funnel Toggle */}
        <div
          onClick={() => {
            setVibeFunnelEnabled(v => !v);
            setVibeStep(0);
            setVibeAnswers({ style: null, flavor: null, vibe: null });
            setVibeFallbackActive(false);
          }}
          className={`w-full mb-6 p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all duration-300 ${
            vibeFunnelEnabled
              ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${vibeFunnelEnabled ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
              <Zap size={18} />
            </div>
            <div>
              <p className={`text-sm font-bold ${vibeFunnelEnabled ? "text-orange-600 dark:text-orange-400" : "text-slate-700 dark:text-slate-300"}`}>
                Vibe Funnel Mode
              </p>
              <p className="text-xs text-slate-400">
                Filter by mood (Style, Spice, Vibe) before spinning
              </p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${vibeFunnelEnabled ? "bg-orange-500 justify-end" : "bg-slate-200 dark:bg-slate-700 justify-start"}`}>
            <div className="w-4 h-4 bg-white rounded-full shadow" />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center text-slate-400 py-12">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Finding the best spots...</p>
          </div>
        ) : (
          <div className="w-full relative min-h-[300px] flex flex-col items-center justify-center">

            {/* Pool counter (Veto mode) */}
            {vetoModeEnabled && filteredPlaces.length > 0 && (
              <div className="mb-4 flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-semibold">
                  <Zap size={14} className="text-orange-500" />
                  <span>{activePlaces.length} remaining</span>
                  {vetoedIds.length > 0 && (
                    <span className="text-slate-400">· {vetoedIds.length} vetoed</span>
                  )}
                </div>
                {vetoedIds.length > 0 && (
                  <button
                    onClick={handleResetVeto}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-slate-200 dark:border-slate-700 hover:border-slate-400 transition-colors text-slate-500 cursor-pointer"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                )}
              </div>
            )}

            {displayPool.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-lg text-slate-500 mb-2">No restaurants match your filters.</p>
                <p className="text-sm text-slate-400 mb-6">Try changing your budget settings or increasing your search radius.</p>
              </div>
            )}

            {activePlaces.length === 0 && vetoModeEnabled && vetoedIds.length > 0 && (
              <div className="text-center py-12 animate-in fade-in">
                <div className="text-6xl mb-4">😭</div>
                <p className="text-xl font-bold mb-2">You vetoed everything!</p>
                <p className="text-slate-500 mb-6 text-sm">No restaurants left. Either reset or accept your fate.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={handleResetVeto} className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-sm cursor-pointer">
                    Reset & Try Again
                  </button>
                  <a href="https://www.google.com/maps/search/McDonald%27s+near+me" target="_blank" rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-yellow-400 text-slate-900 font-bold rounded-xl text-sm">
                    🍟 Just go to McD
                  </a>
                </div>
              </div>
            )}

            {activePlaces.length > 0 && !winner && !isSpinning && vibeStep === 0 && (
              <div className="text-center py-12">
                <p className="text-xl mb-2">
                  {vetoModeEnabled
                    ? `${activePlaces.length} restaurants in the pool.`
                    : `Found ${activePlaces.length} nearby restaurants.`}
                </p>
                {vetoModeEnabled && (
                  <p className="text-sm text-slate-500 mb-4">Spin, then Veto the ones you don't want!</p>
                )}
                {vibeFunnelEnabled && (
                  <p className="text-sm text-orange-500 font-semibold mb-6 flex items-center justify-center gap-1.5 animate-pulse">
                    <Zap size={14} /> Vibe funnel is active!
                  </p>
                )}
                <button
                  onClick={handleSpinClick}
                  className="px-10 py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-full text-xl hover:scale-105 transition-transform shadow-lg shadow-orange-500/30 cursor-pointer"
                >
                  SPIN NOW
                </button>
              </div>
            )}

            {/* Vibe Funnel Wizard */}
            {vibeFunnelEnabled && vibeStep > 0 && !winner && !isSpinning && (
              <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl text-center animate-in fade-in zoom-in-95 duration-200">
                {/* Step indicators */}
                <div className="flex justify-center gap-1.5 mb-6">
                  {[1, 2, 3].map(step => (
                    <div
                      key={step}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        step === vibeStep
                          ? "w-8 bg-orange-500"
                          : step < vibeStep
                          ? "w-3 bg-orange-200 dark:bg-orange-850"
                          : "w-3 bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  ))}
                </div>

                {vibeStep === 1 && (
                  <div className="animate-in slide-in-from-right duration-200">
                    <h3 className="text-xl font-extrabold mb-1">What is the style?</h3>
                    <p className="text-xs text-slate-405 dark:text-slate-400 mb-5">Choose how the food is served</p>
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
                    <p className="text-xs text-slate-405 dark:text-slate-400 mb-5">Choose your spice preference</p>
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
                    <p className="text-xs text-slate-405 dark:text-slate-400 mb-5">Choose the dining atmosphere</p>
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
                    className="text-slate-405 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
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

            {(isSpinning || winner) && currentPlace && (
              <div className={`w-full relative transition-all duration-300 transform ${showVetoFlash ? "scale-90 opacity-0" : "scale-100 opacity-100"}`}>
                <div className={`w-full bg-white dark:bg-slate-900 border-2 ${
                  isLastOne && winner ? "border-yellow-400 shadow-xl shadow-yellow-400/20"
                  : winner ? "border-orange-500 shadow-xl shadow-orange-500/20"
                  : "border-slate-200 dark:border-slate-800"
                } rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 transform ${isSpinning ? "scale-95 opacity-80" : "scale-100 opacity-100"}`}>

                  {/* Trophy for last one */}
                  {isLastOne && winner && (
                    <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 text-xs font-bold">
                      <Trophy size={14} /> Last Restaurant Standing!
                    </div>
                  )}

                  {currentPlace.photoReference ? (
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-4 ring-4 ring-orange-500/20">
                      <img src={`/api/places/photo?ref=${currentPlace.photoReference}`} alt={currentPlace.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <MapPin size={32} className="text-orange-500" />
                    </div>
                  )}

                  <h2 className="text-2xl font-bold mb-2">{currentPlace.name}</h2>
                  <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 mb-2">
                    <div className="flex items-center gap-1">
                      <Star size={16} className="text-yellow-500 fill-yellow-500" />
                      <span>{currentPlace.rating || "N/A"}</span>
                      <span className="text-xs">({currentPlace.userRatingsTotal || 0})</span>
                    </div>
                    {currentPlace.priceLevel !== undefined && (
                      <div className="text-green-600 font-medium">{"$".repeat(currentPlace.priceLevel)}</div>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{currentPlace.vicinity}</p>

                  {winner && (
                    <div className="w-full flex flex-col gap-3 mt-2 animate-in fade-in slide-in-from-bottom-4">
                      {/* Veto Mode Actions */}
                      {vetoModeEnabled && !isAccepted && (
                        <div className="flex gap-3 w-full">
                          <button
                            onClick={handleVeto}
                            disabled={isLastOne}
                            className={`flex-1 py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              isLastOne
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-2 border-rose-200 dark:border-rose-800 hover:bg-rose-100"
                            }`}
                          >
                            <Trash2 size={18} />
                            {isLastOne ? "Can't Veto" : "Remove"}
                          </button>
                          <button
                            onClick={() => {
                              setIsAccepted(true);
                              setSelectedPlaceId(currentPlace.id);
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
                          <button
                            onClick={() => setSelectedPlaceId(currentPlace.id)}
                            className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors cursor-pointer"
                          >
                            <BookOpen size={18} />
                            See Menu & Reviews
                          </button>

                          <div className="flex gap-3 w-full">
                            <button
                              onClick={() => startSpin()}
                              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              Spin Again
                            </button>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${currentPlace.location.lat},${currentPlace.location.lng}&query_place_id=${currentPlace.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 dark:border-slate-800"
                            >
                              <Navigation size={18} />
                              Navigate
                            </a>
                          </div>
                        </>
                      )}

                      {/* McD Escape Hatch */}
                      <a
                        href="https://www.google.com/maps/search/McDonald%27s+near+me"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-500 transition-colors"
                      >
                        🍟 Still can't decide? Just go to McD.
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Vetoed List */}
            {vetoModeEnabled && vetoedPlaces.length > 0 && (
              <div className="w-full mt-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Trash2 size={12} /> Eliminated ({vetoedPlaces.length})
                </p>
                <div className="space-y-2">
                  {vetoedPlaces.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 opacity-50">
                      <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                        <Trash2 size={14} className="text-rose-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-through text-slate-500 truncate">{p.name}</p>
                      </div>
                      <button
                        onClick={() => setVetoedIds(ids => ids.filter(id => id !== p.id))}
                        className="text-xs text-slate-400 hover:text-orange-500 transition-colors cursor-pointer flex-shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <RestaurantDetailsModal
        placeId={selectedPlaceId}
        onClose={() => setSelectedPlaceId(null)}
      />
    </div>
  );
}
