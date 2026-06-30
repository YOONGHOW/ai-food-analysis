import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { SettingsProvider } from "./context/SettingsContext";
import { AuthProvider } from "./context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Makan Mana? | Penang Food Decider",
  description: "Can't decide what to eat in Penang? Let us help you out!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <AuthProvider>
          <SettingsProvider>
            <Sidebar />
            <Header />
            <main className="flex-1 flex flex-col relative w-full">
              {children}
            </main>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
