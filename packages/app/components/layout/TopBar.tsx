"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function TopBar() {
  return (
    <header className="fixed top-0 left-60 right-0 z-40 h-16 border-b bg-background">
      <div className="mx-auto flex h-full max-w-7xl items-center px-6">
        <div className="ml-auto">
          <ConnectButton label="Connect" chainStatus="icon" showBalance={false} />
        </div>
      </div>
    </header>
  );
}
