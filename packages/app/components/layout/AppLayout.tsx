"use client";

import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <TopBar />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="pl-60 pt-16">
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
