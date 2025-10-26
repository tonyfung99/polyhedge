"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { http, createConfig } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

// Configure wagmi for Arbitrum Sepolia testnet
const config = getDefaultConfig({
  appName: "Polyhedge",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http(
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ||
      "https://sepolia-rollup.arbitrum.io/rpc"
    ),
  },
  ssr: true,
});

// Create query client
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
