"use client";

import type { ReactNode } from "react";

import { useWritingAssistant } from "@/app/components/WritingAssistantProvider";
import type { AiWritingAction, AiWritingResult } from "@/lib/bible/types";

type WritingAssistantOption = {
  id: AiWritingAction;
  label: string;
  disabled?: boolean;
};

type WritingAssistantCardProps = {
  title: string;
  description: string;
  options: WritingAssistantOption[];
  preview: AiWritingResult | null;
  onRun: (action: AiWritingAction) => void;
  previewActions?: ReactNode;
};

export function WritingAssistantCard({
  title,
  description,
  options,
  preview,
  onRun,
  previewActions
}: WritingAssistantCardProps) {
  const { availabilityReason, enableAi, progressLabel, progressValue, status } = useWritingAssistant();
  const isUnsupported =
    status === "disabled" &&
    availabilityReason.length > 0 &&
    availabilityReason !== "Enable local AI to use writing assistance.";
  const isReady = status === "ready";

  return (
    <section className="writing-ai-card">
      <div className="writing-ai-card-header">
        <div>
          <p className="reader-notebook-kicker">Local AI Writing</p>
          <h4 className="writing-ai-card-title">{title}</h4>
        </div>
        <p className="writing-ai-card-copy">{description}</p>
      </div>

      {status === "disabled" ? (
        <div className="writing-ai-state">
          <p className="search-empty-copy">{availabilityReason}</p>
          {!isUnsupported ? (
            <button className="reader-inline-button" onClick={() => void enableAi()} type="button">
              Enable AI
            </button>
          ) : null}
        </div>
      ) : status === "downloading" ? (
        <div className="writing-ai-state">
          <p className="search-empty-copy">{progressLabel || "Downloading local model…"}</p>
          <div
            aria-label="AI download progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progressValue * 100)}
            className="search-ai-progress"
            role="progressbar"
          >
            <span
              className="search-ai-progress-bar"
              style={{ width: `${Math.round(progressValue * 100)}%` }}
            />
          </div>
        </div>
      ) : status === "error" ? (
        <div className="writing-ai-state">
          <p className="search-empty-copy">{availabilityReason}</p>
          <button className="reader-inline-button" onClick={() => void enableAi()} type="button">
            Retry AI setup
          </button>
        </div>
      ) : null}

      <div className="writing-ai-actions" role="toolbar" aria-label={`${title} AI actions`}>
        {options.map((option) => (
          <button
            className="reader-inline-button"
            disabled={!isReady || option.disabled || status === "generating"}
            key={option.id}
            onClick={() => onRun(option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {status === "generating" ? (
        <p className="search-empty-copy">Generating a local writing draft…</p>
      ) : null}

      {preview ? (
        <div className="writing-ai-preview">
          <div className="writing-ai-preview-header">
            <h5 className="writing-ai-preview-title">{preview.title}</h5>
            <p className="writing-ai-preview-label">{preview.action.replace(/-/g, " ")}</p>
          </div>
          <pre className="writing-ai-preview-content">{preview.content}</pre>
          {previewActions ? <div className="writing-ai-preview-actions">{previewActions}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
