type EsvSourceToken = string | [string] | [string, string];

export function normalizeEsvSourceBookName(value: string) {
  return value
    .toLowerCase()
    .replace(/\biii\b/g, "3")
    .replace(/\bii\b/g, "2")
    .replace(/\bi\b/g, "1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseEsvSourceVerse(tokens: EsvSourceToken[]) {
  return tokens
    .map((token) => (Array.isArray(token) ? token[0] ?? "" : token))
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*([,;:.!?])/g, "$1")
    .replace(/([,;:.!?])(?![\s"')\]}\u201d\u2019])/g, "$1 ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+/g, " ")
    .trim();
}
