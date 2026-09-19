"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

interface ConfirmDialogProps {
  itemName: string;
  busy: boolean;
  onCancel(): void;
  onConfirm(): Promise<void>;
}

export function ConfirmDialog({
  itemName,
  busy,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
      role="presentation"
    >
      <section
        className="surface-card w-full max-w-md rounded-3xl p-6"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
      >
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
          <AlertTriangle size={23} aria-hidden="true" />
        </span>
        <h2 id="delete-title" className="font-display mt-4 text-2xl font-bold">
          Delete this task?
        </h2>
        <p
          id="delete-description"
          className="mt-2 text-[var(--muted-foreground)]"
        >
          <strong className="text-[var(--foreground)]">{itemName}</strong> will
          be permanently removed. This action cannot be undone.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="secondary-button px-5"
            onClick={onCancel}
            disabled={busy}
          >
            Keep task
          </button>
          <button
            className="min-h-11 rounded-xl bg-[var(--danger)] px-5 font-extrabold text-white"
            onClick={() => void onConfirm()}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete task"}
          </button>
        </div>
      </section>
    </div>
  );
}
