"use client";

import { useState, useEffect } from "react";
import { Heart, MapPin, Star, BookOpen, Navigation, ArrowRight, Search, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import RestaurantDetailsModal from "../components/RestaurantDetailsModal";
import FoodDetailsModal from "../components/FoodDetailsModal";

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

export default function FavoritesPage() {
  const { favorites, toggleFavorite, favoriteFoods, toggleFavoriteFood, isFavoriteFood } = useSettings();
  const { user } = useAuth();
  const router = useRouter();
  
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [autoSearchFood, setAutoSearchFood] = useState(false);
  const [favoriteMode, setFavoriteMode] = useState<"restaurant" | "food">("restaurant");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodImageErrors, setFoodImageErrors] = useState<Record<string, boolean>>({});

  // Fetch foods once on load
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

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-16 px-6 text-center max-w-md mx-auto animate-in fade-in duration-355">
        <div className="w-20 h-20 bg-orange-50 dark:bg-orange-955/20 text-orange-500 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
          <Heart size={38} className="fill-orange-500/20" />
        </div>
        <h1 className="text-3xl font-extrabold mb-3 bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
          Login Required
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">
          Please login to view and manage your favorite food spots and dishes.
        </p>
        <Link 
          href="/auth" 
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition-all text-sm group"
        >
          <span>Login / Register</span>
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    );
  }

  // Filter foods that are in favoriteFoods list
  const likedFoods = foods.filter(f => favoriteFoods.includes(f.id));

  // Group favorites by State -> PlaceName
  const groupedFavorites = favorites.reduce((acc, curr) => {
    const stateKey = curr.state || "Other State";
    const placeKey = curr.placeName || "Other Area";

    if (!acc[stateKey]) {
      acc[stateKey] = {};
    }
    if (!acc[stateKey][placeKey]) {
      acc[stateKey][placeKey] = [];
    }
    acc[stateKey][placeKey].push(curr);
    return acc;
  }, {} as Record<string, Record<string, typeof favorites>>);



  return (
    <div className="w-full px-6 py-8 flex flex-col flex-1 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="mb-8 border-b border-slate-100 dark:border-slate-800/50 pb-5">
        <h1 className="text-3xl font-bold mb-1">My Favorites</h1>
        <p className="text-slate-500 dark:text-slate-400">
          {favoriteMode === "restaurant" 
            ? `Saved food spots grouped by area (${favorites.length} saved)` 
            : `Saved Malaysian dishes (${likedFoods.length} saved)`}
        </p>
      </div>

      {/* Mode Switcher Toggle */}
      <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl w-full sm:w-fit self-start mb-8 border border-slate-200/50 dark:border-slate-800/40">
        <button
          onClick={() => setFavoriteMode("restaurant")}
          className={`flex-1 sm:flex-initial px-6 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            favoriteMode === "restaurant"
              ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Favorite Restaurants
        </button>
        <button
          onClick={() => setFavoriteMode("food")}
          className={`flex-1 sm:flex-initial px-6 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            favoriteMode === "food"
              ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Favorite Foods
        </button>
      </div>

      {/* RENDER RESTAURANT FAVORITES */}
      {favoriteMode === "restaurant" && (
        favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-955/20 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
              <Heart size={38} className="fill-rose-500/20" />
            </div>
            <h1 className="text-xl font-bold mb-2">No Favorite Restaurants</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">
              Tap the heart icon beside any restaurant card in Browse Makan, Spin Wheel, or Swipe to save them here.
            </p>
            <Link 
              href="/restaurants" 
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition-all text-sm group"
            >
              <span>Find Restaurants</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedFavorites).map(([state, places]) => (
              <div key={state} className="space-y-8">
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-200 border-l-4 border-orange-500 pl-3">
                  {state}
                </h2>

                {Object.entries(places).map(([placeName, restaurantList]) => (
                  <div key={placeName} className="space-y-4 pl-4">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={14} /> {placeName} ({restaurantList.length})
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {restaurantList.map((place) => (
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
                                <MapPin size={32} className="mb-2" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">No Image</span>
                              </div>
                            )}
                            
                            <button
                              type="button"
                              onClick={() => toggleFavorite(place)}
                              className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-950 text-rose-500 rounded-full shadow-md backdrop-blur-sm transition-transform hover:scale-110 cursor-pointer z-10"
                            >
                              <Heart size={16} className="fill-rose-500 text-rose-500" />
                            </button>
                          </div>

                          <div className="p-5 flex-1 flex flex-col">
                            <h4 className="font-bold text-base leading-tight mb-2 line-clamp-1">{place.name}</h4>
                            
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                              <div className="flex items-center gap-1">
                                <Star size={13} className="text-yellow-500 fill-yellow-500" />
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{place.rating || "N/A"}</span>
                                <span className="text-slate-400">({place.userRatingsTotal || 0})</span>
                              </div>
                              {place.priceLevel !== undefined && (
                                <span className="text-green-600 font-semibold">{'$'.repeat(place.priceLevel)}</span>
                              )}
                            </div>

                            <p className="text-xs text-slate-550 dark:text-slate-455 line-clamp-2 mb-5 flex-1 leading-relaxed">
                              {place.vicinity}
                            </p>

                            <div className="flex gap-2 w-full mt-auto">
                              <button 
                                onClick={() => setSelectedPlaceId(place.id)}
                                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <BookOpen size={13} />
                                Menu
                              </button>
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}&query_place_id=${place.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Navigation size={13} />
                                Map
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      )}

      {/* RENDER FOOD FAVORITES */}
      {favoriteMode === "food" && (
        likedFoods.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 text-center max-w-md mx-auto animate-in fade-in">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-955/20 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
              <Heart size={38} className="fill-rose-500/20" />
            </div>
            <h1 className="text-xl font-bold mb-2">No Favorite Foods</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">
              Explore foods on Browse Makan and click the heart on any dish card to keep track of it here.
            </p>
            <Link 
              href="/restaurants" 
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition-all text-sm group"
            >
              <span>Explore Foods</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in">
            {likedFoods.map((food) => {
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
                      className="absolute top-3 right-3 p-2 bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-950 text-rose-500 rounded-full shadow-md backdrop-blur-sm transition-transform hover:scale-110 cursor-pointer z-10"
                    >
                      <Heart size={16} className={isLiked ? "fill-rose-500 text-rose-500" : ""} />
                    </button>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-base leading-tight mb-2 line-clamp-1 text-slate-800 dark:text-slate-200">{food.name}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-505 mb-3">{food.category}</p>
                    
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
                        <BookOpen size={13} />
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
                        <Search size={13} />
                        Find spots
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Details Modals */}
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
