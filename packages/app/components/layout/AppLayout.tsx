"use client";

import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        <div className="container mx-auto px-6 py-8 md:px-8 md:py-10 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
