"use client";

import { useEffect, useMemo, useState } from "react";

import { ReaderHarmonyContent } from "@/app/components/ReaderHarmonyContent";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";

export function ReaderHarmonyPanel() {
  const { createHarmony, getActiveHarmony, getHarmonyDocuments } = useReaderWorkspace();
  const [selectedEventId, setSelectedEventId] = useState("all");
  const harmonies = getHarmonyDocuments();
  const activeHarmony = getActiveHarmony();

  useEffect(() => {
    if (harmonies.length === 0) {
      createHarmony();
    }
  }, [createHarmony, harmonies.length]);

  useEffect(() => {
    if (!activeHarmony || selectedEventId === "all") {
      return;
    }

    if (!activeHarmony.events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId("all");
    }
  }, [activeHarmony, selectedEventId]);

  const visibleEvents = useMemo(() => {
    if (!activeHarmony) {
      return [];
    }

    if (selectedEventId === "all") {
      return activeHarmony.events;
    }

    return activeHarmony.events.filter((event) => event.id === selectedEventId);
  }, [activeHarmony, selectedEventId]);

  if (!activeHarmony) {
    return (
      <div className="reader-compare-panel reader-harmony-panel" role="tabpanel">
        <p className="search-empty-copy">Preparing the Gospel harmony...</p>
      </div>
    );
  }

  return (
    <div className="reader-compare-panel reader-harmony-panel" role="tabpanel">
      <div className="reader-compare-header">
        <div>
          <p className="reader-notebook-kicker">Reader Harmony</p>
          <h3 className="reader-notebook-title">{activeHarmony.title}</h3>
          <p className="reader-ot-compare-summary">
            Read Matthew, Mark, Luke, and John in a single chronological flow while keeping parallel references attached.
          </p>
        </div>

        <label className="reader-settings-field reader-compare-select" htmlFor="harmony-event-select">
          <span>Event</span>
          <select
            aria-label="Harmony event"
            id="harmony-event-select"
            onChange={(event) => setSelectedEventId(event.target.value)}
            value={selectedEventId}
          >
            <option value="all">All events</option>
            {activeHarmony.events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.eventNumber}. {event.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ReaderHarmonyContent events={visibleEvents} />
    </div>
  );
}
