import type { Verse } from "@/lib/bible/types";

type VerseListProps = {
  verses: Verse[];
};

export function VerseList({ verses }: VerseListProps) {
  return (
    <div className="verse-stack">
      {verses.map((verse) => (
        <div className="verse-row" key={verse.number}>
          <span className="verse-number" aria-hidden="true">
            {verse.number}
          </span>
          <p className="verse-text">{verse.text}</p>
        </div>
      ))}
    </div>
  );
}
