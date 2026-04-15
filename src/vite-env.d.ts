/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRODUCT_MODE?: 'vibe-code' | 'white-label';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
