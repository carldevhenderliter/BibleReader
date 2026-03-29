"use client";

import type { LocalBibleAiAnswer, LocalBibleAiSource, LocalBibleAiStatus } from "@/lib/bible/types";

type SearchAiPanelProps = {
  query: string;
  status: LocalBibleAiStatus;
  availabilityReason: string;
  progressLabel: string;
  progressValue: number;
  answer: LocalBibleAiAnswer | null;
  onEnable: () => void;
  onAsk: () => void;
  onSelectSource: (source: LocalBibleAiSource) => void;
};

export function SearchAiPanel({
  query,
  status,
  availabilityReason,
  progressLabel,
  progressValue,
  answer,
  onEnable,
  onAsk,
  onSelectSource
}: SearchAiPanelProps) {
  const trimmedQuery = query.trim();
  const isUnsupported =
    status === "disabled" &&
    availabilityReason.length > 0 &&
    availabilityReason !== "Enable local AI to ask Bible study questions.";

  return (
    <div className="search-ai-panel">
      {!trimmedQuery ? (
        <p className="search-empty-copy">
          Ask a Bible study question about the current passage, a topic, or a passage reference.
        </p>
      ) : status === "disabled" ? (
        <div className="search-ai-state">
          <p className="search-empty-copy">{availabilityReason}</p>
          {!isUnsupported ? (
            <button className="reader-inline-button search-ai-action" onClick={onEnable} type="button">
              Enable AI
            </button>
          ) : null}
        </div>
      ) : status === "downloading" ? (
        <div className="search-ai-state">
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
      ) : status === "generating" ? (
        <div className="search-ai-state">
          <p className="search-empty-copy">Generating a Bible-only answer from local study context…</p>
        </div>
      ) : status === "error" ? (
        <div className="search-ai-state">
          <p className="search-empty-copy">{availabilityReason}</p>
          <button className="reader-inline-button search-ai-action" onClick={onEnable} type="button">
            Retry AI setup
          </button>
        </div>
      ) : answer ? (
        <div className="search-ai-response">
          <div className="search-ai-response-actions">
            <button className="reader-inline-button search-ai-action" onClick={onAsk} type="button">
              Ask Again
            </button>
          </div>
          <div className="search-ai-answer">
            {answer.answer.split(/\n{2,}/).map((paragraph, index) => (
              <p className="search-ai-answer-paragraph" key={`${index}:${paragraph.slice(0, 24)}`}>
                {paragraph}
              </p>
            ))}
          </div>
          <div className="search-ai-sources">
            <h3 className="search-ai-sources-title">Bible Sources</h3>
            <div className="search-ai-source-list">
              {answer.sources.map((source) => (
                <button
                  className="search-ai-source"
                  key={source.id}
                  onClick={() => onSelectSource(source)}
                  type="button"
                >
                  <strong>{source.label}</strong>
                  <span>{source.preview || "Open passage"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="search-ai-state">
          <p className="search-empty-copy">
            AI is ready. Ask a Bible study question using the current search input.
          </p>
          <button className="reader-inline-button search-ai-action" onClick={onAsk} type="button">
            Ask AI
          </button>
        </div>
      )}
    </div>
  );
}
