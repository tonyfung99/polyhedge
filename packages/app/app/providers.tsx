"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

const chains = [arbitrum];
const transports = {
  [arbitrum.id]: http(
    process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc"
  ),
};

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const hasWalletConnectProjectId = Boolean(
  walletConnectProjectId &&
    walletConnectProjectId !== "YOUR_PROJECT_ID" &&
    walletConnectProjectId !== "your_project_id_here"
);

// Configure wagmi for Arbitrum mainnet
if (!hasWalletConnectProjectId) {
  console.warn(
    "WalletConnect project ID is missing. Falling back to injected wallets only."
  );
}

const config = hasWalletConnectProjectId
  ? getDefaultConfig({
      appName: "Polyhedge",
      projectId: walletConnectProjectId,
      chains,
      transports,
      ssr: true,
    })
  : createConfig({
      appName: "Polyhedge",
      chains,
      transports,
      connectors: [
        injected({
          shimDisconnect: true,
        }),
      ],
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
