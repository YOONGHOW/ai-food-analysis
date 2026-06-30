"use client";

import { useState, useEffect, useRef } from "react";
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
}

export default function RoulettePage() {
  const { state, place, radius } = useSettings();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(0);
  const [winner, setWinner] = useState<Place | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  
  const spinInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchPlaces = async () => {
    setLoading(true);
    setError(null);
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
  }, []);

  const startSpin = () => {
    if (places.length === 0) return;
    
    setIsSpinning(true);
    setWinner(null);
    
    let duration = 3000; // Spin for 3 seconds
    let speed = 50; // Start fast
    let elapsed = 0;
    
    const spin = () => {
      setCurrentDisplayIndex(Math.floor(Math.random() * places.length));
      elapsed += speed;
      
      if (elapsed < duration) {
        // Slow down towards the end
        if (elapsed > duration * 0.7) speed = 150;
        if (elapsed > duration * 0.9) speed = 300;
        
        spinInterval.current = setTimeout(spin, speed);
      } else {
        setIsSpinning(false);
        const finalWinner = places[Math.floor(Math.random() * places.length)];
        setWinner(finalWinner);
        setCurrentDisplayIndex(places.findIndex(p => p.id === finalWinner.id));
        // Automatically open the details drawer when the spin finishes
        setSelectedPlaceId(finalWinner.id);
      }
    };
    
    spin();
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

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8">
      <div className="max-w-md w-full flex flex-col items-center">
        
        <h1 className="text-3xl font-bold mb-2">Food Roulette</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-center">Let fate decide your next meal in {place}, {state}.</p>

        {loading ? (
          <div className="flex flex-col items-center text-slate-400 py-12">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Finding the best spots...</p>
          </div>
        ) : (
          <div className="w-full relative min-h-[300px] flex flex-col items-center justify-center">
            
            {places.length > 0 && !winner && !isSpinning && (
              <div className="text-center py-12">
                <p className="text-xl mb-8">Found {places.length} nearby restaurants.</p>
                <button 
                  onClick={startSpin}
                  className="px-10 py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-full text-xl hover:scale-105 transition-transform shadow-lg shadow-orange-500/30 cursor-pointer"
                >
                  SPIN NOW
                </button>
              </div>
            )}

            {(isSpinning || winner) && places[currentDisplayIndex] && (
              <div className={`w-full bg-white dark:bg-slate-900 border ${winner ? 'border-orange-500 shadow-xl shadow-orange-500/20' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 transform ${isSpinning ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}`}>
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <MapPin size={32} className="text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{places[currentDisplayIndex].name}</h2>
                <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                    <span>{places[currentDisplayIndex].rating || 'N/A'}</span>
                    <span className="text-xs">({places[currentDisplayIndex].userRatingsTotal || 0})</span>
                  </div>
                  {places[currentDisplayIndex].priceLevel !== undefined && (
                    <div className="text-green-600 font-medium">
                      {'$'.repeat(places[currentDisplayIndex].priceLevel)}
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{places[currentDisplayIndex].vicinity}</p>
                
                {winner && (
                  <div className="w-full flex flex-col gap-3 mt-2 animate-in fade-in slide-in-from-bottom-4">
                    <button 
                      onClick={() => setSelectedPlaceId(places[currentDisplayIndex].id)}
                      className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors cursor-pointer"
                    >
                      <BookOpen size={18} />
                      See Menu & Reviews
                    </button>
                    <div className="flex gap-3 w-full">
                      <button 
                        onClick={startSpin}
                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        Spin Again
                      </button>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${places[currentDisplayIndex].location.lat},${places[currentDisplayIndex].location.lng}&query_place_id=${places[currentDisplayIndex].id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 dark:border-slate-800"
                      >
                        <Navigation size={18} />
                        Navigate
                      </a>
                    </div>
                  </div>
                )}
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
