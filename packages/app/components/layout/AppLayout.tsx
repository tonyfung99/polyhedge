"use client";

import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Top Bar */}
      <TopBar />

      {/* Main Content - positioned to account for fixed sidebar and topbar */}
      <main className="pl-60 pt-16 min-h-screen">
        <div className="container mx-auto p-6 md:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
