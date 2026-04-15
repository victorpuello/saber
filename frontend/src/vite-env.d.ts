/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
	readonly VITE_API_TIMEOUT_MS?: string;
	readonly VITE_FORGOT_PASSWORD_URL?: string;
	readonly VITE_KAMPUS_FORGOT_PASSWORD_URL?: string;
	readonly VITE_TERMS_URL?: string;
	readonly VITE_PRIVACY_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
