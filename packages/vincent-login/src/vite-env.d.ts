/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VINCENT_APP_ID: string;
  readonly VITE_BRIDGE_API_URL: string;
  readonly VITE_LIT_NETWORK: 'datil' | 'datil-dev' | 'datil-test';
  readonly VITE_POLYGON_RPC_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

