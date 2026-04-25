export type EnglishComponentName = "NoticeSign" | "ChatUI" | "EmailWrapper";

export type NoticeSignType = "danger" | "warning" | "info" | "prohibition" | "instruction";

export interface NoticeSignData {
  type: NoticeSignType;
  text: string;
  icon?: string;
  location?: string;
  location_hint?: string;
}

export interface ChatUIData {
  speaker_a_name?: string;
  speaker_a_message?: string;
  speakerA?: {
    name?: string;
    message?: string;
  };
  speaker_b_placeholder?: string;
}

export interface EmailWrapperData {
  to?: string;
  from?: string;
  subject?: string;
  date?: string;
  body?: string;
}

export interface ClozeOption {
  letter: string;
  displayLetter: string;
  text: string;
}

export function parseEnglishContext(context: string): unknown {
  const trimmed = context.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return context;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return context;
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readString(record: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return fallback;
}

