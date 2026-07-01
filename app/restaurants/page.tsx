"use client";

import { useState, useEffect } from "react";
import { Loader2, MapPin, Star, Navigation, RefreshCw, BookOpen, Heart, Search, WifiOff, ChevronDown } from "lucide-react";
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
  
  if (
    name.includes("fine dining") || 
    name.includes("steakhouse") || 
    name.includes("bistro") ||
    name.includes("hotel") ||
    name.includes("cuisine")
  ) {
    guessedLevel = 3;
  } else if (
    name.includes("cafe") || 
    name.includes("restaurant") || 
    name.includes("kitchen") || 
    name.includes("bar") ||
    name.includes("coffee") ||
    name.includes("japanese") ||
    name.includes("korean") ||
    name.includes("brunch")
  ) {
    guessedLevel = 2;
  }
  
  if (tier === "1") return guessedLevel === 1;
  if (tier === "2") return guessedLevel === 2;
  if (tier === "3") return guessedLevel === 3;
  
  return true;
};

export default function RestaurantsPage() {
  const { 
    state, place, radius, priceTier, useCurrentLocation, 
    toggleFavorite, isFavorite, toggleFavoriteFood, isFavoriteFood 
  } = useSettings();
  
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [restaurantKeyword, setRestaurantKeyword] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;

  const [viewMode, setViewMode] = useState<"restaurant" | "food">("restaurant");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [autoSearchFood, setAutoSearchFood] = useState(false);
  const [foodSearch, setFoodSearch] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [foodImageErrors, setFoodImageErrors] = useState<Record<string, boolean>>({});

  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [restaurantSort, setRestaurantSort] = useState<"default" | "rating" | "cheapest">("default");
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Reset pagination page to 1 on filter/search modifications
  useEffect(() => {
    setCurrentPage(1);
  }, [restaurantSearch, restaurantSort, priceTier, state, place, radius, useCurrentLocation, restaurantKeyword]);

  const filteredPlaces = places
    .filter(p => matchesPriceTier(p, priceTier))
    .filter(p => {
      if (!restaurantSearch) return true;
      const term = restaurantSearch.toLowerCase();
      return p.name.toLowerCase().includes(term) || 
             p.vicinity.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      if (restaurantSort === "rating") {
        // Weighted rating calculation (Bayesian-style average)
        // Helps prevent 5-star ratings with only 1 review from outranking highly-reviewed 4.8-star spots.
        const getWeightedRating = (p: Place) => {
          const rating = p.rating || 0;
          const count = p.userRatingsTotal || 0;
          const minReviewsThreshold = 5; // Weight threshold (m)
          const defaultBaseline = 3.5;   // Default average baseline (C)
          return (count * rating + minReviewsThreshold * defaultBaseline) / (count + minReviewsThreshold);
        };
        return getWeightedRating(b) - getWeightedRating(a);
      }
      if (restaurantSort === "cheapest") {
        const priceA = a.priceLevel !== undefined ? a.priceLevel : 2;
        const priceB = b.priceLevel !== undefined ? b.priceLevel : 2;
        return priceA - priceB;
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredPlaces.length / itemsPerPage);
  const paginatedPlaces = filteredPlaces.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredFoods = foods.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(foodSearch.toLowerCase()) || 
                          f.description.toLowerCase().includes(foodSearch.toLowerCase()) ||
                          f.ingredients.some(i => i.toLowerCase().includes(foodSearch.toLowerCase()));
    const matchesCuisine = selectedCuisine === "all" || f.cuisine === selectedCuisine;
    const matchesCategory = selectedCategory === "all" || f.category === selectedCategory;
    return matchesSearch && matchesCuisine && matchesCategory;
  });

  const fetchPlaces = async (forceRefresh = false, searchKeyword = restaurantKeyword) => {
    setLoading(true);
    setError(null);
    try {
      const queryRadius = useCurrentLocation ? radius : 3000;
      let url = `/api/places?state=${encodeURIComponent(state)}&place=${encodeURIComponent(place)}&radius=${queryRadius}`;
      if (searchKeyword) {
        url += `&keyword=${encodeURIComponent(searchKeyword)}`;
      }
      if (forceRefresh) {
        url += '&refresh=true';
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlaces(data.places || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch restaurants.");
    } finally {
      setLoading(false);
    }
  };

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

    // Check URL parameters for search keyword redirection
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const keywordParam = params.get("keyword");
      if (keywordParam) {
        setRestaurantKeyword(keywordParam);
        // Clear the keyword parameter from URL search bar without reloading page
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  useEffect(() => {
    fetchPlaces(false, restaurantKeyword);
  }, [state, place, radius, useCurrentLocation, restaurantKeyword]);



  const handleClearRestaurantFilter = () => {
    setRestaurantKeyword(null);
  };

  return (
    <div className="w-full px-6 py-8 flex flex-col flex-1">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            {viewMode === "restaurant" ? "Browse Restaurants" : "Browse Malaysian Food"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {viewMode === "restaurant" ? (
              useCurrentLocation ? (
                <>
                  Showing eateries within {(radius / 1000)}KM of <span className="font-semibold text-slate-800 dark:text-slate-200">{place}, {state}</span>
                </>
              ) : (
                <>
                  Showing eateries in <span className="font-semibold text-slate-800 dark:text-slate-200">{place}, {state}</span>
                </>
              )
            ) : (
              "Explore iconic local dishes, their ingredients, and cuisine profiles"
            )}
          </p>
        </div>

        {viewMode === "restaurant" && (
          <button 
            onClick={() => fetchPlaces(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer w-fit"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh List
          </button>
        )}
      </div>

      <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl w-full sm:w-fit self-start mb-6 border border-slate-200/50 dark:border-slate-800/40">
        <button
          onClick={() => setViewMode("restaurant")}
          className={`flex-1 sm:flex-initial px-6 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            viewMode === "restaurant"
              ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Restaurant Base
        </button>
        <button
          onClick={() => setViewMode("food")}
          className={`flex-1 sm:flex-initial px-6 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            viewMode === "food"
              ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Food Base
        </button>
      </div>

      {viewMode === "restaurant" && (
        <div className="flex-1 flex flex-col">
          {/* Search and Sort controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search restaurants by name or area..."
                value={restaurantSearch}
                onChange={(e) => setRestaurantSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <div className="relative flex items-center gap-2 z-20">
              <span className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Sort by:</span>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:border-orange-500 transition-colors flex items-center gap-2 shadow-sm cursor-pointer min-w-[150px] justify-between text-left"
                >
                  <span>
                    {restaurantSort === "default" && "Default"}
                    {restaurantSort === "rating" && "Top Rated"}
                    {restaurantSort === "cheapest" && "Cheapest First"}
                  </span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isSortOpen ? "rotate-180" : ""}`} />
                </button>

                {isSortOpen && (
                  <>
                    {/* Click backdrop to dismiss */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsSortOpen(false)}
                    />
                    
                    {/* Dropdown Options List */}
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {[
                        { value: "default", label: "Default" },
                        { value: "rating", label: "Top Rated" },
                        { value: "cheapest", label: "Cheapest First" }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setRestaurantSort(opt.value as any);
                            setIsSortOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer block ${
                            restaurantSort === opt.value
                              ? "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-bold"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {restaurantKeyword && (
            <div className="mb-6 flex items-center justify-between p-3.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/50 rounded-2xl text-sm animate-in fade-in slide-in-from-top-1">
              <span className="text-orange-800 dark:text-orange-355">
                Filtering for eateries serving: <span className="font-bold">"{restaurantKeyword}"</span>
              </span>
              <button 
                onClick={handleClearRestaurantFilter}
                className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
              >
                Clear filter & show all
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-16">
              <Loader2 className="animate-spin text-slate-400 mb-4" size={32} />
              <p className="text-slate-500">Searching for food spots...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center flex-1 py-16 text-center max-w-md mx-auto">
              <p className="text-red-500 mb-4">{error}</p>
              <button onClick={() => fetchPlaces()} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium">
                Try Again
              </button>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
              <p className="text-slate-500 mb-2">No restaurants found matching your criteria.</p>
              <p className="text-sm text-slate-400">Try adjusting your search query, sorting options, or budget tier.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedPlaces.map((place) => (
                <div 
                  key={place.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col"
                >
                  <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                    {place.photoReference ? (
                      <img 
                        src={`/api/places/photo?ref=${place.photoReference}`} 
                        alt={place.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-400/20 to-rose-400/20 flex flex-col items-center justify-center text-orange-500/80 p-4">
                        <MapPin size={40} className="mb-2" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">No Image Available</span>
                      </div>
                    )}
                    
                    {place.openNow !== undefined && (
                      <span className={`absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-sm z-10 ${
                        place.openNow 
                          ? "bg-green-50/90 text-green-700 dark:bg-green-950/80 dark:text-green-400" 
                          : "bg-rose-50/90 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
                      }`}>
                        {place.openNow ? "OPEN NOW" : "CLOSED"}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(place);
                      }}
                      className="absolute top-3 right-3 p-2 bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-950 text-slate-400 hover:text-rose-500 rounded-full shadow-md backdrop-blur-sm transition-transform hover:scale-110 cursor-pointer z-10"
                      aria-label={isFavorite(place.id) ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart size={16} className={isFavorite(place.id) ? "fill-rose-500 text-rose-500" : ""} />
                    </button>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-1">{place.name}</h3>
                    
                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mb-3">
                      <div className="flex items-center gap-1">
                        <Star size={15} className="text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{place.rating || "N/A"}</span>
                        <span className="text-xs text-slate-400">({place.userRatingsTotal || 0})</span>
                      </div>
                      {place.priceLevel !== undefined && (
                        <span className="text-green-600 font-semibold">{'$'.repeat(place.priceLevel)}</span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-5 flex-1">
                      {place.vicinity}
                    </p>

                    <div className="flex gap-2 w-full mt-auto">
                      <button 
                        onClick={() => setSelectedPlaceId(place.id)}
                        className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <BookOpen size={14} />
                        Menu
                      </button>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}&query_place_id=${place.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Navigation size={14} />
                        Map
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </>)}
        </div>
      )}

      {viewMode === "food" && (
        <div className="flex-1 flex flex-col animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search 60+ dishes, style (soup/dry), flavor, or ingredients..."
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="all">All Cuisines</option>
              <option value="Malay">Malay</option>
              <option value="Chinese">Chinese</option>
              <option value="Indian">Indian</option>
              <option value="Indian Muslim">Indian Muslim</option>
              <option value="Peranakan">Peranakan</option>
              <option value="East Malaysian">East Malaysian</option>
              <option value="Western">Western</option>
            </select>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Rice">Rice</option>
              <option value="Noodles">Noodles</option>
              <option value="Soup">Soup</option>
              <option value="Hotpot">Hotpot</option>
              <option value="Snacks & Sides">Snacks & Sides</option>
              <option value="Desserts & Drinks">Desserts & Drinks</option>
            </select>
          </div>

          {filteredFoods.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
              <p className="text-slate-500 mb-2">No food items found matching your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredFoods.map((food) => {
                const isLiked = isFavoriteFood(food.id);
                return (
                  <div 
                    key={food.id}
                    onClick={() => setSelectedFood(food)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col cursor-pointer"
                  >
                    <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                      {foodImageErrors[food.id] ? (
                        <div className="w-full h-full bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                          <WifiOff className="mb-1 text-slate-400/80" size={20} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Connection Error</span>
                        </div>
                      ) : (
                        <img 
                          src={food.imageUrl} 
                          alt={food.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={() => setFoodImageErrors(prev => ({ ...prev, [food.id]: true }))}
                        />
                      )}
                      
                      {food.halal && (
                        <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 bg-emerald-500/90 text-white rounded-md shadow-sm">
                          HALAL
                        </span>
                      )}

                      <span className="absolute bottom-3 left-3 text-[10px] font-bold px-2 py-0.5 bg-slate-900/80 text-white rounded-md backdrop-blur-xs">
                        {food.cuisine}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteFood(food.id);
                        }}
                        className="absolute top-3 right-3 p-2 bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-950 text-slate-400 hover:text-rose-500 rounded-full shadow-md backdrop-blur-sm transition-transform hover:scale-110 cursor-pointer z-10"
                        aria-label={isLiked ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart size={16} className={isLiked ? "fill-rose-500 text-rose-500" : ""} />
                      </button>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-1">{food.name}</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">{food.category}</p>
                      
                      <p className="text-xs text-slate-550 dark:text-slate-450 line-clamp-2 mb-5 flex-1 leading-relaxed">
                        {food.description}
                      </p>

                      <div className="flex gap-2 w-full mt-auto">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFood(food);
                            setAutoSearchFood(false);
                          }}
                          className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <BookOpen size={14} />
                          Details
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFood(food);
                            setAutoSearchFood(true);
                          }}
                          className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Search size={14} />
                          Find spots
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <RestaurantDetailsModal 
        placeId={selectedPlaceId} 
        onClose={() => setSelectedPlaceId(null)} 
      />

      <FoodDetailsModal 
        food={selectedFood}
        onClose={() => setSelectedFood(null)}
        autoSearch={autoSearchFood}
      />
    </div>
  );
}
