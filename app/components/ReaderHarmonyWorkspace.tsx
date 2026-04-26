"use client";

import { ReaderHarmonyContent } from "@/app/components/ReaderHarmonyContent";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";

export function ReaderHarmonyWorkspace() {
  const {
    activeHarmonyId,
    createHarmony,
    deleteHarmony,
    getActiveHarmony,
    getHarmonyDocuments,
    setActiveHarmonyId,
    updateHarmonyTitle
  } = useReaderWorkspace();
  const harmonies = getHarmonyDocuments();
  const activeHarmony = getActiveHarmony();

  return (
    <div className="reader-sermons reader-harmony-workspace">
      <div className="reader-notebook-header">
        <div>
          <p className="reader-notebook-kicker">Study Workspace</p>
          <h3 className="reader-notebook-title">Gospel harmony</h3>
        </div>
        <button className="reader-inline-button" onClick={() => createHarmony()} type="button">
          New harmony
        </button>
      </div>

      <div className="reader-sermons-layout">
        <div className="reader-sermon-list">
          {harmonies.length === 0 ? (
            <p className="reader-notebook-empty">
              Create a local ESV Gospel harmony document to study the four Gospels in chronological order.
            </p>
          ) : (
            harmonies.map((harmony) => (
              <article
                className={`reader-sermon-list-item${activeHarmonyId === harmony.id ? " is-active" : ""}`}
                key={harmony.id}
              >
                <button
                  className="reader-sermon-list-button"
                  onClick={() => setActiveHarmonyId(harmony.id)}
                  type="button"
                >
                  <strong>{harmony.title}</strong>
                  <span>{harmony.events.length} events</span>
                </button>
                <button
                  aria-label={`Delete ${harmony.title}`}
                  className="reader-inline-button"
                  onClick={() => deleteHarmony(harmony.id)}
                  type="button"
                >
                  Delete
                </button>
              </article>
            ))
          )}
        </div>

        {activeHarmony ? (
          <div className="reader-sermon-editor reader-harmony-editor">
            <label className="reader-notebook-field">
              <span>Document title</span>
              <input
                aria-label="Harmony document title"
                className="reader-notebook-title-input"
                onChange={(event) => updateHarmonyTitle(activeHarmony.id, event.target.value)}
                placeholder="Harmony title"
                type="text"
                value={activeHarmony.title}
              />
            </label>

            <p className="reader-notebook-copy">
              Chronological ESV harmony of Matthew, Mark, Luke, and John. Event references and line references stay attached for quick linking back into the reader.
            </p>
            <ReaderHarmonyContent events={activeHarmony.events} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
