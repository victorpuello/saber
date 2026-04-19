import { useEffect } from "react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  icon = "warning",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-on-surface/45 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-[380px] rounded-3xl bg-white p-7 text-center shadow-xl shadow-on-surface/15">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
            destructive ? "bg-amber-100" : "bg-surface-container-low"
          }`}
        >
          <span
            className="material-symbols-outlined text-[28px]"
            style={{
              fontVariationSettings: "'FILL' 1",
              color: destructive ? "#b45309" : undefined,
            }}
          >
            {icon}
          </span>
        </div>
        <h3 className="text-xl font-extrabold tracking-tight text-on-surface">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-secondary">
          {message}
        </p>
        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-surface-container-high py-3 text-sm font-bold text-on-surface transition hover:bg-surface-container-highest"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 ${
              destructive
                ? "bg-gradient-to-br from-amber-600 to-amber-500"
                : "bg-gradient-to-br from-primary to-primary-container"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
