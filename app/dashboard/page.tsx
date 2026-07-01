"use client";

import { useState, useEffect } from "react";
import {
  CloudRain,
  Thermometer,
  Dices,
  Heart,
  Sparkles,
  ArrowRight,
  Search,
  Info,
  Flame,
  Soup,
  UtensilsCrossed,
  RefreshCw,
  Sun,
  CloudLightning,
  Cloudy,
  LayoutDashboard,
  Brain
} from "lucide-react";
import Link from "next/link";
import { useSettings } from "../context/SettingsContext";
import FoodDetailsModal from "../components/FoodDetailsModal";

// State capitals coordinates mapping for weather fallback
const STATE_CAPITALS_COORDS: { [key: string]: { lat: number; lng: number; name: string } } = {
  "Johor": { lat: 1.4927, lng: 103.7414, name: "Johor Bahru" },
  "Kedah": { lat: 6.1210, lng: 100.3601, name: "Alor Setar" },
  "Kelantan": { lat: 6.1254, lng: 102.2386, name: "Kota Bharu" },
  "Malacca": { lat: 2.1896, lng: 102.2501, name: "Malacca City" },
  "Negeri Sembilan": { lat: 2.7258, lng: 101.9424, name: "Seremban" },
  "Pahang": { lat: 3.8077, lng: 103.3260, name: "Kuantan" },
  "Penang": { lat: 5.4141, lng: 100.3288, name: "George Town" },
  "Perak": { lat: 4.5975, lng: 101.0901, name: "Ipoh" },
  "Perlis": { lat: 6.4414, lng: 100.1986, name: "Kangar" },
  "Sabah": { lat: 5.9804, lng: 116.0753, name: "Kota Kinabalu" },
  "Sarawak": { lat: 1.5533, lng: 110.3592, name: "Kuching" },
  "Selangor": { lat: 3.0738, lng: 101.5183, name: "Shah Alam" },
  "Terengganu": { lat: 5.3302, lng: 103.1408, name: "Kuala Terengganu" },
  "Kuala Lumpur": { lat: 3.1390, lng: 101.6869, name: "Kuala Lumpur" }
};

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

interface WeatherData {
  temp: number;
  weatherCode: number;
  isRainy: boolean;
  isCold: boolean;
  locationName: string;
}

