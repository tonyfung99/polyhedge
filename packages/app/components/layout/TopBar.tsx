"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function TopBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-16 border-b bg-background">
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo/Brand */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight">POLYHEDGE</h1>
        </div>

        {/* Wallet Connection */}
        <div>
          <ConnectButton />
        </div>
      </div>
    </div>
  );
}
