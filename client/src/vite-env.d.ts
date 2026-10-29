/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WHATSAPP_INVITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