export default function DashboardPage() {
  const {
    state,
    place,
    useCurrentLocation,
    prefersSpicy,
    setPrefersSpicy,
    isFavoriteFood,
    toggleFavoriteFood
  } = useSettings();

  // Weather states
  const [weather, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Foods states
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [localSpicyFilter, setLocalSpicyFilter] = useState(prefersSpicy);
  const [foodSearch, setFoodSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const [foodImageErrors, setFoodImageErrors] = useState<Record<string, boolean>>({});

  // Synchronize local filter state with global settings context
  useEffect(() => {
    setLocalSpicyFilter(prefersSpicy);
  }, [prefersSpicy]);

  // Load Malaysian food list
  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const res = await fetch("/data/malaysian_foods.json");
        if (res.ok) {
          const data = await res.json();
          setFoods(data);
        }
      } catch (err) {
        console.error("Failed to load foods database:", err);
      }
    };
    fetchFoods();
  }, []);

  // Fetch Weather based on current location settings
  const fetchWeather = async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      let lat = 5.4141; // Default George Town
      let lng = 100.3288;
      let locationLabel = place || "George Town";

      if (useCurrentLocation && navigator.geolocation) {
        // Run coordinate acquisition
        const getPosition = () => {
          return new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
          });
        };
        try {
          const pos = await getPosition();
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          locationLabel = "Your Location";
        } catch (e) {
          console.warn("GPS lookup failed, falling back to state capital coordinates.", e);
          const cap = STATE_CAPITALS_COORDS[state] || STATE_CAPITALS_COORDS["Penang"];
          lat = cap.lat;
          lng = cap.lng;
          locationLabel = `${cap.name}, ${state}`;
        }
      } else {
        const cap = STATE_CAPITALS_COORDS[state] || STATE_CAPITALS_COORDS["Penang"];
        lat = cap.lat;
        lng = cap.lng;
        locationLabel = `${place || cap.name}, ${state}`;
      }

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`;
      const res = await fetch(weatherUrl);
      if (!res.ok) throw new Error("Weather request failed");
      const weatherData = await res.json();

      const temp = weatherData.current?.temperature_2m ?? 30;
      const code = weatherData.current?.weather_code ?? 0;

      // Rain codes: 51, 53, 55 (drizzle), 61, 63, 65 (rain), 80, 81, 82 (showers), 95, 96, 99 (thunderstorm)
      const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
      const isCold = temp < 28.0;

      setWeatherData({
        temp,
        weatherCode: code,
        isRainy,
        isCold,
        locationName: locationLabel
      });
    } catch (err: any) {
      console.error("Failed to fetch weather forecast:", err);
      setWeatherError("Weather lookup unavailable. Showing standard recommendations.");
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [state, place, useCurrentLocation]);

  // Determine weather summary parameters
  const isCozyWeather = weather ? (weather.isRainy || weather.isCold) : false;

  // Curated comfort food suggestions matching weather and spice filter
  const cozySuggestions = foods.filter(f => {
    // Check if it's hotpot or soup
    const isSoupFood = f.category.toLowerCase().includes("soup") ||
      f.category.toLowerCase().includes("hotpot") ||
      f.name.toLowerCase().includes("soup") ||
      f.name.toLowerCase().includes("hotpot") ||
      f.description.toLowerCase().includes("soup") ||
      f.description.toLowerCase().includes("hotpot") ||
      f.description.toLowerCase().includes("broth") ||
      f.description.toLowerCase().includes("gravy");

    // If cozy (rainy/cold), we want soup/hotpot.
    // If warm/cloudy, we want dry/non-soup food!
    if (isCozyWeather) {
      if (!isSoupFood) return false;
    } else {
      if (isSoupFood) return false;
    }

    // Filter by spicy preference (strict matching)
    return (f.flavor.toLowerCase() === "spicy") === localSpicyFilter;
  })
  .sort((a, b) => {
    if (isCozyWeather) {
      // Prioritize "Hotpot" category or name containing "hotpot"
      const aIsHotpot = a.category.toLowerCase().includes("hotpot") || a.name.toLowerCase().includes("hotpot");
      const bIsHotpot = b.category.toLowerCase().includes("hotpot") || b.name.toLowerCase().includes("hotpot");
      if (aIsHotpot && !bIsHotpot) return -1;
      if (!aIsHotpot && bIsHotpot) return 1;
    }
    return 0;
  })
  .slice(0, 6); // Max 6 suggestions

  // Main browse food listing filter
  const filteredFoods = foods.filter(f => {
    // Keyword match
    const matchesSearch = f.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(foodSearch.toLowerCase()) ||
      f.ingredients.some(i => i.toLowerCase().includes(foodSearch.toLowerCase()));

    // Category match
    const matchesCategory = selectedCategory === "all" || f.category === selectedCategory;

    // Cuisine match
    const matchesCuisine = selectedCuisine === "all" || f.cuisine === selectedCuisine;

    // Spicy preference match (strict matching)
    const matchesSpicy = (f.flavor.toLowerCase() === "spicy") === localSpicyFilter;

    return matchesSearch && matchesCategory && matchesCuisine && matchesSpicy;
  });

  // Unique categories list for filtering
  const categories = ["all", ...Array.from(new Set(foods.map(f => f.category)))];
  // Unique cuisines list
  const cuisines = ["all", ...Array.from(new Set(foods.map(f => f.cuisine)))];

  const handleImageError = (id: string) => {
    setFoodImageErrors(prev => ({ ...prev, [id]: true }));
  };

  // Weather description icon helper
  const getWeatherIcon = (code: number, temp: number) => {
    if ([95, 96, 99].includes(code)) return <CloudLightning className="text-yellow-400 animate-pulse w-8 h-8" />;
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain className="text-blue-405 w-8 h-8" />;
    if ([1, 2, 3, 45, 48].includes(code)) return <Cloudy className="text-slate-400 w-8 h-8" />;
    if (temp >= 32) return <Sun className="text-orange-500 animate-spin w-8 h-8" style={{ animationDuration: '30s' }} />;
    return <Sun className="text-amber-400 w-8 h-8" />;
  };

  // Weather condition string helper
  const getWeatherText = (code: number, temp: number) => {
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Raining";
    if ([1, 2, 3, 45, 48].includes(code)) return "Cloudy";
    if (temp >= 32) return "Sunny & Hot";
    return "Pleasant & Fair";
  };

  return (
    <div className="w-full px-6 py-8 flex flex-col flex-1 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* Title Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-orange-600 dark:from-white dark:via-slate-200 dark:to-orange-400 bg-clip-text text-transparent">
            Your Food Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time weather recommendations and local food personalized just for you.
          </p>
        </div>

        {/* Global preferences quick actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-sm text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">🌶️ Prefers Spicy:</span>
            <button
              onClick={() => setPrefersSpicy(!prefersSpicy)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none ${prefersSpicy ? "bg-orange-500" : "bg-slate-200 dark:bg-slate-800"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefersSpicy ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <button
            onClick={fetchWeather}
            disabled={weatherLoading}
            className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm cursor-pointer disabled:opacity-50 text-slate-700 dark:text-slate-350 transition-colors"
            title="Refresh weather data"
          >
            <RefreshCw size={16} className={weatherLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Hero Section: Weather recommendations Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Weather Card Widget */}
        <div className={`lg:col-span-1 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-xl ${weatherLoading
            ? "bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200/50 dark:border-slate-800/40"
            : isCozyWeather
              ? "bg-gradient-to-br from-blue-900/90 via-slate-900 to-indigo-950 text-white border border-blue-950/40"
              : "bg-gradient-to-br from-amber-500/10 via-white to-orange-500/5 dark:from-amber-950/20 dark:via-slate-950 dark:to-orange-950/10 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800/60"
          }`}>
          {/* Decorative background grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-end">
              {!weatherLoading && weather && getWeatherIcon(weather.weatherCode, weather.temp)}
            </div>

            {weatherLoading ? (
              <div className="space-y-3">
                <div className="h-10 bg-slate-300 dark:bg-slate-800 rounded-lg w-1/3" />
                <div className="h-6 bg-slate-300 dark:bg-slate-800 rounded-lg w-1/2" />
              </div>
            ) : weatherError ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{weatherError}</p>
                <h3 className="text-3xl font-extrabold">30.0°C</h3>
                <p className="text-xs text-slate-450">Penang Fallback</p>
              </div>
            ) : weather ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-5xl font-extrabold tracking-tight">
                    {weather.temp.toFixed(1)}°C
                  </h3>
                  <span className="text-lg font-semibold text-slate-400 dark:text-slate-400">
                    ({getWeatherText(weather.weatherCode, weather.temp)})
                  </span>
                </div>
                <p className="text-sm font-semibold mt-1 text-slate-650 dark:text-slate-300 truncate">
                  📍 {weather.locationName}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-8 relative z-10 space-y-3">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-orange-500" />
              Recommendation Context:
            </h4>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-450">
              {weatherLoading
                ? "Analyzing current forecast..."
                : isCozyWeather
                  ? "It's rainy or cool outside! The system suggests warming up with hot soup or a cozy Malaysian hotpot."
                  : "Perfect, warm tropical day. Enjoy classic street eats, dry styles, or cool flavors."
              }
            </p>
          </div>
        </div>

        {/* Dynamic Soup/Hotpot Card suggestions banner */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Soup className="text-orange-500" size={20} />
              <h2 className="text-xl font-bold">
                {isCozyWeather ? "Cozy Weather Food Suggestions" : "Recommended Comfort Foods"}
              </h2>
            </div>
            {localSpicyFilter && (
              <span className="text-[10px] bg-red-100 dark:bg-red-950/45 text-red-650 dark:text-red-400 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <Flame size={10} className="fill-current" /> Spicy Only Mode
              </span>
            )}
          </div>

          {weatherLoading ? (
            <div className="flex flex-col gap-3 flex-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-100 dark:bg-slate-800/30 animate-pulse rounded-2xl h-20" />
              ))}
            </div>
          ) : cozySuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <UtensilsCrossed size={32} className="text-slate-350 dark:text-slate-650 mb-2" />
              <p className="text-sm font-semibold text-slate-650 dark:text-slate-350">No matching cozy soup foods found.</p>
              <p className="text-xs text-slate-400 max-w-sm mt-0.5">Try toggling off the spicy preference filter to see more dishes.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto pr-1 max-h-[290px] flex-1 scrollbar-thin scrollbar-thumb-slate-250 dark:scrollbar-thumb-slate-800">
              {cozySuggestions.map(f => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFood(f)}
                  className="group bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-3 flex items-center justify-between hover:border-orange-500/60 dark:hover:border-orange-500/60 transition-all duration-300 cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Food image */}
                    <div className="w-16 h-16 rounded-xl relative overflow-hidden bg-slate-200 dark:bg-slate-800 flex-shrink-0">
                      {f.imageUrl && !foodImageErrors[f.id] ? (
                        <img
                          src={f.imageUrl}
                          alt={f.name}
                          onError={() => handleImageError(f.id)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Soup size={16} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider block">
                        {f.cuisine} • {f.category}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate mt-0.5">
                        {f.name}
                      </h4>
                      <p className="text-xs text-slate-450 dark:text-slate-500 truncate mt-0.5">
                        🌶️ {f.flavor} • {f.description}
                      </p>
                    </div>
                  </div>

                  <div className="pl-3 flex-shrink-0">
                    <span className="text-xs font-bold text-orange-500 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      View <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-[11px] text-slate-400 dark:text-slate-505 mt-4 flex items-center gap-1">
            <Info size={12} className="text-orange-500 flex-shrink-0" />
            <span>Matching hotpots, warm soups, and broths compiled from our local database.</span>
          </div>
        </div>

      </div>

      {/* Quick Play Shortcuts Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <UtensilsCrossed size={16} className="text-orange-500" />
          Quick Food Deciders
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Spin the Wheel card */}
          <Link
            href="/roulette"
            className="group p-6 rounded-3xl bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent dark:from-orange-500/10 dark:via-transparent border border-orange-500/20 dark:border-orange-500/10 hover:border-orange-500/40 transition-all duration-350 shadow-sm flex items-center justify-between"
          >
            <div className="space-y-2 max-w-[70%]">
              <div className="p-3 bg-orange-500 text-white rounded-2xl w-fit shadow-md shadow-orange-500/20 group-hover:rotate-12 transition-transform">
                <Dices size={24} />
              </div>
              <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">Spin the Makan Wheel</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Can't decide what to eat? Let random fate pick your next local Malaysian dish!</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full group-hover:translate-x-1 transition-transform">
              <ArrowRight size={20} className="text-orange-500" />
            </div>
          </Link>

          {/* Couples Swipe card */}
          <Link
            href="/couples-swipe"
            className="group p-6 rounded-3xl bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-500/10 dark:via-transparent border border-rose-500/20 dark:border-rose-500/10 hover:border-rose-500/40 transition-all duration-350 shadow-sm flex items-center justify-between"
          >
            <div className="space-y-2 max-w-[70%]">
              <div className="p-3 bg-rose-500 text-white rounded-2xl w-fit shadow-md shadow-rose-500/20 group-hover:scale-110 transition-transform">
                <Heart size={24} className="fill-current" />
              </div>
              <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">Couples Swipe</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Swipe food choices with a partner, and discover matching restaurants you both love.</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full group-hover:translate-x-1 transition-transform">
              <ArrowRight size={20} className="text-rose-500" />
            </div>
          </Link>

          {/* AI Food Therapist card */}
          <Link
            href="/ai-advisor"
            className="group p-6 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-500/10 dark:via-transparent border border-indigo-500/20 dark:border-indigo-500/10 hover:border-indigo-500/40 transition-all duration-350 shadow-sm flex items-center justify-between"
          >
            <div className="space-y-2 max-w-[70%]">
              <div className="p-3 bg-indigo-500 text-white rounded-2xl w-fit shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                <Brain size={24} />
              </div>
              <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">AI Food Therapist</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Can't decide? Let our AI interview you and prescribe the perfect meal based on your mood & health goal!</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full group-hover:translate-x-1 transition-transform">
              <ArrowRight size={20} className="text-indigo-500" />
            </div>
          </Link>
        </div>
      </div>

      {/* Main Browse Foods segment */}
      <div className="space-y-6 pt-4">

        {/* Section header and filters */}
        <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-2xl font-bold tracking-tight">Explore Malaysian Cuisine</h3>

            {/* Search Input bar */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                placeholder="Search food or ingredients..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-orange-500 dark:focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Filtering buttons row */}
          <div className="flex flex-col gap-3">
            {/* Category selection */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-2">Category:</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs rounded-full border transition-all cursor-pointer capitalize font-medium ${selectedCategory === cat
                      ? "bg-orange-500 text-white border-orange-500 font-bold"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-650 dark:text-slate-350"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Cuisine selection */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-2">Cuisine:</span>
              {cuisines.map(cui => (
                <button
                  key={cui}
                  onClick={() => setSelectedCuisine(cui)}
                  className={`px-3.5 py-1.5 text-xs rounded-full border transition-all cursor-pointer capitalize font-medium ${selectedCuisine === cui
                      ? "bg-orange-500 text-white border-orange-500 font-bold"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-655 dark:text-slate-345"
                    }`}
                >
                  {cui}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Browse Food items display grid */}
        {filteredFoods.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
            <UtensilsCrossed size={48} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h4 className="text-lg font-bold text-slate-850 dark:text-white">No Makan Matches</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              We couldn't find any dishes matching your active search terms or categories. Try clearing some filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredFoods.map(f => {
              const isSpicyFood = f.flavor.toLowerCase() === "spicy";
              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFood(f)}
                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500/60 dark:hover:border-orange-500/60 rounded-3xl p-4 flex flex-col justify-between hover:shadow-xl transition-all duration-350 cursor-pointer relative"
                >
                  {/* Spice Badge overlay */}
                  {isSpicyFood && (
                    <span className="absolute top-6 right-6 z-10 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:scale-105 transition-transform" title="Spicy dish!">
                      <Flame size={12} className="fill-current" />
                    </span>
                  )}

                  <div className="space-y-3.5">
                    {/* Food image */}
                    <div className="w-full h-36 rounded-2xl relative overflow-hidden bg-slate-105 dark:bg-slate-950 border border-slate-200/20 dark:border-slate-900">
                      {f.imageUrl && !foodImageErrors[f.id] ? (
                        <img
                          src={f.imageUrl}
                          alt={f.name}
                          onError={() => handleImageError(f.id)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-350 dark:text-slate-650">
                          <UtensilsCrossed size={32} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-orange-600 dark:text-orange-400 font-extrabold uppercase tracking-widest">
                        {f.cuisine} • {f.category}
                      </span>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1 group-hover:text-orange-500 transition-colors">
                        {f.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {f.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-900">
                    <span className="text-xs text-slate-450 dark:text-slate-500 font-medium">
                      Style: <span className="capitalize text-slate-600 dark:text-slate-450 font-semibold">{f.style}</span>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteFood(f.id);
                      }}
                      className="p-2 bg-slate-50 dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-slate-200/50 dark:border-slate-800/85 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer group/fav"
                    >
                      <Heart
                        size={14}
                        className={`transition-colors ${isFavoriteFood(f.id)
                            ? "fill-rose-500 text-rose-500"
                            : "text-slate-400 dark:text-slate-605 group-hover/fav:text-rose-500"
                          }`}
                      />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Details visual Modal integration */}
      {selectedFood && (
        <FoodDetailsModal
          food={selectedFood}
          onClose={() => setSelectedFood(null)}
          autoSearch={true}
        />
      )}

    </div>
  );
}
