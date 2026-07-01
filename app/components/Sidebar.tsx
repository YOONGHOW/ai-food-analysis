"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Settings, Dices, MapPin, Navigation, Check, Coins, Heart, Loader2, ChevronDown, Compass, LayoutDashboard } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export const STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Malacca",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur"
];

export const STATE_CAPITALS: { [key: string]: string } = {
  "Johor": "Johor Bahru",
  "Kedah": "Alor Setar",
  "Kelantan": "Kota Bharu",
  "Malacca": "Malacca City",
  "Negeri Sembilan": "Seremban",
  "Pahang": "Kuantan",
  "Penang": "George Town",
  "Perak": "Ipoh",
  "Perlis": "Kangar",
  "Sabah": "Kota Kinabalu",
  "Sarawak": "Kuching",
  "Selangor": "Shah Alam",
  "Terengganu": "Kuala Terengganu",
  "Kuala Lumpur": "Bukit Bintang"
};

export const RADIUS_OPTIONS = [
  { label: "1 KM", value: 1000 },
  { label: "5 KM", value: 5000 },
  { label: "10 KM", value: 10000 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const {
    state, setState,
    place, setPlace,
    radius, setRadius,
    priceTier, setPriceTier,
    isSidebarOpen, setIsSidebarOpen,
    useCurrentLocation, setUseCurrentLocation,
    prefersSpicy, setPrefersSpicy
  } = useSettings();

  // Local temporary state for editing settings
  const [tempState, setTempState] = useState(state);
  const [tempPlace, setTempPlace] = useState(place);
  const [tempPriceTier, setTempPriceTier] = useState(priceTier);
  const [showAppliedAlert, setShowAppliedAlert] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [useLocationToggle, setUseLocationToggle] = useState(false);

  // Autocomplete states
  const [predictions, setPredictions] = useState<{ description: string; mainText: string }[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);

  // Accordion section expanded states
  const [searchExpanded, setSearchExpanded] = useState(true);
  const [exploreExpanded, setExploreExpanded] = useState(true);
  const [playExpanded, setPlayExpanded] = useState(true);

  // Debounced autocomplete fetcher
  useEffect(() => {
    if (!tempPlace || tempPlace.length < 2 || useLocationToggle) {
      setPredictions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoadingPredictions(true);
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(tempPlace)}`);
        const data = await res.json();
        if (data.predictions) {
          setPredictions(data.predictions);
        }
      } catch (err) {
        console.warn("Failed to fetch autocomplete predictions:", err);
      } finally {
        setLoadingPredictions(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [tempPlace, useLocationToggle]);

  const handleSelectPrediction = (pred: { description: string; mainText: string }) => {
    setTempPlace(pred.mainText);
    setShowPredictions(false);
    setPredictions([]);

    // Detect State from the description
    const parts = pred.description.split(',').map(p => p.trim());
    for (const part of parts) {
      let normalized = part;
      if (part === "Pulau Pinang") normalized = "Penang";
      if (part === "Melaka" || part === "Malacca") normalized = "Malacca";
      if (part === "Wilayah Persekutuan Kuala Lumpur") normalized = "Kuala Lumpur";
      if (part === "Wilayah Persekutuan Labuan") normalized = "Labuan";
      if (part === "Wilayah Persekutuan Putrajaya") normalized = "Putrajaya";

      if (STATES.includes(normalized)) {
        setTempState(normalized);
        break;
      }
    }
  };

  // Sync temp state with global state when sidebar opens
  useEffect(() => {
    if (isSidebarOpen) {
      setTempState(state);
      setTempPlace(place);
      setTempPriceTier(priceTier);
      setDetectError(null);
      setUseLocationToggle(useCurrentLocation);
      setPredictions([]);
      setShowPredictions(false);
    }
  }, [isSidebarOpen, state, place, priceTier, useCurrentLocation]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setDetectError("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetecting(true);
    setDetectError(null);

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`/api/places/reverse?lat=${latitude}&lng=${longitude}`);
            const data = await res.json();
            if (data.state && data.place) {
              setTempState(data.state);
              setTempPlace(data.place);
            } else {
              setDetectError(data.error || "Failed to resolve your coordinates.");
            }
          } catch (err) {
            console.warn("Geocoding fetch error:", err);
            setDetectError("Network error while resolving your location.");
          } finally {
            setIsDetecting(false);
          }
        },
        (error) => {
          console.warn("Geolocation permission or GPS coordinates retrieval failed:", error);
          if (error.code === error.PERMISSION_DENIED) {
            setDetectError("Location permission denied.");
          } else {
            setDetectError("Failed to retrieve your GPS coordinates.");
          }
          setIsDetecting(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (err) {
      console.warn("Geolocation API access exception:", err);
      setDetectError("Failed to access location service.");
      setIsDetecting(false);
    }
  };

  const handleToggleLocation = () => {
    const nextVal = !useLocationToggle;
    setUseLocationToggle(nextVal);
    if (nextVal) {
      handleDetectLocation();
    } else {
      setDetectError(null);
      setTempState("Penang");
      setTempPlace("George Town");
    }
  };

  const closeSidebar = () => setIsOpen(false);
  const setIsOpen = (val: boolean) => setIsSidebarOpen(val);

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedState = e.target.value;
    setTempState(selectedState);
    // Autofill capital city when state changes
    setTempPlace(STATE_CAPITALS[selectedState] || "");
  };

  const handleApplySettings = () => {
    setState(tempState);
    setPlace(tempPlace);
    setPriceTier(tempPriceTier);
    setUseCurrentLocation(useLocationToggle);
    setShowAppliedAlert(true);
    setTimeout(() => {
      setShowAppliedAlert(false);
      closeSidebar();
    }, 800);
  };

  return (
    <>
      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-80 bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-r border-slate-200 dark:border-slate-800 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/50">
          <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
            CariMakan?
          </span>
          <button
            onClick={closeSidebar}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">

          {/* 1. Settings Module */}
          <section className="border-b border-slate-100 dark:border-slate-800/40 pb-3">
            <button
              onClick={() => setSearchExpanded(!searchExpanded)}
              className="w-full flex items-center justify-between py-2 text-slate-900 dark:text-white font-semibold cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-orange-500 transition-transform group-hover:rotate-45" />
                <h3>Search Settings</h3>
              </div>
              <ChevronDown
                size={18}
                className={`text-slate-400 transition-transform duration-200 ${searchExpanded ? "rotate-180" : ""}`}
              />
            </button>

            {searchExpanded && (
              <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Use Current Location Toggle */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      {isDetecting ? (
                        <Loader2 size={16} className="text-orange-500 animate-spin" />
                      ) : (
                        <Navigation size={16} className={`transition-transform duration-300 ${useLocationToggle ? "text-orange-500 rotate-45" : "text-slate-400"}`} />
                      )}
                      <span className="text-sm font-semibold">
                        {isDetecting ? "Detecting location..." : "Use Current Location"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleLocation}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none ${useLocationToggle ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useLocationToggle ? "translate-x-6" : "translate-x-1"
                          }`}
                      />
                    </button>
                  </div>
                  {detectError && (
                    <p className="text-[10px] font-bold text-rose-500 text-center bg-rose-50 dark:bg-rose-950/10 border border-rose-200/30 dark:border-rose-900/30 rounded-lg p-2 animate-pulse">
                      {detectError}
                    </p>
                  )}
                </div>

                {/* State and Place (Hidden when Use Current Location is ON) */}
                {!useLocationToggle && (
                  <>
                    {/* State Select */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                        <MapPin size={12} /> State
                      </label>
                      <select
                        value={tempState}
                        onChange={handleStateChange}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-3 text-sm outline-none focus:border-orange-500 dark:focus:border-orange-500 transition-colors appearance-none cursor-pointer"
                      >
                        {STATES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Place Input */}
                    <div className="relative">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                        <MapPin size={12} /> Place / Area
                      </label>
                      <input
                        type="text"
                        value={tempPlace}
                        onChange={(e) => {
                          setTempPlace(e.target.value);
                          setShowPredictions(true);
                        }}
                        onFocus={() => setShowPredictions(true)}
                        onBlur={() => {
                          // Delay closing to allow onClick handler to run first
                          setTimeout(() => setShowPredictions(false), 250);
                        }}
                        placeholder="e.g. Tanjung Bungah"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-3 text-sm outline-none focus:border-orange-500 dark:focus:border-orange-500 transition-colors"
                        autoComplete="off"
                      />

                      {/* Autocomplete Dropdown List */}
                      {showPredictions && (predictions.length > 0 || loadingPredictions) && (
                        <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900/50 animate-in fade-in slide-in-from-top-1 duration-100">
                          {loadingPredictions && (
                            <div className="p-3 text-xs text-slate-400 flex items-center gap-2">
                              <Loader2 size={12} className="animate-spin text-orange-500" />
                              <span>Loading area suggestions...</span>
                            </div>
                          )}
                          {!loadingPredictions && predictions.map((pred, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectPrediction(pred)}
                              className="w-full text-left p-3 hover:bg-orange-50/40 dark:hover:bg-orange-950/10 transition-colors cursor-pointer text-slate-700 dark:text-slate-300 block"
                            >
                              <span className="font-semibold text-xs block">{pred.mainText}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 truncate">{pred.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Radius Option (Shown only when Use Current Location is ON) */}
                {useLocationToggle && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                      <Navigation size={12} /> Search Radius
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {RADIUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setRadius(opt.value)}
                          className={`py-2.5 text-xs rounded-xl border transition-colors cursor-pointer ${radius === opt.value
                            ? "bg-orange-50 dark:bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Budget Option */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                    <Coins size={12} /> Budget / Price Tier
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "All", value: "all" },
                      { label: "$", value: "1" },
                      { label: "$$", value: "2" },
                      { label: "$$$", value: "3" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setTempPriceTier(opt.value)}
                        className={`py-2.5 text-xs rounded-xl border transition-colors cursor-pointer ${tempPriceTier === opt.value
                          ? "bg-orange-50 dark:bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={handleApplySettings}
                  className="w-full py-3 mt-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-xl text-sm transition-transform shadow-md hover:scale-102 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {showAppliedAlert ? (
                    <>
                      <Check size={16} /> Applied!
                    </>
                  ) : (
                    "Apply Settings"
                  )}
                </button>
              </div>
            )}
          </section>

          {/* Explore Module */}
          <section className="border-b border-slate-100 dark:border-slate-800/40 pb-3">
            <button
              onClick={() => setExploreExpanded(!exploreExpanded)}
              className="w-full flex items-center justify-between py-2 text-slate-900 dark:text-white font-semibold cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2">
                <Compass size={18} className="text-orange-500 transition-transform group-hover:scale-110" />
                <h3>Explore</h3>
              </div>
              <ChevronDown
                size={18}
                className={`text-slate-400 transition-transform duration-200 ${exploreExpanded ? "rotate-180" : ""}`}
              />
            </button>

            {exploreExpanded && (
              <div className="flex flex-col gap-1 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <Link
                  href="/dashboard"
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${pathname === '/dashboard'
                    ? 'bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                >
                  <LayoutDashboard size={16} className="flex-shrink-0" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/restaurants"
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${pathname === '/restaurants'
                    ? 'bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                >
                  <MapPin size={16} className="flex-shrink-0" />
                  <span>Browse Makan</span>
                </Link>
                <Link
                  href="/favorites"
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${pathname === '/favorites'
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                >
                  <Heart size={16} className="flex-shrink-0 text-rose-500 fill-rose-500/10" />
                  <span>Favorite Makan</span>
                </Link>
              </div>
            )}
          </section>

          {/* 2. Play Module */}
          <section className="pb-3">
            <button
              onClick={() => setPlayExpanded(!playExpanded)}
              className="w-full flex items-center justify-between py-2 text-slate-900 dark:text-white font-semibold cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2">
                <Dices size={18} className="text-rose-500 transition-transform group-hover:rotate-12" />
                <h3>Play</h3>
              </div>
              <ChevronDown
                size={18}
                className={`text-slate-400 transition-transform duration-200 ${playExpanded ? "rotate-180" : ""}`}
              />
            </button>

            {playExpanded && (
              <div className="flex flex-col gap-1 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <Link
                  href="/roulette"
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${pathname === '/roulette'
                    ? 'bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                >
                  <Dices size={16} className="flex-shrink-0" />
                  <span>Spin the Wheel</span>
                </Link>
                <Link
                  href="/couples-swipe"
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${pathname === '/couples-swipe'
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                >
                  <Heart size={16} className="flex-shrink-0" />
                  <div>
                    <span className="block text-sm">Couples Swipe</span>
                    <span className="block text-xs text-slate-400 font-normal">Food Tinder for two</span>
                  </div>
                </Link>
              </div>
            )}
          </section>



        </div>
      </div>
    </>
  );
}
