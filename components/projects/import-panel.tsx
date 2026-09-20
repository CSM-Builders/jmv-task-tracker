"use client";

import { FileJson, Upload } from "lucide-react";
import { useState } from "react";

interface ImportResult {
  dryRun: boolean;
  createdProjectCount: number;
  createdTaskCount: number;
  existingTaskCount: number;
  conflictCount: number;
  wouldCreateProjectCount?: number;
  wouldCreateTaskCount?: number;
  parentCount?: number;
  subtaskCount?: number;
  totalTaskCount?: number;
  estimatedMinutes?: number;
  idMap: Record<string, string>;
}

export function ImportPanel({ onImported }: { onImported(): Promise<void> }) {
  const [source, setSource] = useState("");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(dryRun: boolean) {
    setBusy(true);
    setError(null);
    try {
      const manifest = JSON.parse(source) as Record<string, unknown>;
      const response = await fetch("/api/import/project-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...manifest, dryRun, updateExisting: false }),
      });
      const body = (await response.json()) as {
        data?: ImportResult;
        error?: string;
      };
      if (!response.ok)
        throw new Error(body.error ?? "Import validation failed.");
      setPreview(body.data ?? null);
      if (!dryRun) {
        setSource("");
        await onImported();
      }
    } catch (caught) {
      setPreview(null);
      setError(
        caught instanceof Error ? caught.message : "Import validation failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="surface-card rounded-2xl p-5"
      aria-labelledby="import-title"
    >
      <div className="flex items-start gap-3">
        <FileJson className="mt-1 text-[var(--primary)]" />
        <div>
          <h2 id="import-title" className="font-display text-xl font-bold">
            Import project plan
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Validate first. Nothing is written until you explicitly apply a
            successful preview.
          </p>
        </div>
      </div>
      <label className="mt-4 grid gap-2 text-sm font-bold">
        Manifest JSON
        <textarea
          className="control min-h-56 resize-y px-3 py-2 font-mono text-xs"
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            setPreview(null);
          }}
          placeholder="Paste tracker-upgrade-import.json"
        />
      </label>
      <label className="secondary-button mt-3 inline-flex cursor-pointer items-center gap-2 px-4">
        <Upload size={16} />
        Choose JSON file
        <input
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file && file.size <= 1_000_000)
              void file.text().then((text) => {
                setSource(text);
                setPreview(null);
              });
            else if (file) setError("Import file exceeds 1 MB.");
          }}
        />
      </label>
      {error && (
        <p
          className="mt-3 rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      )}
      {preview && (
        <div className="mt-3 rounded-xl border border-[var(--border)] p-3 text-sm">
          <p className="font-bold">Dry run passed</p>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Would create {preview.wouldCreateProjectCount ?? 0} project and{" "}
            {preview.wouldCreateTaskCount ?? 0} tasks (
            {preview.parentCount ?? 0} parents, {preview.subtaskCount ?? 0}{" "}
            subtasks, {preview.totalTaskCount ?? 0} total). Estimated:{" "}
            {preview.estimatedMinutes ?? 0} minutes. Existing:{" "}
            {preview.existingTaskCount}. Conflicts: {preview.conflictCount}.
          </p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="secondary-button px-4"
          disabled={busy || !source.trim()}
          onClick={() => void send(true)}
        >
          {busy ? "Checking…" : "Run dry preview"}
        </button>
        <button
          className="primary-button px-4"
          disabled={
            busy || !preview?.dryRun || (preview.conflictCount ?? 0) > 0
          }
          onClick={() => void send(false)}
        >
          Apply validated import
        </button>
      </div>
    </section>
  );
}
