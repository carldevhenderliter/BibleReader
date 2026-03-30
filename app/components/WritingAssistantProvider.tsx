"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  generateLocalBibleAiAnswer,
  getLocalBibleAiAvailability,
  loadLocalBibleAi,
  normalizeLocalBibleAiProgress
} from "@/lib/ai/browser-llm";
import type { AiWritingResult, LocalBibleAiStatus } from "@/lib/bible/types";

type GenerateWritingDraftInput = Omit<AiWritingResult, "content"> & {
  systemPrompt: string;
  userPrompt: string;
};

type WritingAssistantContextValue = {
  status: LocalBibleAiStatus;
  availabilityReason: string;
  progressLabel: string;
  progressValue: number;
  enableAi: () => Promise<void>;
  generateWritingDraft: (input: GenerateWritingDraftInput) => Promise<AiWritingResult | null>;
};

const WritingAssistantContext = createContext<WritingAssistantContextValue | null>(null);

export function WritingAssistantProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<LocalBibleAiStatus>("disabled");
  const [availabilityReason, setAvailabilityReason] = useState(
    "Enable local AI to use writing assistance."
  );
  const [progressLabel, setProgressLabel] = useState("");
  const [progressValue, setProgressValue] = useState(0);

  useEffect(() => {
    const availability = getLocalBibleAiAvailability();
    setAvailabilityReason(
      availability.isSupported ? "Enable local AI to use writing assistance." : availability.reason
    );
  }, []);

  const value = useMemo<WritingAssistantContextValue>(
    () => ({
      status,
      availabilityReason,
      progressLabel,
      progressValue,
      enableAi: async () => {
        const availability = getLocalBibleAiAvailability();

        if (!availability.isSupported) {
          setStatus("disabled");
          setAvailabilityReason(availability.reason);
          return;
        }

        setStatus("downloading");
        setAvailabilityReason("");
        setProgressLabel("Preparing local AI…");
        setProgressValue(0);

        try {
          await loadLocalBibleAi((report) => {
            const progress = normalizeLocalBibleAiProgress(report);
            setProgressLabel(progress.label || "Downloading local model…");
            setProgressValue(progress.progress);
          });
          setStatus("ready");
          setProgressLabel("Local AI ready.");
          setProgressValue(1);
        } catch (error) {
          setStatus("error");
          setAvailabilityReason(
            error instanceof Error ? error.message : "Local AI could not be started."
          );
        }
      },
      generateWritingDraft: async ({ action, systemPrompt, target, title, userPrompt }) => {
        const availability = getLocalBibleAiAvailability();

        if (!availability.isSupported) {
          setStatus("disabled");
          setAvailabilityReason(availability.reason);
          return null;
        }

        if (status === "disabled" || status === "error") {
          setAvailabilityReason("Enable local AI to use writing assistance.");
          return null;
        }

        setStatus("generating");
        setAvailabilityReason("");

        try {
          const content = await generateLocalBibleAiAnswer({ systemPrompt, userPrompt });
          setStatus("ready");

          return {
            action,
            target,
            title,
            content:
              content.trim() ||
              "The local AI could not generate a writing draft from the available Bible context."
          };
        } catch (error) {
          setStatus("error");
          setAvailabilityReason(
            error instanceof Error ? error.message : "Local AI could not generate a writing draft."
          );
          return null;
        }
      }
    }),
    [availabilityReason, progressLabel, progressValue, status]
  );

  return (
    <WritingAssistantContext.Provider value={value}>{children}</WritingAssistantContext.Provider>
  );
}

export function useWritingAssistant() {
  const context = useContext(WritingAssistantContext);

  if (!context) {
    throw new Error("useWritingAssistant must be used within WritingAssistantProvider.");
  }

  return context;
}
