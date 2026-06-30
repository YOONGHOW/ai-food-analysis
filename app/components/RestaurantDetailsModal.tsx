"use client";

import { useState, useEffect } from "react";
import { X, Star, MapPin, Phone, Clock, Globe, Loader2, MessageSquare, Dices } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

interface Review {
  author: string;
  profilePhoto: string;
  rating: number;
  relativeTime: string;
  text: string;
}

interface PlaceDetails {
  id: string;
  name: string;
  rating: number;
  userRatingsTotal: number;
  vicinity: string;
  mapsUrl: string;
  website?: string;
  phoneNumber?: string;
  openNow?: boolean;
  weekdayText: string[];
  photos: string[];
  reviews: Review[];
  menuHighlights?: { name: string; desc: string; price: string }[];
}

interface RestaurantDetailsModalProps {
  placeId: string | null;
  onClose: () => void;
}

// Generate smart mock menu items based on restaurant name
function getMenuHighlights(name: string): { name: string; desc: string; price: string }[] {
  const lowercaseName = name.toLowerCase();

  if (lowercaseName.includes("hotpot") || lowercaseName.includes("hot pot") || lowercaseName.includes("steamboat")) {
    return [
      { name: "麻辣香锅 (Spicy Dry Hot Pot)", desc: "Mala spices stir-fried with your choice of ingredients.", price: "RM 15.00+" },
      { name: "Signature Mala Soup Base", desc: "Szechuan peppercorns and chili oil broth.", price: "RM 22.00" },
      { name: "Premium Sliced Beef Platter", desc: "Thinly sliced marble beef.", price: "RM 18.00" },
      { name: "Fresh Handmade Meatballs", desc: "Pork, beef, and chicken paste mixed with herbs.", price: "RM 12.00" },
      { name: "Crispy Fried Beancurd Skin", desc: "Quick soak in hot pot for maximum flavor.", price: "RM 6.00" },
    ];
  }
  
  if (lowercaseName.includes("nasi lemak")) {
    return [
      { name: "Nasi Lemak Ayam Goreng Berempah", desc: "Fragrant coconut rice with spiced fried chicken.", price: "RM 12.50" },
      { name: "Nasi Lemak Sambal Sotong", desc: "Coconut rice served with spicy squid sambal.", price: "RM 14.00" },
      { name: "Signature Sambal Extra", desc: "Our homemade sweet and spicy anchovy sambal.", price: "RM 2.00" },
      { name: "Nasi Lemak Biasa", desc: "Classic with egg, peanuts, anchovies, and cucumber.", price: "RM 5.00" },
    ];
  }

  if (lowercaseName.includes("chicken rice")) {
    return [
      { name: "Signature Hainanese Steamed Chicken", desc: "Silky steamed chicken served with light soy sauce.", price: "RM 8.50" },
      { name: "Crispy Roasted Chicken", desc: "Roasted chicken with crispy golden skin.", price: "RM 8.50" },
      { name: "Ipoh Bean Sprouts", desc: "Blanched crunchy bean sprouts in soy sauce and sesame oil.", price: "RM 6.00" },
      { name: "Fragrant Chicken Oil Rice", desc: "Rice cooked with chicken fat, ginger, and pandan.", price: "RM 2.00" },
    ];
  }

  if (lowercaseName.includes("laksa")) {
    return [
      { name: "Penang Asam Laksa", desc: "Sour and spicy fish broth with thick noodles, pineapple, and mint.", price: "RM 8.00" },
      { name: "Nyonya Curry Laksa", desc: "Rich coconut curry broth with chicken, tofu puffs, and cockles.", price: "RM 9.50" },
      { name: "Extra Otak-Otak Fish Cake", desc: "Traditional grilled spicy fish cake.", price: "RM 4.00" },
    ];
  }

  if (lowercaseName.includes("roti") || lowercaseName.includes("mamak")) {
    return [
      { name: "Roti Canai Biasa", desc: "Flaky flatbread served with dhal and curry.", price: "RM 2.50" },
      { name: "Roti Telur Bawang", desc: "Flaky bread stuffed with egg and onions.", price: "RM 4.50" },
      { name: "Maggi Goreng Double", desc: "Stir-fried instant noodles with egg, tofu, and veggies.", price: "RM 8.00" },
      { name: "Teh Tarik (Iced)", desc: "Foamy pulled milk tea, a Malaysian staple.", price: "RM 3.50" },
    ];
  }

  if (lowercaseName.includes("cafe") || lowercaseName.includes("coffee") || lowercaseName.includes("brunch")) {
    return [
      { name: "Avocado Toast with Poached Eggs", desc: "Sourdough bread topped with mashed avocado and runny eggs.", price: "RM 18.00" },
      { name: "Salted Caramel Waffles", desc: "Fluffy waffles with vanilla ice cream and caramel drizzle.", price: "RM 16.00" },
      { name: "Flat White Coffee", desc: "Double shot espresso with silky microfoam milk.", price: "RM 11.00" },
      { name: "Matcha Latte", desc: "Uji matcha whisked with fresh milk.", price: "RM 12.50" },
    ];
  }

  return [
    { name: "Signature Fried Rice (Nasi Goreng)", desc: "Wok-hei rich fried rice with eggs and prawns.", price: "RM 10.00" },
    { name: "Char Kway Teow", desc: "Stir-fried flat noodles with cockles, prawns, and chives.", price: "RM 9.00" },
    { name: "Fried Spring Rolls (Loh Bak)", desc: "Crispy rolls filled with seasoned minced pork/chicken.", price: "RM 7.00" },
    { name: "Ice Kacang (ABC)", desc: "Shaved ice dessert with red beans, sweet corn, and syrups.", price: "RM 5.50" },
    { name: "Local Kopi (Iced)", desc: "Traditional dark roasted coffee with condensed milk.", price: "RM 3.00" },
  ];
}

