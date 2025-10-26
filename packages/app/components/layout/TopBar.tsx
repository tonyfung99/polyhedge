"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function TopBar() {
  return (
    <div className="fixed top-0 left-60 right-0 z-40 h-16 border-b bg-background">
      <div className="flex h-full items-center px-6">
        <h1 className="text-xl font-semibold tracking-tight">POLYHEDGE</h1>
        <div className="ml-auto">
          <ConnectButton label="Connect" chainStatus="icon" showBalance={false} />
        </div>
      </div>
    </div>
  );
}
