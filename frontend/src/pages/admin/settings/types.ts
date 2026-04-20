export type ProviderKey = "anthropic" | "gemini";

export interface ProviderCardModel {
  provider: ProviderKey;
  displayName: string;
  defaultModel: string;
  isEnabled: boolean;
  maxTokens: number;
  temperature: number;
  hasApiKey: boolean;
  icon: string;
  color: string;
}

export interface ProviderFormState {
  apiKey: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  isEnabled: boolean;
}

export const PROVIDER_META: Record<ProviderKey, { icon: string; color: string; models: string[] }> = {
  anthropic: {
    icon: "psychology",
    color: "orange",
    models: [
      "claude-sonnet-4-20250514",
      "claude-opus-4-20250514",
      "claude-3-5-haiku-20241022",
    ],
  },
  gemini: {
    icon: "auto_awesome",
    color: "blue",
    models: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
    ],
  },
};
