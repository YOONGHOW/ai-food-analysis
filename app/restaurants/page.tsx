"use client";

import { useState, useEffect } from "react";
import { Loader2, MapPin, Star, Navigation, RefreshCw, BookOpen } from "lucide-react";
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
  const { state, place, radius, priceTier } = useSettings();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const filteredPlaces = places.filter(p => matchesPriceTier(p, priceTier));

  const fetchPlaces = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/places?state=${encodeURIComponent(state)}&place=${encodeURIComponent(place)}&radius=${radius}${forceRefresh ? '&refresh=true' : ''}`;
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
    fetchPlaces();
  }, [state, place, radius]);

  return (
    <div className="w-full px-6 py-8 flex flex-col flex-1">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Browse Restaurants</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Showing eateries within {(radius / 1000)}KM of <span className="font-semibold text-slate-800 dark:text-slate-200">{place}, {state}</span>
          </p>
        </div>
        <button 
          onClick={() => fetchPlaces(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer w-fit"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh List
        </button>
      </div>

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
          <p className="text-slate-500 mb-2">No restaurants matching your budget tier found in this area.</p>
          <p className="text-sm text-slate-400">Try changing your budget settings or increasing your search radius.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPlaces.map((place) => (
            <div 
              key={place.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col"
            >
              {/* Photo Area */}
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
                
                {/* Open Status Badge */}
                {place.openNow !== undefined && (
                  <span className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm ${
                    place.openNow 
                      ? "bg-green-100 text-green-700 dark:bg-green-950/80 dark:text-green-400" 
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
                  }`}>
                    {place.openNow ? "OPEN NOW" : "CLOSED"}
                  </span>
                )}
              </div>

              {/* Info Area */}
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
      )}
      <RestaurantDetailsModal 
        placeId={selectedPlaceId} 
        onClose={() => setSelectedPlaceId(null)} 
      />
    </div>
  );
}
