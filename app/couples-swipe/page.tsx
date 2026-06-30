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
  rating: number;
  userRatingsTotal: number;
  priceLevel: number;
  vicinity: string;
  location: { lat: number; lng: number };
  photoReference?: string;
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
}: {
  place: Place;
  onSwipe: (liked: boolean) => void;
  index: number;
  total: number;
}) {
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [startX, setStartX] = useState(0);
  const [dragX, setDragX] = useState(0);
  const isDragging = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    setStartX(e.clientX);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setDragX(e.clientX - startX);
  };
  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
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
      className="relative w-full aspect-[3/4] select-none cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Image */}
        <div className="absolute inset-0">
          {place.photoReference ? (
            <img
              src={`/api/places/photo?ref=${place.photoReference}`}
              alt={place.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-300/30 to-rose-400/30 flex items-center justify-center">
              <MapPin size={80} className="text-orange-400/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
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

        {/* Counter badge */}
        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full z-10">
          {index + 1}/{total}
        </div>

        {/* Card content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10 text-white">
          <h2 className="text-2xl font-extrabold leading-tight drop-shadow-md mb-1">{place.name}</h2>
          <div className="flex items-center gap-3 text-sm font-semibold mb-2">
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
          </div>
          <p className="text-xs text-slate-300 line-clamp-2">{place.vicinity}</p>
        </div>
      </div>
    </div>
  );
}

export default function CouplesSwipePage() {
  const { state, place, radius } = useSettings();

  const [mode, setMode] = useState<Mode>("setup");
  const [p1Name, setP1Name] = useState("You");
  const [p2Name, setP2Name] = useState("Partner");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

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

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/places?state=${encodeURIComponent(state)}&place=${encodeURIComponent(place)}&radius=${radius}`);
      const data = await res.json();
      if (data.places) {
        const shuffled = [...data.places].sort(() => 0.5 - Math.random());
        setPlaces(shuffled.slice(0, 12));
      }
    } catch (e) {
      console.error(e);
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
    await fetchPlaces();
  };

  const handleP1Swipe = (liked: boolean) => {
    const current = places[currentIndex];
    if (liked) setP1Likes(prev => new Set([...prev, current.id]));

    if (currentIndex < places.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setMode("local-handoff");
      setCurrentIndex(0);
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

        setOnlineVotes(prev => {
          const updated: Record<string, { me?: boolean; partner?: boolean }> = { ...prev, [placeId as string]: { ...prev[placeId as string], partner: liked } };
          // Check for match
          if (liked && updated[placeId]?.me === true) {
            const matched = places.find(p => p.id === placeId);
            if (matched) {
              setMatchedPlace(matched);
              setMode("match");
            }
          }
          return updated;
        });
      })
      .on("broadcast", { event: "places" }, ({ payload }: any) => {
        if (!host) setPlaces(payload.places);
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
        payload: { places },
      });
    }
  }, [partnerConnected, places, isHost]);

  const handleOnlineSwipe = (liked: boolean) => {
    const current = places[onlineIndex];
    if (!current) return;

    // Record my vote
    setOnlineVotes(prev => {
      const updated = { ...prev, [current.id]: { ...prev[current.id], me: liked } };
      // Check for match
      if (liked && updated[current.id]?.partner === true) {
        setMatchedPlace(current);
        setMode("match");
      }
      return updated;
    });

    // Broadcast vote
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "vote",
        payload: { placeId: current.id, liked, from: myIdRef.current },
      });
    }

    if (onlineIndex < places.length - 1) {
      setOnlineIndex(i => i + 1);
    } else {
      setMode("no-match");
    }
  };

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
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────

  if (mode === "match" && matchedPlace) {
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
              {p1Name} and {p2Name} both want this tonight!
            </p>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-orange-400 shadow-xl shadow-orange-500/20 overflow-hidden mb-6">
              {matchedPlace.photoReference ? (
                <img src={`/api/places/photo?ref=${matchedPlace.photoReference}`} alt={matchedPlace.name} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-orange-300/30 to-rose-300/30 flex items-center justify-center">
                  <MapPin size={48} className="text-orange-400" />
                </div>
              )}
              <div className="p-5 text-left">
                <h3 className="text-xl font-extrabold mb-1">{matchedPlace.name}</h3>
                <div className="flex items-center gap-3 text-sm mb-2">
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
                </div>
                <p className="text-xs text-slate-500">{matchedPlace.vicinity}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${matchedPlace.location.lat},${matchedPlace.location.lng}&query_place_id=${matchedPlace.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Navigation size={18} /> Navigate There!
              </a>
              <button
                onClick={resetAll}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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
              Try Again with New Restaurants
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

  // Swiping screens (local-p1, local-p2, online-game)
  const isLocalP1 = mode === "local-p1";
  const isLocalP2 = mode === "local-p2";
  const isOnline = mode === "online-game";

  const currentSwipeIndex = isOnline ? onlineIndex : currentIndex;
  const currentPlace = places[currentSwipeIndex];
  const playerName = isLocalP2 ? p2Name : p1Name;
  const handleSwipe = isOnline ? handleOnlineSwipe : isLocalP2 ? handleP2Swipe : handleP1Swipe;

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

          {/* Card */}
          <SwipeCard
            key={currentPlace.id}
            place={currentPlace}
            onSwipe={handleSwipe}
            index={currentSwipeIndex}
            total={places.length}
          />

          {/* Buttons */}
          <div className="flex items-center justify-center gap-8 mt-6">
            <button
              onClick={() => handleSwipe(false)}
              className="w-16 h-16 bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-800 text-rose-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all cursor-pointer"
            >
              <X size={32} />
            </button>
            <button
              onClick={() => handleSwipe(true)}
              className="w-16 h-16 bg-white dark:bg-slate-900 border-2 border-green-200 dark:border-green-800 text-green-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all cursor-pointer"
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
        <p className="text-slate-500 font-medium">Finding restaurants...</p>
      </div>
    );
  }

  // ── SETUP SCREEN ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-rose-400 text-white rounded-2xl mb-4 shadow-lg shadow-orange-500/30">
            <Heart size={32} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-extrabold mb-2">Couples Swipe</h1>
          <p className="text-slate-500 text-sm">
            Find a restaurant you <em>both</em> love — no more arguments!
          </p>
        </div>

        {/* Names */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Your Names</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={p1Name}
              onChange={e => setP1Name(e.target.value)}
              placeholder="Player 1"
              className="flex-1 w-full min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-orange-400 transition-colors"
            />
            <input
              type="text"
              value={p2Name}
              onChange={e => setP2Name(e.target.value)}
              placeholder="Player 2"
              className="flex-1 w-full min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-orange-400 transition-colors"
            />
          </div>
        </div>

        {/* Mode Selection */}
        <div className="flex flex-col gap-3">
          {/* Local Mode */}
          <button
            onClick={startLocalMode}
            className="w-full p-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-orange-400 transition-all group shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/30 text-orange-500 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                <Smartphone size={24} />
              </div>
              <div>
                <p className="font-bold text-base">Pass-the-Phone</p>
                <p className="text-xs text-slate-400">One phone, two people swipe in turns</p>
              </div>
              <ArrowRight size={18} className="ml-auto text-slate-300 group-hover:text-orange-500 transition-colors" />
            </div>
          </button>

          {/* Online Mode */}
          {supabaseClient ? (
            <>
              <button
                onClick={createOnlineRoom}
                className="w-full p-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-green-400 transition-all group shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 dark:bg-green-950/30 text-green-500 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                    <QrCode size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-base">Online Live Mode</p>
                    <p className="text-xs text-slate-400">Two phones, swipe together in real-time</p>
                  </div>
                  <ArrowRight size={18} className="ml-auto text-slate-300 group-hover:text-green-500 transition-colors" />
                </div>
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={joinRoomInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinRoomInput(e.target.value.toUpperCase())}
                  placeholder="Enter room code to join..."
                  className="flex-1 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm outline-none focus:border-green-400 transition-colors uppercase tracking-widest"
                  maxLength={6}
                />
                <button
                  onClick={() => joinRoomInput && joinOnlineRoom(joinRoomInput)}
                  disabled={!joinRoomInput}
                  className="px-4 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Join
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-sm text-slate-400">
              <WifiOff size={18} />
              Online mode unavailable (Supabase not configured)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