export default function RestaurantDetailsModal({ placeId, onClose }: RestaurantDetailsModalProps) {
  const { priceTier } = useSettings();
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const isOpen = !!placeId;

  const parsePrice = (priceStr: string): number => {
    const cleaned = priceStr.replace(/[^\d.]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getFilteredHighlights = (items: { name: string; desc: string; price: string }[]) => {
    if (priceTier === "all") return items;
    return items.filter(item => {
      const price = parsePrice(item.price);
      if (priceTier === "1") return price <= 10;
      if (priceTier === "2") return price > 10 && price <= 20;
      if (priceTier === "3") return price > 20;
      return true;
    });
  };

  useEffect(() => {
    if (!placeId) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/places/details?placeId=${placeId}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setDetails(data.details);
        setActivePhotoIndex(0);
      } catch (err: any) {
        setError(err.message || "Failed to load restaurant details.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [placeId]);

  return (
    <>
      {/* Overlay backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Slide-in from Right Side Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:max-w-xl bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-l border-slate-200 dark:border-slate-800 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-bold truncate text-slate-900 dark:text-white">
              {loading ? "Loading..." : details?.name || "Restaurant Details"}
            </h2>
            {details && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                <span className="font-semibold">{details.rating}</span>
                <span>({details.userRatingsTotal} Google Reviews)</span>
              </div>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-24">
              <Loader2 className="animate-spin text-slate-400 mb-4" size={36} />
              <p className="text-slate-500 text-sm">Fetching restaurant details & menu...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center max-w-sm mx-auto">
              <p className="text-red-500 mb-4">{error}</p>
              <button onClick={onClose} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium">
                Close Details
              </button>
            </div>
          ) : details ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* 1. Photo Gallery */}
              {details.photos.length > 0 && (
                <div className="space-y-2">
                  <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
                    <img 
                      src={`/api/places/photo?ref=${details.photos[activePhotoIndex]}`}
                      alt={details.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {details.photos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {details.photos.map((ref, idx) => (
                        <button
                          key={ref}
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            activePhotoIndex === idx ? "border-orange-500 scale-102" : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img 
                            src={`/api/places/photo?ref=${ref}`} 
                            alt="Thumbnail" 
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Restaurant Info */}
              <div className="space-y-3.5 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <MapPin className="text-orange-500 flex-shrink-0 mt-0.5" size={16} />
                  <span>{details.vicinity}</span>
                </div>
                {details.phoneNumber && (
                  <div className="flex items-center gap-3">
                    <Phone className="text-orange-500 flex-shrink-0" size={16} />
                    <a href={`tel:${details.phoneNumber}`} className="hover:underline hover:text-orange-500">{details.phoneNumber}</a>
                  </div>
                )}
                {details.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="text-orange-500 flex-shrink-0" size={16} />
                    <a 
                      href={details.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="hover:underline hover:text-orange-500 truncate"
                    >
                      {details.website}
                    </a>
                  </div>
                )}
                {details.weekdayText.length > 0 && (
                  <div className="flex items-start gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                    <Clock className="text-orange-500 flex-shrink-0 mt-0.5" size={16} />
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Opening Hours:</span>
                      <div className="text-xs space-y-0.5 text-slate-500">
                        {details.weekdayText.map((t, idx) => (
                          <p key={idx}>{t}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Menu Highlights */}
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Dices size={16} className="text-orange-500" /> Menu Highlights
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {details.menuHighlights && details.menuHighlights.length > 0 
                      ? "Real popular items compiled from customer reviews by Gemini AI" 
                      : "Recommended items based on restaurant type (web scrap + OCR coming soon!)"}
                  </p>
                </div>
                
                <div className="space-y-3">
                  {(() => {
                    const originalItems = details.menuHighlights && details.menuHighlights.length > 0
                      ? details.menuHighlights
                      : getMenuHighlights(details.name);
                    const filteredItems = getFilteredHighlights(originalItems);

                    if (filteredItems.length === 0) {
                      const tierLabel = priceTier === "1" ? "under RM 10" : priceTier === "2" ? "RM 10 - RM 20" : "above RM 20";
                      return (
                        <p className="text-xs text-slate-500 italic py-4 text-center dark:text-slate-400">
                          No menu items found in the select budget tier ({tierLabel}).
                        </p>
                      );
                    }

                    return filteredItems.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 p-4 rounded-xl flex justify-between gap-4"
                      >
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{item.desc}</p>
                        </div>
                        <div className="font-bold text-sm text-orange-500 whitespace-nowrap">
                          {item.price}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* 4. Google Reviews */}
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                  <MessageSquare size={16} className="text-blue-500" /> Recent Reviews
                </h3>
                {details.reviews.length === 0 ? (
                  <p className="text-sm text-slate-400">No reviews found.</p>
                ) : (
                  <div className="space-y-3">
                    {details.reviews.map((rev, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/30">
                        <div className="flex items-center gap-3 mb-2">
                          {rev.profilePhoto ? (
                            <img src={rev.profilePhoto} alt={rev.author} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                              {rev.author.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">{rev.author}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="flex items-center text-yellow-500">
                                {Array.from({ length: 5 }).map((_, starIdx) => (
                                  <Star 
                                    key={starIdx} 
                                    size={10} 
                                    className={starIdx < rev.rating ? "fill-current" : "text-slate-200 dark:text-slate-800"} 
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-slate-400">{rev.relativeTime}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3">
                          {rev.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
