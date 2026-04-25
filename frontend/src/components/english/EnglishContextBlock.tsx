import ChatUI from "./ChatUI";
import EmailWrapper from "./EmailWrapper";
import NoticeSign from "./NoticeSign";
import type {
  ChatUIData,
  EmailWrapperData,
  EnglishComponentName,
  NoticeSignData,
} from "./types";
import { asRecord, parseEnglishContext, readString } from "./types";

function resolveComponentName(
  componentName: string | null | undefined,
  data: Record<string, unknown> | null,
): EnglishComponentName | null {
  const raw = componentName ?? (data ? readString(data, ["component", "component_name"]) : "");
  if (raw === "NoticeSign" || raw === "ChatUI" || raw === "EmailWrapper") {
    return raw;
  }
  return null;
}

function normalizeNotice(data: Record<string, unknown> | null): NoticeSignData {
  return {
    type: readString(data ?? {}, ["type"], "info") as NoticeSignData["type"],
    text: readString(data ?? {}, ["text", "message"], "Public notice"),
    icon: readString(data ?? {}, ["icon"]) || undefined,
    location: readString(data ?? {}, ["location", "location_hint"]) || undefined,
  };
}

function normalizeChat(data: Record<string, unknown> | null): ChatUIData {
  const speakerA = asRecord(data?.speakerA);
  return {
    speaker_a_name: readString(data ?? {}, ["speaker_a_name", "speakerAName"], readString(speakerA ?? {}, ["name"], "Speaker A")),
    speaker_a_message: readString(data ?? {}, ["speaker_a_message", "speakerAMessage"], readString(speakerA ?? {}, ["message"], "")),
    speaker_b_placeholder: readString(data ?? {}, ["speaker_b_placeholder", "speakerBPlaceholder"], "[__?__]"),
  };
}

function normalizeEmail(data: Record<string, unknown> | null): EmailWrapperData {
  return {
    to: readString(data ?? {}, ["to"]) || undefined,
    from: readString(data ?? {}, ["from"]) || undefined,
    subject: readString(data ?? {}, ["subject"]) || undefined,
    date: readString(data ?? {}, ["date"]) || undefined,
    body: readString(data ?? {}, ["body"]) || undefined,
  };
}

export function isReactEnglishContext(contextType: string | null | undefined): boolean {
  return contextType === "react_component";
}

export default function EnglishContextBlock({
  context,
  contextType,
  componentName,
  compact = false,
}: {
  context: string;
  contextType: string | null | undefined;
  componentName?: string | null;
  compact?: boolean;
}) {
  if (!isReactEnglishContext(contextType)) {
    return null;
  }

  const parsed = parseEnglishContext(context);
  const data = asRecord(parsed);
  const resolved = resolveComponentName(componentName, data);

  if (resolved === "NoticeSign") {
    return <NoticeSign data={normalizeNotice(data)} compact={compact} />;
  }

  if (resolved === "ChatUI") {
    return <ChatUI data={normalizeChat(data)} compact={compact} />;
  }

  if (resolved === "EmailWrapper") {
    return <EmailWrapper data={normalizeEmail(data)} compact={compact} />;
  }

  return (
    <div className="rounded-[18px] border border-outline-variant/20 bg-white p-4 text-sm text-on-surface-variant">
      No hay un componente de ingles configurado para este contexto.
    </div>
  );
}

