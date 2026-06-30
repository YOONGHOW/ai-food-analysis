"use client";

import { useState, useEffect } from "react";
import { Loader2, MapPin, Star, X, Heart, Users, ArrowRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

interface Place {
  id: string;
  name: string;
  rating: number;
  userRatingsTotal: number;
  priceLevel: number;
  vicinity: string;
  location: { lat: number; lng: number };
  photoReference?: string;
}

export default function GroupVotePage() {
  const { state, place, radius } = useSettings();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Game state
  const [inRoom, setInRoom] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedPlaces, setLikedPlaces] = useState<Place[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  
  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/places?state=${encodeURIComponent(state)}&place=${encodeURIComponent(place)}&radius=${radius}`);
      const data = await res.json();
      if (data.places) {
        // Shuffle the array for a random stack
        const shuffled = data.places.sort(() => 0.5 - Math.random());
        setPlaces(shuffled.slice(0, 10)); // Top 10 places to vote on
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = (liked: boolean) => {
    if (liked) {
      setLikedPlaces([...likedPlaces, places[currentIndex]]);
    }
    
    if (currentIndex < places.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  const startVoting = () => {
    setInRoom(true);
    fetchPlaces();
  };

  if (!inRoom) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Group Vote</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Swipe on restaurants and find the perfect match for everyone.</p>
          
          <button 
            onClick={startVoting}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
          >
            Start Voting Session <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1">
        <Loader2 className="animate-spin text-slate-400 mb-4" size={32} />
        <p className="text-slate-500">Loading restaurants...</p>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8">
        <div className="max-w-md w-full text-center">
          <h2 className="text-3xl font-bold mb-2">Your Matches</h2>
          <p className="text-slate-500 mb-8">Here is what you liked!</p>
          
          {likedPlaces.length === 0 ? (
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-8">
              <p>You didn't like any of the options! 😭</p>
              <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-lg">Try Again</button>
            </div>
          ) : (
            <div className="space-y-4 text-left">
              {likedPlaces.map((place) => (
                <div key={place.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                    {place.photoReference ? (
                      <img 
                        src={`/api/places/photo?ref=${place.photoReference}`} 
                        alt={place.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <MapPin size={20} />
                      </div>
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base truncate">{place.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <div className="flex items-center gap-0.5">
                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        <span>{place.rating}</span>
                      </div>
                      {place.priceLevel !== undefined && (
                        <span className="text-green-600 font-semibold">{'$'.repeat(place.priceLevel)}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Map Button */}
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}&query_place_id=${place.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-orange-50 dark:bg-orange-500/10 text-orange-600 rounded-full hover:bg-orange-100 transition-colors flex-shrink-0"
                  >
                    <MapPin size={18} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentPlace = places[currentIndex];

  if (!currentPlace) return null;

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8 overflow-hidden">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6 text-sm font-medium text-slate-500">
          Place {currentIndex + 1} of {places.length}
        </div>
        
        <div className="relative w-full aspect-[4/5] bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
          {/* Card Image Background */}
          <div className="absolute inset-0 w-full h-full">
            {currentPlace.photoReference ? (
              <img 
                src={`/api/places/photo?ref=${currentPlace.photoReference}`} 
                alt={currentPlace.name}
                className="w-full h-full object-cover animate-in fade-in duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400/20 to-rose-400/20 flex flex-col items-center justify-center text-orange-500/80 p-8">
                <MapPin size={64} className="mb-4" />
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">No Image Available</span>
              </div>
            )}
            {/* Dark Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          </div>
          
          {/* Card Content Overlayed at bottom */}
          <div className="mt-auto p-6 z-10 text-white space-y-2">
            <h2 className="text-2xl font-extrabold leading-tight drop-shadow-md">{currentPlace.name}</h2>
            
            <div className="flex items-center gap-4 font-semibold text-sm drop-shadow-md">
              <div className="flex items-center gap-1">
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
                <span>{currentPlace.rating || 'New'}</span>
                <span className="text-xs text-slate-300">({currentPlace.userRatingsTotal || 0})</span>
              </div>
              {currentPlace.priceLevel !== undefined && (
                <div className="text-green-400">
                  {'$'.repeat(currentPlace.priceLevel)}
                </div>
              )}
            </div>
            
            <p className="text-xs text-slate-200 line-clamp-2 drop-shadow-md pt-1">
              {currentPlace.vicinity}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-8">
          <button 
            onClick={() => handleVote(false)}
            className="w-16 h-16 bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900/30 text-rose-500 rounded-full flex items-center justify-center shadow-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:scale-110 transition-all cursor-pointer"
          >
            <X size={32} />
          </button>
          
          <button 
            onClick={() => handleVote(true)}
            className="w-16 h-16 bg-white dark:bg-slate-900 border-2 border-green-100 dark:border-green-900/30 text-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:scale-110 transition-all cursor-pointer"
          >
            <Heart size={32} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
