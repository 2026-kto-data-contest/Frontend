/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_KAKAO_MAP_JS_KEY?: string;
  readonly VITE_KAKAO_LOGIN_REST_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
