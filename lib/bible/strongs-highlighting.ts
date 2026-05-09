import { normalizeStrongsNumber } from "@/lib/bible/strongs";
import type { BibleSearchVerseEntry, GreekLemmaEntry, GreekToken } from "@/lib/bible/types";

type StrongsHighlightMode = "strongs" | "greek";

function matchesGreekTokenEntry(token: GreekToken, entryId: string) {
  const tokenEntryKey = token.entryKey ?? token.strongs ?? null;

  return (
    tokenEntryKey === entryId ||
    (token.strongs ? normalizeStrongsNumber(token.strongs) === normalizeStrongsNumber(entryId) : false)
  );
}

export function getStrongsEnglishHighlightPhrases(
  entryId: string,
  match: Pick<BibleSearchVerseEntry, "tokens" | "greekTokens">,
  mode: StrongsHighlightMode
) {
  const tokenTextMatches = Array.from(
    new Set(
      (match.tokens ?? [])
        .filter((token) =>
          token.strongsNumbers?.some(
            (strongsNumber) => normalizeStrongsNumber(strongsNumber) === normalizeStrongsNumber(entryId)
          )
        )
        .map((token) => token.text.trim())
        .filter(Boolean)
    )
  );

  if (tokenTextMatches.length > 0) {
    return tokenTextMatches;
  }

  if (mode === "greek") {
    return Array.from(
      new Set(
        (match.greekTokens ?? [])
          .filter((token) => matchesGreekTokenEntry(token, entryId))
          .flatMap((token) => [token.gloss?.trim() ?? "", token.lemma.trim()])
          .filter(Boolean)
      )
    );
  }

  return [];
}

export function getStrongsGreekHighlightPhrases(
  entryId: string,
  options?: {
    sourceEntry?: Pick<GreekLemmaEntry, "lemma" | "forms"> | null;
    match?: Pick<BibleSearchVerseEntry, "greekTokens"> | null;
  }
) {
  const entryPhrases =
    options?.sourceEntry
      ? [
          options.sourceEntry.lemma,
          ...options.sourceEntry.forms.map((form) => form.form)
        ]
      : [];
  const tokenPhrases =
    options?.match?.greekTokens
      ?.filter((token) => matchesGreekTokenEntry(token, entryId))
      .flatMap((token) => [token.surface, token.lemma])
      ?? [];

  return Array.from(
    new Set(
      [...entryPhrases, ...tokenPhrases]
        .map((phrase) => phrase.trim())
        .filter(Boolean)
    )
  );
}
