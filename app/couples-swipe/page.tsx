"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2, MapPin, Star, X, Heart, Users, ArrowRight,
  Navigation, QrCode, Link2, Copy, Check, Smartphone,
  Wifi, WifiOff, RefreshCw, Trophy, Sparkles
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { supabaseClient } from "@/lib/supabaseClient";

interface Place {
  id: string;
  name: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  vicinity?: string;
  location?: { lat: number; lng: number };
  photoReference?: string;
  imageUrl?: string;
  cuisine?: string;
  category?: string;
  description?: string;
}

type Mode = "setup" | "online-lobby" | "online-game" | "local-p1" | "local-handoff" | "local-p2" | "match" | "no-match";

function Confetti() {
  const colors = ["#f97316", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#eab308", "#ec4899"];
  const pieces = Array.from({ length: 60 });
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((_, i) => {
        const color = colors[i % colors.length];
        const left = `${Math.random() * 100}%`;
        const delay = `${Math.random() * 0.8}s`;
        const size = `${Math.random() * 10 + 6}px`;
        const duration = `${Math.random() * 1.5 + 1.5}s`;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top: "-20px",
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              animation: `confettiFall ${duration} ${delay} ease-in forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function SwipeCard({
  place,
  onSwipe,
  index,
  total,
  disabled = false,
}: {
  place: Place;
  onSwipe: (liked: boolean) => void;
  index: number;
  total: number;
  disabled?: boolean;
}) {
  const { toggleFavorite, isFavorite, toggleFavoriteFood, isFavoriteFood } = useSettings();
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [startX, setStartX] = useState(0);
  const [dragX, setDragX] = useState(0);
  const isDragging = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    isDragging.current = true;
    setStartX(e.clientX);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (disabled) return;
    if (!isDragging.current) return;
    setDragX(e.clientX - startX);
  };
  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (disabled) {
      setDragX(0);
      return;
    }
    if (Math.abs(dragX) > 80) {
      const liked = dragX > 0;
      setSwipeDir(liked ? "right" : "left");
      setTimeout(() => {
        onSwipe(liked);
        setDragX(0);
        setSwipeDir(null);
      }, 300);
    } else {
      setDragX(0);
    }
  };

  const rotation = dragX * 0.08;
  const opacity = Math.max(0, 1 - Math.abs(dragX) / 300);

  // Check if this is a food item
  const isFood = !!place.cuisine;

  const handleFavoriteToggle = () => {
    if (isFood) {
      toggleFavoriteFood(place.id);
    } else {
      toggleFavorite(place as any);
    }
  };

  const isItemFavorite = isFood ? isFavoriteFood(place.id) : isFavorite(place.id);

  return (
    <div
      style={{
        transform: swipeDir === "right"
          ? "translateX(120%) rotate(20deg)"
          : swipeDir === "left"
            ? "translateX(-120%) rotate(-20deg)"
            : `translateX(${dragX}px) rotate(${rotation}deg)`,
        transition: swipeDir || Math.abs(dragX) < 5 ? "all 0.3s ease" : "none",
        opacity: swipeDir ? 0 : opacity,
        touchAction: "none",
      }}
      className={`relative w-full aspect-[3/4] select-none ${disabled ? "cursor-not-allowed opacity-80" : "cursor-grab active:cursor-grabbing"
        }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Image */}
        <div className="absolute inset-0 bg-slate-950">
          {place.imageUrl ? (
            <img
              src={place.imageUrl}
              alt={place.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : place.photoReference ? (
            <img
              src={`/api/places/photo?ref=${place.photoReference}`}
              alt={place.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-300/30 to-rose-400/30 flex items-center justify-center">
              {isFood ? (
                <Sparkles size={80} className="text-orange-400/60 animate-pulse" />
              ) : (
                <MapPin size={80} className="text-orange-400/60 animate-pulse" />
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        </div>

        {/* Swipe indicators */}
        {dragX > 30 && (
          <div className="absolute top-6 left-6 border-4 border-green-400 rounded-2xl px-4 py-2 rotate-[-12deg] z-10">
            <span className="text-green-400 font-extrabold text-2xl tracking-widest">YES!</span>
          </div>
        )}
        {dragX < -30 && (
          <div className="absolute top-6 right-6 border-4 border-rose-400 rounded-2xl px-4 py-2 rotate-[12deg] z-10">
            <span className="text-rose-400 font-extrabold text-2xl tracking-widest">NOPE</span>
          </div>
        )}

        {/* Favorite Button */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleFavoriteToggle();
          }}
          className="absolute top-4 left-4 p-2.5 bg-black/45 hover:bg-black/60 text-rose-500 rounded-full backdrop-blur-sm shadow-md transition-transform active:scale-95 hover:scale-105 z-20 cursor-pointer"
          aria-label={isItemFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={16} className={isItemFavorite ? "fill-rose-500 text-rose-500" : "text-white"} />
        </button>

        {/* Counter badge */}
        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full z-10">
          {index + 1}/{total}
        </div>

        {/* Card content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10 text-white">
          <h2 className="text-2xl font-extrabold leading-tight drop-shadow-md mb-1">{place.name}</h2>
          <div className="flex items-center gap-3 text-sm font-semibold mb-2">
            {isFood ? (
              <>
                <span className="px-2 py-0.5 bg-orange-500/80 text-white rounded text-[10px] uppercase font-bold tracking-wider">
                  {place.cuisine}
                </span>
                <span className="text-slate-300 text-xs">{place.category}</span>
              </>
            ) : (
              <>
                {place.rating ? (
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span>{place.rating}</span>
                    <span className="text-slate-300 text-xs">({place.userRatingsTotal || 0})</span>
                  </div>
                ) : null}
                {place.priceLevel ? (
                  <span className="text-green-400">{"$".repeat(place.priceLevel)}</span>
                ) : null}
              </>
            )}
          </div>
          <p className="text-xs text-slate-300 line-clamp-2">
            {isFood ? place.description : place.vicinity}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CouplesSwipePage() {
  const { state, place, radius, useCurrentLocation, favorites, toggleFavorite, isFavorite, favoriteFoods, toggleFavoriteFood, isFavoriteFood } = useSettings();

  const [mode, setMode] = useState<Mode>("setup");
  const [swipeTarget, setSwipeTarget] = useState<"restaurants" | "foods">("restaurants");
  const [p1Name, setP1Name] = useState("You");
  const [p2Name, setP2Name] = useState("Partner");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Favorites Only Mode toggle
  const [useFavoritesOnly, setUseFavoritesOnly] = useState(false);

  // Local mode state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [p1Likes, setP1Likes] = useState<Set<string>>(new Set());
  const [p2Likes, setP2Likes] = useState<Set<string>>(new Set());
  const [matchedPlace, setMatchedPlace] = useState<Place | null>(null);

  // Online mode state
  const [roomId, setRoomId] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [onlineVotes, setOnlineVotes] = useState<Record<string, { me?: boolean; partner?: boolean }>>({});
  const [onlineIndex, setOnlineIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState("");
  const channelRef = useRef<any>(null);
  const myIdRef = useRef(`player-${Math.random().toString(36).slice(2, 8)}`);

  // 12-second countdown timer state
  const [timeLeft, setTimeLeft] = useState(12);

  const fetchPlaces = async () => {
    setLoading(true);
    setError(null);
    try {
      if (swipeTarget === "foods") {
        const res = await fetch("/data/malaysian_foods.json");
        if (!res.ok) throw new Error("Failed to load food database");
        const foodsData = await res.json();

        let filteredFoods = foodsData;
        if (useFavoritesOnly) {
          filteredFoods = foodsData.filter((f: any) => favoriteFoods.includes(f.id));
          if (filteredFoods.length === 0) {
            throw new Error("No favorite foods saved yet! Add some favorites in the dashboard first.");
          }
        }

        const shuffled = [...filteredFoods].sort(() => 0.5 - Math.random());
        const mappedFoods: Place[] = shuffled.slice(0, 12).map((food: any) => ({
          id: food.id,
          name: food.name,
          imageUrl: food.imageUrl,
          cuisine: food.cuisine,
          category: food.category,
          description: food.description,
        }));
        setPlaces(mappedFoods);
      } else {
        if (useFavoritesOnly) {
          const localFavorites = favorites.filter(p =>
            p.state?.toLowerCase() === state.toLowerCase() &&
            p.placeName?.toLowerCase() === place.toLowerCase()
          );
          if (localFavorites.length === 0) {
            throw new Error(`No favorite restaurants saved in ${place}, ${state} yet! Add some from the Browse page first.`);
          }
          const shuffled = [...localFavorites].sort(() => 0.5 - Math.random());
          setPlaces(shuffled.slice(0, 12));
        } else {
          const queryRadius = useCurrentLocation ? radius : 3000;
          const res = await fetch(`/api/places?state=${encodeURIComponent(state)}&place=${encodeURIComponent(place)}&radius=${queryRadius}`);
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          if (data.places) {
            const shuffled = [...data.places].sort(() => 0.5 - Math.random());
            setPlaces(shuffled.slice(0, 12));
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || `Failed to fetch ${swipeTarget}.`);
      setPlaces([]);
      setMode("setup");
    } finally {
      setLoading(false);
    }
  };

  // ── LOCAL MODE ──────────────────────────────────────────────────────────────
  const startLocalMode = async () => {
    setMode("local-p1");
    setCurrentIndex(0);
    setP1Likes(new Set());
    setP2Likes(new Set());
    setMatchedPlace(null);
    setTimeLeft(12);
    await fetchPlaces();
  };

  const handleP1Swipe = (liked: boolean) => {
    const current = places[currentIndex];
    if (liked) setP1Likes(prev => new Set([...prev, current.id]));

    if (currentIndex < places.length - 1) {
      setCurrentIndex(i => i + 1);
      setTimeLeft(12);
    } else {
      setMode("local-handoff");
      setCurrentIndex(0);
      setTimeLeft(12);
    }
  };

  const handleP2Swipe = (liked: boolean) => {
    const current = places[currentIndex];
    if (liked) {
      // Check for match immediately
      if (p1Likes.has(current.id)) {
        setMatchedPlace(current);
        setMode("match");
        return;
      }
      setP2Likes(prev => new Set([...prev, current.id]));
    }

    if (currentIndex < places.length - 1) {
      setCurrentIndex(i => i + 1);
      setTimeLeft(12);
    } else {
      setMode("no-match");
    }
  };

  // ── ONLINE MODE ─────────────────────────────────────────────────────────────
  const createOnlineRoom = async () => {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    setRoomId(id);
    setIsHost(true);
    await connectToRoom(id, true);
    setMode("online-lobby");
    await fetchPlaces();
  };

  const joinOnlineRoom = async (id: string) => {
    setRoomId(id);
    setIsHost(false);
    await connectToRoom(id, false);
    setMode("online-game");
    setOnlineIndex(0);
  };

  const connectToRoom = async (id: string, host: boolean) => {
    if (!supabaseClient) return;

    const channel = supabaseClient.channel(`couples-swipe-${id}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on("broadcast", { event: "join" }, () => {
        setPartnerConnected(true);
        if (host) setMode("online-game");
      })
      .on("broadcast", { event: "vote" }, ({ payload }: any) => {
        const { placeId, liked, from } = payload;
        if (from === myIdRef.current) return;

        setOnlineVotes(prev => ({
          ...prev,
          [placeId as string]: { ...prev[placeId as string], partner: liked }
        }));
      })
      .on("broadcast", { event: "places" }, ({ payload }: any) => {
        if (!host) {
          setPlaces(payload.places);
          if (payload.swipeTarget) {
            setSwipeTarget(payload.swipeTarget);
          }
        }
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          if (!host) {
            channel.send({ type: "broadcast", event: "join", payload: { from: myIdRef.current } });
          }
        }
      });

    channelRef.current = channel;
  };

  // When host gets partner connected, broadcast the places list
  useEffect(() => {
    if (partnerConnected && isHost && channelRef.current && places.length > 0) {
      channelRef.current.send({
        type: "broadcast",
        event: "places",
        payload: { places, swipeTarget },
      });
    }
  }, [partnerConnected, places, isHost, swipeTarget]);

  const handleOnlineSwipe = (liked: boolean) => {
    const current = places[onlineIndex];
    if (!current) return;

    // Record my vote
    setOnlineVotes(prev => ({
      ...prev,
      [current.id]: { ...prev[current.id], me: liked }
    }));

    // Broadcast vote
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "vote",
        payload: { placeId: current.id, liked, from: myIdRef.current },
      });
    }
  };

  // Swiping modes derived helpers
  const isLocalP1 = mode === "local-p1";
  const isLocalP2 = mode === "local-p2";
  const isOnline = mode === "online-game";

  const currentSwipeIndex = isOnline ? onlineIndex : currentIndex;
  const currentPlace = places[currentSwipeIndex];
  const playerName = isLocalP2 ? p2Name : p1Name;
  const handleSwipe = isOnline ? handleOnlineSwipe : isLocalP2 ? handleP2Swipe : handleP1Swipe;

  // 1. Reset timer to 12 when index changes
  useEffect(() => {
    if (!isLocalP1 && !isLocalP2 && !isOnline) return;
    if (loading || !currentPlace) return;
    setTimeLeft(12);
  }, [currentIndex, onlineIndex, isLocalP1, isLocalP2, isOnline, loading, currentPlace]);

  // 2. Countdown timer effect
  useEffect(() => {
    if (!isLocalP1 && !isLocalP2 && !isOnline) return;
    if (loading || !currentPlace) return;

    // In online mode, if this player already voted, stop the countdown
    const hasVotedMe = isOnline && onlineVotes[currentPlace.id]?.me !== undefined;
    if (hasVotedMe) return;

    if (timeLeft <= 0) {
      // Timeout! Auto swipe false (Nope)
      if (isOnline) {
        handleOnlineSwipe(false);
      } else if (isLocalP2) {
        handleP2Swipe(false);
      } else if (isLocalP1) {
        handleP1Swipe(false);
      }
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isLocalP1, isLocalP2, isOnline, loading, currentPlace, onlineVotes, currentIndex, onlineIndex]);

  // 3. Online mode synchronized transition effect
  useEffect(() => {
    if (mode !== "online-game" || !places.length) return;
    const current = places[onlineIndex];
    if (!current) return;

    const votes = onlineVotes[current.id];
    if (votes && votes.me !== undefined && votes.partner !== undefined) {
      // Both have voted!
      if (votes.me && votes.partner) {
        // MATCH!
        setMatchedPlace(current);
        setMode("match");
      } else {
        // No match on this card, wait 1000ms and move to next card
        const timer = setTimeout(() => {
          if (onlineIndex < places.length - 1) {
            setOnlineIndex(i => i + 1);
            setTimeLeft(12);
          } else {
            setMode("no-match");
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [onlineVotes, onlineIndex, places, mode]);

  const roomUrl = typeof window !== "undefined" && roomId
    ? `${window.location.origin}/couples-swipe?join=${roomId}`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Handle join param on load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get("join");
    if (joinId) {
      joinOnlineRoom(joinId.toUpperCase());
    }
  }, []);

  const resetAll = () => {
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    setMode("setup");
    setPlaces([]);
    setCurrentIndex(0);
    setP1Likes(new Set());
    setP2Likes(new Set());
    setMatchedPlace(null);
    setRoomId("");
    setPartnerConnected(false);
    setOnlineVotes({});
    setOnlineIndex(0);
    setTimeLeft(12);
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────

  if (mode === "match" && matchedPlace) {
    const isFoodMatch = !!matchedPlace.cuisine;
    const isItemFavorite = isFoodMatch ? isFavoriteFood(matchedPlace.id) : isFavorite(matchedPlace.id);

    return (
      <>
        <Confetti />
        <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8 text-center relative z-10">
          <div className="max-w-sm w-full">
            <div className="mb-6 animate-bounce">
              <span className="text-7xl">🎉</span>
            </div>
            <h2 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
              It's a Match!
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
              {p1Name} and {p2Name} both want this!
            </p>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-orange-400 shadow-xl shadow-orange-500/20 overflow-hidden mb-6">
              {matchedPlace.imageUrl ? (
                <img src={matchedPlace.imageUrl} alt={matchedPlace.name} className="w-full h-48 object-cover" />
              ) : matchedPlace.photoReference ? (
                <img src={`/api/places/photo?ref=${matchedPlace.photoReference}`} alt={matchedPlace.name} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-orange-300/30 to-rose-300/30 flex items-center justify-center">
                  {isFoodMatch ? <Sparkles size={48} className="text-orange-400" /> : <MapPin size={48} className="text-orange-400" />}
                </div>
              )}
              <div className="p-5 text-left">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-xl font-extrabold line-clamp-1 flex-1">{matchedPlace.name}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (isFoodMatch) {
                        toggleFavoriteFood(matchedPlace.id);
                      } else {
                        toggleFavorite(matchedPlace as any);
                      }
                    }}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer flex-shrink-0"
                    aria-label={isItemFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart size={18} className={isItemFavorite ? "fill-rose-500 text-rose-500 animate-in zoom-in-50 duration-200" : "transition-transform active:scale-90"} />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-sm mb-2">
                  {isFoodMatch ? (
                    <>
                      <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950/45 text-orange-600 dark:text-orange-400 rounded text-[10px] uppercase font-bold tracking-wider">
                        {matchedPlace.cuisine}
                      </span>
                      <span className="text-slate-500 text-xs">{matchedPlace.category}</span>
                    </>
                  ) : (
                    <>
                      {matchedPlace.rating ? (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          <span>{matchedPlace.rating}</span>
                          <span className="text-xs">({matchedPlace.userRatingsTotal})</span>
                        </div>
                      ) : null}
                      {matchedPlace.priceLevel ? (
                        <span className="text-green-600 font-semibold">{"$".repeat(matchedPlace.priceLevel)}</span>
                      ) : null}
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500">{isFoodMatch ? matchedPlace.description : matchedPlace.vicinity}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={isFoodMatch
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(matchedPlace.name + " restaurant near me")}`
                  : `https://www.google.com/maps/search/?api=1&query=${matchedPlace.location?.lat},${matchedPlace.location?.lng}&query_place_id=${matchedPlace.id}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Navigation size={18} /> {isFoodMatch ? "Find spots serving this!" : "Navigate There!"}
              </a>
              <button
                onClick={resetAll}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 font-medium rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (mode === "no-match") {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8 text-center">
        <div className="max-w-sm w-full">
          <div className="text-6xl mb-4">😅</div>
          <h2 className="text-2xl font-bold mb-2">No Matches Found</h2>
          <p className="text-slate-500 mb-8 text-sm">
            You two couldn't agree on anything from this batch. Maybe fate has other plans...
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={resetAll}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-2xl hover:opacity-90 transition-opacity cursor-pointer"
            >
              Try Again with New {swipeTarget === "foods" ? "Foods" : "Restaurants"}
            </button>
            <a
              href="https://www.google.com/maps/search/McDonald%27s+near+me"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-yellow-400 text-slate-900 font-bold rounded-2xl flex items-center justify-center gap-2"
            >
              🍟 Just go to McDonald's
            </a>
            <button
              onClick={resetAll}
              className="text-xs text-slate-400 hover:text-slate-500 transition-colors py-2 cursor-pointer"
            >
              Back to Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "local-handoff") {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8 text-center">
        <div className="max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-rose-400 text-white rounded-full flex items-center justify-center mx-auto mb-6">
            <Smartphone size={36} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Hand it to {p2Name}!</h2>
          <p className="text-slate-500 mb-6 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{p1Name}</span> has finished swiping.
            Now pass the phone to <span className="font-semibold text-slate-700 dark:text-slate-300">{p2Name}</span> to see if you two match!
          </p>
          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-2xl p-4 mb-6 text-sm text-orange-700 dark:text-orange-400">
            <p className="font-semibold mb-1">🤫 Tip for {p2Name}</p>
            <p className="text-xs">Don't peek at what {p1Name} liked! Just swipe based on your own feelings.</p>
          </div>
          <button
            onClick={() => setMode("local-p2")}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-2xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            I'm {p2Name}, ready to swipe! →
          </button>
        </div>
      </div>
    );
  }

  if (mode === "online-lobby") {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8">
        <div className="max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${partnerConnected ? "bg-green-100 dark:bg-green-900/30 text-green-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
            {partnerConnected ? <Wifi size={28} /> : <Loader2 size={28} className="animate-spin" />}
          </div>
          <h2 className="text-2xl font-bold mb-1">{partnerConnected ? "Partner Connected!" : "Waiting for Partner..."}</h2>
          <p className="text-slate-500 text-sm mb-6">
            {partnerConnected
              ? "Starting the game now..."
              : `Share the link below with ${p2Name}`
            }
          </p>

          {/* QR Code */}
          <div className="bg-white rounded-2xl p-3 inline-block mb-4 shadow-md border border-slate-100">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(roomUrl)}&color=1e293b&bgcolor=ffffff`}
              alt="QR Code"
              width={160}
              height={160}
              className="rounded-lg"
            />
          </div>

          {/* Room ID */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-4">
            <p className="text-xs text-slate-400 mb-1">Room Code</p>
            <p className="text-3xl font-extrabold tracking-widest text-slate-900 dark:text-white">{roomId}</p>
          </div>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full py-3 flex items-center justify-center gap-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-orange-400 transition-colors text-sm font-semibold cursor-pointer"
          >
            {copiedLink ? <><Check size={16} className="text-green-500" /> Copied!</> : <><Copy size={16} /> Copy Invite Link</>}
          </button>

          <button onClick={resetAll} className="mt-4 text-xs text-slate-400 hover:text-slate-500 cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Skeleton loading state for online live mode before cards/lobby are fully loaded
  if (isOnline && (places.length === 0 || !currentPlace)) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8 animate-pulse">
        <div className="max-w-sm w-full">
          {/* Header Skeleton */}
          <div className="text-center mb-4 flex flex-col items-center gap-2">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-3 w-48 bg-slate-100 dark:bg-slate-900 rounded-lg" />
          </div>

          {/* Progress Bar Skeleton */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mb-6" />

          {/* Card Skeleton */}
          <div className="relative w-full aspect-[3/4] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
            <p className="font-bold text-slate-700 dark:text-slate-350 text-base mb-1">Connecting to Live Lobby...</p>
            <p className="text-xs text-slate-400 max-w-[240px]">Waiting for host to start the game and synchronize restaurant cards.</p>
          </div>

          {/* Buttons Skeleton */}
          <div className="flex items-center justify-center gap-8 mt-6">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  const currentVotes = isOnline && currentPlace ? onlineVotes[currentPlace.id] : null;
  const isLocked = isOnline && currentVotes?.me !== undefined;
  const waitingForPartner = isOnline && currentVotes?.me !== undefined && currentVotes?.partner === undefined;
  const isNotMatchCard = isOnline && currentVotes?.me !== undefined && currentVotes?.partner !== undefined && !(currentVotes.me && currentVotes.partner);

  if ((isLocalP1 || isLocalP2 || isOnline) && !loading && currentPlace) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8">
        <div className="max-w-sm w-full">
          {/* Header */}
          <div className="text-center mb-4">
            <p className="text-sm font-semibold text-slate-500">
              {isOnline ? (
                <span className="flex items-center justify-center gap-2">
                  <Wifi size={14} className="text-green-500" /> Online — {playerName}
                </span>
              ) : (
                <>👤 {playerName}&apos;s turn</>
              )}
            </p>
            <p className="text-xs text-slate-400 mt-1">Swipe right to like, left to skip</p>
          </div>

          {/* Timer Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mb-6 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${timeLeft > 6
                ? "bg-gradient-to-r from-green-500 to-emerald-400"
                : timeLeft > 3
                  ? "bg-gradient-to-r from-amber-500 to-orange-400"
                  : "bg-gradient-to-r from-red-500 to-rose-500 animate-pulse"
                }`}
              style={{ width: `${(timeLeft / 12) * 100}%` }}
            />
          </div>

          {/* Card */}
          <div className="relative">
            <SwipeCard
              key={currentPlace.id}
              place={currentPlace}
              onSwipe={handleSwipe}
              index={currentSwipeIndex}
              total={places.length}
              disabled={isLocked}
            />

            {/* Timer Overlay / Lock Overlay */}
            {isOnline && isLocked && (
              <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center z-20 text-white animate-fade-in p-6">
                {waitingForPartner ? (
                  <>
                    <Loader2 className="animate-spin text-orange-500 mb-3" size={40} />
                    <p className="font-bold text-lg mb-1">Choice Locked!</p>
                    <p className="text-xs text-slate-300 text-center">Waiting for your partner to decide...</p>
                  </>
                ) : isNotMatchCard ? (
                  <>
                    <X className="text-rose-500 mb-3 animate-bounce" size={48} />
                    <p className="font-bold text-lg text-rose-400 mb-1">No Match</p>
                    <p className="text-xs text-slate-300 text-center">Moving to next restaurant...</p>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-8 mt-6">
            <button
              onClick={() => handleSwipe(false)}
              disabled={isLocked}
              className="w-16 h-16 bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-800 text-rose-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all cursor-pointer disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
            >
              <X size={32} />
            </button>
            <button
              onClick={() => handleSwipe(true)}
              disabled={isLocked}
              className="w-16 h-16 bg-white dark:bg-slate-900 border-2 border-green-200 dark:border-green-800 text-green-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all cursor-pointer disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
            >
              <Heart size={32} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1">
        <Loader2 className="animate-spin text-orange-500 mb-4" size={36} />
        <p className="text-slate-500 font-medium">
          {swipeTarget === "foods" ? "Finding foods..." : "Finding restaurants..."}
        </p>
      </div>
    );
  }

  // ── SETUP SCREEN ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Couples Swipe</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">
            Find a food dish or restaurant you <em>both</em> love — no more arguments!
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl text-xs text-rose-500 font-semibold text-center leading-relaxed">
            {error}
          </div>
        )}

        {/* Card 1: Setup Options Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          {/* Swipe Mode selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Swipe Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSwipeTarget("restaurants")}
                className={`py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all cursor-pointer font-bold text-sm ${swipeTarget === "restaurants"
                  ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-105 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400"
                  }`}
              >
                <span className="text-base">🏪</span> Restaurants
              </button>

              <button
                type="button"
                onClick={() => setSwipeTarget("foods")}
                className={`py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all cursor-pointer font-bold text-sm ${swipeTarget === "foods"
                  ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-105 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400"
                  }`}
              >
                <span className="text-base">🍛</span> Dishes & Foods
              </button>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800/60 my-1" />

          {/* Names inputs */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Players</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={p1Name}
                onChange={e => setP1Name(e.target.value)}
                placeholder="Player 1"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm outline-none focus:border-orange-500 transition-colors"
              />
              <input
                type="text"
                value={p2Name}
                onChange={e => setP2Name(e.target.value)}
                placeholder="Player 2"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800/60 my-1" />

          {/* Favorites Mode toggle row */}
          <div
            onClick={() => setUseFavoritesOnly(v => !v)}
            className="flex items-center justify-between cursor-pointer group py-1"
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${useFavoritesOnly ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-slate-950 text-slate-400 border border-slate-200 dark:border-slate-800"}`}>
                <Heart size={16} className={useFavoritesOnly ? "fill-white text-white animate-in zoom-in-50" : ""} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Favorites Only Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Only swipe from your favorited list</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 cursor-pointer ${useFavoritesOnly ? "bg-rose-500 justify-end" : "bg-slate-200 dark:bg-slate-800 justify-start"}`}>
              <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </div>

        {/* Card 2: Play Modes Selection */}
        <div className="space-y-3">
          <p className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">Choose Game Mode</p>

          <div className="space-y-3">
            {/* Pass the phone option */}
            <button
              onClick={startLocalMode}
              className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-orange-500/50 transition-all flex items-center gap-4 group shadow-sm cursor-pointer"
            >
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-955/20 text-orange-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                <Smartphone size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white">Pass-the-Phone (Local)</p>
                <p className="text-[10px] text-slate-400 truncate">One device, swipe in turns</p>
              </div>
              <ArrowRight size={16} className="text-slate-350 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Online live option */}
            {supabaseClient ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                <button
                  onClick={createOnlineRoom}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-105 dark:bg-slate-950 dark:hover:bg-slate-900/60 border border-slate-200/50 dark:border-slate-850 rounded-xl text-left transition-all flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-8 h-8 bg-green-50 dark:bg-green-955/20 text-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <QrCode size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-slate-900 dark:text-white">Host Online Live Room</p>
                    <p className="text-[9px] text-slate-400 truncate font-semibold">Get link to invite partner</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-350 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={joinRoomInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinRoomInput(e.target.value.toUpperCase())}
                    placeholder="Enter Room Code..."
                    className="flex-1 w-full min-w-0 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs outline-none focus:border-green-500 transition-colors uppercase tracking-widest text-center"
                    maxLength={6}
                  />
                  <button
                    onClick={() => joinRoomInput && joinOnlineRoom(joinRoomInput)}
                    disabled={!joinRoomInput}
                    className="px-5 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Join
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/55 border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-400">
                <WifiOff size={16} />
                Online mode unavailable (Supabase not configured)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
