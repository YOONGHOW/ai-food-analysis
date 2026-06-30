"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Settings, Dices, MapPin, Navigation, Check } from "lucide-react";
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
    isSidebarOpen, setIsSidebarOpen 
  } = useSettings();

  // Local temporary state for editing settings
  const [tempState, setTempState] = useState(state);
  const [tempPlace, setTempPlace] = useState(place);
  const [showAppliedAlert, setShowAppliedAlert] = useState(false);

  // Sync temp state with global state when sidebar opens
  useEffect(() => {
    if (isSidebarOpen) {
      setTempState(state);
      setTempPlace(place);
    }
  }, [isSidebarOpen, state, place]);

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
        className={`fixed inset-y-0 left-0 w-80 bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-r border-slate-200 dark:border-slate-800 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/50">
          <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
            MakanMana?
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
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          
          {/* 1. Settings Module */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white font-semibold">
              <Settings size={18} className="text-orange-500" />
              <h3>Search Settings</h3>
            </div>
            
            <div className="space-y-4">
              {/* State Select */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                  <MapPin size={12} /> State
                </label>
                <select 
                  value={tempState}
                  onChange={handleStateChange}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm outline-none focus:border-orange-500 dark:focus:border-orange-500 transition-colors appearance-none cursor-pointer"
                >
                  {STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Place Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                  <MapPin size={12} /> Place / Area
                </label>
                <input 
                  type="text"
                  value={tempPlace}
                  onChange={(e) => setTempPlace(e.target.value)}
                  placeholder="e.g. Tanjung Bungah"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm outline-none focus:border-orange-500 dark:focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Radius Option */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                  <Navigation size={12} /> Search Radius
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {RADIUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setRadius(opt.value)}
                      className={`py-2.5 text-xs rounded-xl border transition-colors cursor-pointer ${
                        radius === opt.value 
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
          </section>

          {/* Explore Module */}
          <section>
            <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white font-semibold">
              <MapPin size={18} className="text-orange-500" />
              <h3>Explore</h3>
            </div>
            <Link 
              href="/restaurants" 
              onClick={closeSidebar}
              className={`block p-3 rounded-xl transition-colors ${
                pathname === '/restaurants' 
                ? 'bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-semibold' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
              }`}
            >
              Browse Restaurants
            </Link>
          </section>

          {/* 2. Spin Wheel Module */}
          <section>
            <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white font-semibold">
              <Dices size={18} className="text-rose-500" />
              <h3>Play</h3>
            </div>
            <Link 
              href="/roulette" 
              onClick={closeSidebar}
              className={`block p-3 rounded-xl transition-colors ${
                pathname === '/roulette' 
                ? 'bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-semibold' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
              }`}
            >
              Spin the Wheel
            </Link>
          </section>



        </div>
      </div>
    </>
  );
}
