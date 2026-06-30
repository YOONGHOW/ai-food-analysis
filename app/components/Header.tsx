"use client";

import Link from "next/link";
import { Menu, LogOut, User as UserIcon } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { setIsSidebarOpen } = useSettings();
  const { user, signOut } = useAuth();

  const getEmailPrefix = (email?: string) => {
    if (!email) return "User";
    return email.split("@")[0];
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
      <div className="w-full px-6 h-16 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent font-extrabold tracking-tight">
              MakanMana?
            </span>
          </Link>
        </div>

        {/* Right Side - Auth */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3 animate-in fade-in duration-300">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 text-xs font-semibold text-slate-650 dark:text-slate-350">
                <UserIcon size={12} className="text-slate-400" />
                <span>{getEmailPrefix(user.email)}</span>
              </div>
              <button
                onClick={signOut}
                className="p-2 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/10 transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="px-4 py-1.5 text-xs font-bold bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-950 rounded-full hover:bg-orange-500 hover:dark:bg-orange-500 hover:dark:text-white transition-all shadow-sm hover:scale-102 flex items-center gap-1.5"
            >
              <span>Log In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
