#!/usr/bin/env python3

from __future__ import annotations

import json
import unicodedata
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from tf.fabric import Fabric


REPO_ROOT = Path(__file__).resolve().parents[1]
LXX_ROOT = Path("/tmp/CenterBLC-LXX")
LXX_MODULE = "tf/1935"
VERSION_DIR = REPO_ROOT / "data" / "bible" / "versions" / "greek"
VERSION_BOOKS_DIR = VERSION_DIR / "books"
ESV_VERSION_BOOKS_DIR = REPO_ROOT / "data" / "bible" / "versions" / "esv" / "books"
GREEK_DATA_DIR = REPO_ROOT / "data" / "bible" / "greek"
SEARCH_DIR = REPO_ROOT / "data" / "bible" / "search"
WEB_BOOKS_PATH = REPO_ROOT / "data" / "bible" / "versions" / "web" / "books.json"
INTERLINEAR_DIR = REPO_ROOT / "data" / "bible" / "interlinear" / "esv" / "base"
NT_LEXICON_PATH = GREEK_DATA_DIR / "lexicon.json"
ENGLISH_LXX_USFX_PATH = Path("/tmp/englxxup/englxxup_usfx.xml")

OT_BOOK_CODE_BY_SLUG = {
    "genesis": "Gen",
    "exodus": "Exod",
    "leviticus": "Lev",
    "numbers": "Num",
    "deuteronomy": "Deut",
    "joshua": "Josh",
    "judges": "Judg",
    "ruth": "Ruth",
    "1-samuel": "1Sam",
    "2-samuel": "2Sam",
    "1-kings": "1Kgs",
    "2-kings": "2Kgs",
    "1-chronicles": "1Chr",
    "2-chronicles": "2Chr",
    "ezra": "2Esdr",
    "nehemiah": "2Esdr",
    "esther": "Esth",
    "job": "Job",
    "psalms": "Ps",
    "proverbs": "Prov",
    "ecclesiastes": "Qoh",
    "song-of-solomon": "Cant",
    "isaiah": "Isa",
    "jeremiah": "Jer",
    "lamentations": "Lam",
    "ezekiel": "Ezek",
    "daniel": "Dan",
    "hosea": "Hos",
    "joel": "Joel",
    "amos": "Amos",
    "obadiah": "Obad",
    "jonah": "Jonah",
    "micah": "Mic",
    "nahum": "Nah",
    "habakkuk": "Hab",
    "zephaniah": "Zeph",
    "haggai": "Hag",
    "zechariah": "Zech",
    "malachi": "Mal",
}

OT_ENGLISH_BOOK_ID_BY_SLUG = {
    "genesis": "GEN",
    "exodus": "EXO",
    "leviticus": "LEV",
    "numbers": "NUM",
    "deuteronomy": "DEU",
    "joshua": "JOS",
    "judges": "JDG",
    "ruth": "RUT",
    "1-samuel": "1SA",
    "2-samuel": "2SA",
    "1-kings": "1KI",
    "2-kings": "2KI",
    "1-chronicles": "1CH",
    "2-chronicles": "2CH",
    "ezra": "EZR",
    "nehemiah": "EZR",
    "esther": "ESG",
    "job": "JOB",
    "psalms": "PSA",
    "proverbs": "PRO",
    "ecclesiastes": "ECC",
    "song-of-solomon": "SNG",
    "isaiah": "ISA",
    "jeremiah": "JER",
    "lamentations": "LAM",
    "ezekiel": "EZK",
    "daniel": "DAG",
    "hosea": "HOS",
    "joel": "JOL",
    "amos": "AMO",
    "obadiah": "OBA",
    "jonah": "JON",
    "micah": "MIC",
    "nahum": "NAM",
    "habakkuk": "HAB",
    "zephaniah": "ZEP",
    "haggai": "HAG",
    "zechariah": "ZEC",
    "malachi": "MAL",
}

NT_SLUGS = {
    "matthew",
    "mark",
    "luke",
    "john",
    "acts",
    "romans",
    "1-corinthians",
    "2-corinthians",
    "galatians",
    "ephesians",
    "philippians",
    "colossians",
    "1-thessalonians",
    "2-thessalonians",
    "1-timothy",
    "2-timothy",
    "titus",
    "philemon",
    "hebrews",
    "james",
    "1-peter",
    "2-peter",
    "1-john",
    "2-john",
    "3-john",
    "jude",
    "revelation",
}

SOURCE_LABEL_BY_TESTAMENT = {"Old": "Rahlfs LXX", "New": "SBLGNT"}
USFX_NOTE_TAGS = {"f", "fe", "x", "fig", "fm", "fk", "fq", "fr", "ft", "xo", "xt"}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def normalize_space(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).replace("\u00A0", " ").split()).strip()


def strip_xml_tag(tag: str) -> str:
    return tag.split("}", 1)[-1]


def parse_reference_number(value: Any) -> int | None:
    cleaned = normalize_space(value)
    digits: list[str] = []
    for char in cleaned:
        if char.isdigit():
            digits.append(char)
            continue
        break
    return int("".join(digits)) if digits else None


def clean_greek(value: Any) -> str:
    return normalize_space(value).replace("·", "·")


def normalize_strongs(value: Any) -> str | None:
    cleaned = normalize_space(value).upper()
    if not cleaned:
        return None
    if cleaned.startswith("G") and cleaned[1:].isdigit():
        return f"G{int(cleaned[1:])}"
    if cleaned.isdigit():
        return f"G{int(cleaned)}"
    return None


def normalize_greek_lookup(value: str) -> str:
    lowered = unicodedata.normalize("NFD", value or "")
    chars: list[str] = []
    for char in lowered:
        if unicodedata.category(char).startswith("M"):
            continue
        if char == "ς":
            char = "σ"
        if char.isalnum() or char.isspace() or "α" <= char <= "ω" or "Α" <= char <= "Ω":
            chars.append(char.lower())
        else:
            chars.append(" ")
    return " ".join("".join(chars).split())


def normalize_greek_form_lookup(value: str) -> str:
    normalized = normalize_greek_lookup(value)
    return "".join(char for char in normalized if not char.isspace())


def make_entry_key(lemma: str, strongs: str | None) -> str:
    if strongs:
        return strongs
    normalized = normalize_greek_form_lookup(lemma)
    return f"lemma:{normalized or lemma.lower()}"


def map_ot_reference(slug: str, chapter_number: int, verse_number: int) -> tuple[int, int] | None:
    if slug == "ezra":
        if 1 <= chapter_number <= 10:
            return chapter_number, verse_number
        return None
    if slug == "nehemiah":
        if 11 <= chapter_number <= 23:
            return chapter_number - 10, verse_number
        return None
    if slug == "psalms":
        if 1 <= chapter_number <= 150:
            return chapter_number, verse_number
        return None
    if slug == "joel":
        if chapter_number == 1:
            return 1, verse_number
        if chapter_number == 2:
            return 2, verse_number
        if chapter_number == 3:
            return 2, 27 + verse_number
        if chapter_number == 4:
            return 3, verse_number
        return None
    if slug == "malachi":
        if chapter_number in (1, 2):
            return chapter_number, verse_number
        if chapter_number == 3:
            return (3, verse_number) if verse_number <= 18 else (4, verse_number - 18)
        return None
    return chapter_number, verse_number


def decode_ot_morphology(features: dict[str, str]) -> str | None:
    parts: list[str] = []
    part_of_speech = normalize_space(features.get("sp")).lower()
    tense = normalize_space(features.get("tense")).lower()
    voice = normalize_space(features.get("voice")).lower()
    mood = normalize_space(features.get("mood")).lower()
    case = normalize_space(features.get("case")).lower()
    number = normalize_space(features.get("nu")).lower()
    gender = normalize_space(features.get("gn")).lower()
    person = normalize_space(features.get("ps")).lower()
    degree = normalize_space(features.get("degree")).lower()

    if part_of_speech:
        parts.append(part_of_speech)
    if tense:
        parts.append(
            {
                "aor": "aorist",
                "impf": "imperfect",
                "perf": "perfect",
                "fut": "future",
                "pres": "present",
            }.get(tense, tense)
        )
    if voice:
        parts.append({"act": "active", "mid": "middle", "pass": "passive"}.get(voice, voice))
    if mood:
        parts.append(
            {
                "ind": "indicative",
                "sub": "subjunctive",
                "imp": "imperative",
                "inf": "infinitive",
                "ptcp": "participle",
                "opt": "optative",
            }.get(mood, mood)
        )
    if case:
        parts.append(
            {
                "nom": "nominative",
                "gen": "genitive",
                "dat": "dative",
                "acc": "accusative",
                "voc": "vocative",
            }.get(case, case)
        )
    if number:
        parts.append({"sing": "singular", "plur": "plural"}.get(number, number))
    if gender:
        parts.append(
            {"masc": "masculine", "fem": "feminine", "neut": "neuter"}.get(gender, gender)
        )
    if person and ("verb" in part_of_speech or ("pronoun" in part_of_speech and "article" not in part_of_speech)):
        parts.append(
            {"1st": "first person", "2nd": "second person", "3rd": "third person"}.get(
                person, person
            )
        )
    if degree:
        parts.append({"comp": "comparative", "superl": "superlative"}.get(degree, degree))

    return " ".join(part for part in parts if part) or None


def build_text_from_tokens(tokens: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for token in tokens:
        segment = token["surface"]
        punctuation = token.get("trailingPunctuation") or ""
        parts.append(f"{segment}{punctuation}".strip())
    return " ".join(part for part in parts if part).strip()


def collect_usfx_book_verses(book_element: ET.Element) -> dict[int, dict[int, str]]:
    verses: dict[int, dict[int, list[str]]] = defaultdict(lambda: defaultdict(list))
    current_chapter: int | None = None
    current_verse: int | None = None

    def add_text(text: str | None) -> None:
        cleaned = normalize_space(text)
        if current_chapter is None or current_verse is None or not cleaned:
            return
        verses[current_chapter][current_verse].append(cleaned)

    def walk(node: ET.Element, skip: bool = False) -> None:
        nonlocal current_chapter, current_verse

        tag = strip_xml_tag(node.tag)
        next_skip = skip or tag in USFX_NOTE_TAGS

        if tag == "c":
            current_chapter = parse_reference_number(node.attrib.get("id"))
            current_verse = None
        elif tag == "v":
            current_verse = parse_reference_number(node.attrib.get("id"))
        elif not next_skip:
            add_text(node.text)

        for child in node:
            walk(child, next_skip)
            if not next_skip:
                add_text(child.tail)

    for child in book_element:
        walk(child)

    return {
        chapter_number: {
            verse_number: normalize_space(" ".join(parts))
            for verse_number, parts in chapter_verses.items()
            if normalize_space(" ".join(parts))
        }
        for chapter_number, chapter_verses in verses.items()
    }


def build_ot_english_translation_map() -> dict[str, dict[int, dict[int, str]]]:
    if not ENGLISH_LXX_USFX_PATH.exists():
        raise SystemExit(
            "Expected Updated Brenton USFX at /tmp/englxxup/englxxup_usfx.xml."
        )

    root = ET.parse(ENGLISH_LXX_USFX_PATH).getroot()
    books_by_id = {
        book.attrib["id"]: book for book in root.findall("book") if book.attrib.get("id")
    }
    english_map: dict[str, dict[int, dict[int, str]]] = defaultdict(
        lambda: defaultdict(dict)
    )

    for slug, book_id in OT_ENGLISH_BOOK_ID_BY_SLUG.items():
        book_element = books_by_id.get(book_id)
        if book_element is None:
            raise SystemExit(f"Missing English LXX book {book_id} for {slug}.")

        for source_chapter, source_verses in collect_usfx_book_verses(book_element).items():
            for source_verse, verse_text in source_verses.items():
                mapped_reference = map_ot_reference(slug, source_chapter, source_verse)
                if not mapped_reference:
                    continue

                mapped_chapter, mapped_verse = mapped_reference
                existing_text = english_map[slug][mapped_chapter].get(mapped_verse)
                english_map[slug][mapped_chapter][mapped_verse] = (
                    f"{existing_text} {verse_text}".strip()
                    if existing_text
                    else verse_text
                )

    return {
        slug: {
            chapter_number: dict(sorted(verses.items()))
            for chapter_number, verses in sorted(chapters.items())
        }
        for slug, chapters in sorted(english_map.items())
    }


def build_nt_esv_translation_map() -> dict[str, dict[int, dict[int, str]]]:
    translations: dict[str, dict[int, dict[int, str]]] = {}

    for slug in NT_SLUGS:
        esv_book = read_json(ESV_VERSION_BOOKS_DIR / f"{slug}.json")
        translations[slug] = {
            chapter["chapterNumber"]: {
                verse["number"]: normalize_space(verse.get("text"))
                for verse in chapter.get("verses", [])
                if normalize_space(verse.get("text"))
            }
            for chapter in esv_book.get("chapters", [])
        }

    return translations


def sort_forms(forms: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        forms,
        key=lambda form: (
            normalize_greek_form_lookup(form.get("form", "")),
            normalize_space(form.get("morphology", "")),
            normalize_space(form.get("definition", "")),
        ),
    )


def main() -> None:
    if not LXX_ROOT.exists():
        raise SystemExit("Expected LXX source at /tmp/CenterBLC-LXX.")

    web_books = read_json(WEB_BOOKS_PATH)
    books_by_slug = {book["slug"]: book for book in web_books}
    ot_english_translation_map = build_ot_english_translation_map()
    nt_esv_translation_map = build_nt_esv_translation_map()

    existing_nt_lexicon = read_json(NT_LEXICON_PATH)
    lexicon_entries: dict[str, dict[str, Any]] = {}
    gloss_candidates: dict[str, Counter[str]] = defaultdict(Counter)
    transliteration_candidates: dict[str, Counter[str]] = defaultdict(Counter)
    form_maps: dict[str, dict[tuple[str, str, str], dict[str, Any]]] = defaultdict(dict)
    testament_sets: dict[str, set[str]] = defaultdict(set)
    source_sets: dict[str, set[str]] = defaultdict(set)

    for raw_entry_key, raw_entry in existing_nt_lexicon.items():
        entry_key = raw_entry.get("entryKey") or raw_entry_key
        entry = {
            "entryKey": entry_key,
            "lemma": raw_entry["lemma"],
            "strongs": raw_entry.get("strongs"),
            "transliteration": raw_entry.get("transliteration", ""),
            "pronunciation": raw_entry.get("pronunciation"),
            "shortDefinition": raw_entry.get("shortDefinition", ""),
            "longDefinition": raw_entry.get("longDefinition"),
        }
        lexicon_entries[entry_key] = entry
        testament_sets[entry_key].add("New")
        source_sets[entry_key].add(SOURCE_LABEL_BY_TESTAMENT["New"])
        if entry["transliteration"]:
            transliteration_candidates[entry_key][entry["transliteration"]] += 1
        if entry["shortDefinition"]:
            gloss_candidates[entry_key][entry["shortDefinition"]] += 2
        if entry.get("longDefinition"):
            for fragment in str(entry["longDefinition"]).split("\n"):
                fragment = normalize_space(fragment)
                if fragment:
                    gloss_candidates[entry_key][fragment] += 1
        for form in raw_entry.get("forms", []):
            form_maps[entry_key][
                (
                    form.get("form", ""),
                    form.get("morphology", ""),
                    form.get("definition", "") or "",
                )
            ] = {
                "form": form.get("form", ""),
                "morphology": form.get("morphology", ""),
                **(
                    {"decodedMorphology": form["decodedMorphology"]}
                    if form.get("decodedMorphology")
                    else {}
                ),
                **({"definition": form["definition"]} if form.get("definition") else {}),
            }

    TF = Fabric(locations=str(LXX_ROOT), modules=LXX_MODULE, silent=True)
    api = TF.load(
        "word lex_utf8 strongs gloss translit_SBL morphology sp tense voice mood case nu gn ps degree otype",
        silent=True,
    )
    F = api.F
    T = api.T

    ot_book_verses: dict[str, dict[int, dict[int, list[dict[str, Any]]]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(list))
    )

    code_to_slug = {code: slug for slug, code in OT_BOOK_CODE_BY_SLUG.items()}

    for word in F.otype.s("word"):
        book_code, chapter_number, verse_number = T.sectionFromNode(word)
        slug = code_to_slug.get(book_code)
        if not slug:
            continue

        mapped_reference = map_ot_reference(slug, chapter_number, verse_number)
        if not mapped_reference:
            continue

        mapped_chapter, mapped_verse = mapped_reference
        surface = clean_greek(F.word.v(word))
        lemma = clean_greek(F.lex_utf8.v(word) or surface)
        strongs = normalize_strongs(F.strongs.v(word))
        entry_key = make_entry_key(lemma, strongs)
        transliteration = normalize_space(F.translit_SBL.v(word))
        gloss = normalize_space(F.gloss.v(word))
        morphology = normalize_space(F.morphology.v(word)).replace(".", "-")
        decoded_morphology = decode_ot_morphology(
            {
                "sp": F.sp.v(word),
                "tense": F.tense.v(word),
                "voice": F.voice.v(word),
                "mood": F.mood.v(word),
                "case": F.case.v(word),
                "nu": F.nu.v(word),
                "gn": F.gn.v(word),
                "ps": F.ps.v(word),
                "degree": F.degree.v(word),
            }
        )

        token = {
            "surface": surface,
            "lemma": lemma,
            "entryKey": entry_key,
            **({"strongs": strongs} if strongs else {}),
            **({"morphology": morphology} if morphology else {}),
            **({"decodedMorphology": decoded_morphology} if decoded_morphology else {}),
            **({"gloss": gloss} if gloss else {}),
            **({"transliteration": transliteration} if transliteration else {}),
        }
        ot_book_verses[slug][mapped_chapter][mapped_verse].append(token)

        entry = lexicon_entries.get(entry_key)
        if not entry:
            entry = {
                "entryKey": entry_key,
                "lemma": lemma,
                "strongs": strongs,
                "transliteration": "",
                "shortDefinition": "",
            }
            lexicon_entries[entry_key] = entry

        testament_sets[entry_key].add("Old")
        source_sets[entry_key].add(SOURCE_LABEL_BY_TESTAMENT["Old"])
        if transliteration:
            transliteration_candidates[entry_key][transliteration] += 1
        if gloss:
            gloss_candidates[entry_key][gloss] += 1
        form_maps[entry_key][(surface, morphology, gloss)] = {
            "form": surface,
            "morphology": morphology,
            **({"decodedMorphology": decoded_morphology} if decoded_morphology else {}),
            **({"definition": gloss} if gloss else {}),
        }

    search_entries: list[dict[str, Any]] = []
    book_payloads: dict[str, dict[str, Any]] = {}

    for book in web_books:
        slug = book["slug"]
        if book["testament"] == "Old":
            chapters_payload = []
            for chapter_number in sorted(ot_book_verses[slug]):
                verses_payload = []
                for verse_number in sorted(ot_book_verses[slug][chapter_number]):
                    greek_tokens = ot_book_verses[slug][chapter_number][verse_number]
                    text = build_text_from_tokens(greek_tokens)
                    translation_text = (
                        ot_english_translation_map.get(slug, {})
                        .get(chapter_number, {})
                        .get(verse_number)
                    )
                    verses_payload.append(
                        {
                            "number": verse_number,
                            "text": text,
                            **(
                                {"translationText": translation_text}
                                if translation_text
                                else {}
                            ),
                            "greekTokens": greek_tokens,
                        }
                    )
                    search_entries.append(
                        {
                            "version": "greek",
                            "bookSlug": slug,
                            "bookName": book["name"],
                            "chapterNumber": chapter_number,
                            "verseNumber": verse_number,
                            "text": text,
                            **(
                                {"translationText": translation_text}
                                if translation_text
                                else {}
                            ),
                            "greekEntryKeys": sorted(
                                {
                                    token.get("entryKey") or token.get("strongs")
                                    for token in greek_tokens
                                    if token.get("entryKey") or token.get("strongs")
                                }
                            ),
                        }
                    )
                chapters_payload.append(
                    {
                        "bookSlug": slug,
                        "chapterNumber": chapter_number,
                        "verses": verses_payload,
                    }
                )
            book_payloads[slug] = {"book": book, "chapters": chapters_payload}
            continue

        if slug not in NT_SLUGS:
            continue

        nt_book = read_json(INTERLINEAR_DIR / f"{slug}.json")
        chapters_payload = []
        for chapter in nt_book["chapters"]:
            verses_payload = []
            for verse in chapter["verses"]:
                raw_tokens = verse.get("tokens", [])
                greek_tokens = []
                for token in raw_tokens:
                    strongs = token.get("strongs")
                    entry_key = make_entry_key(token.get("lemma", token.get("surface", "")), strongs)
                    greek_token = {
                        **token,
                        "entryKey": entry_key,
                    }
                    greek_tokens.append(greek_token)

                text = verse.get("baseGreek") or build_text_from_tokens(greek_tokens)
                translation_text = (
                    nt_esv_translation_map.get(slug, {})
                    .get(chapter["chapterNumber"], {})
                    .get(verse["number"])
                )
                verses_payload.append(
                    {
                        "number": verse["number"],
                        "text": text,
                        **(
                            {"translationText": translation_text}
                            if translation_text
                            else {}
                        ),
                        "greekTokens": greek_tokens,
                    }
                )
                search_entries.append(
                    {
                        "version": "greek",
                        "bookSlug": slug,
                        "bookName": book["name"],
                        "chapterNumber": chapter["chapterNumber"],
                        "verseNumber": verse["number"],
                        "text": text,
                        **(
                            {"translationText": translation_text}
                            if translation_text
                            else {}
                        ),
                        "greekEntryKeys": sorted(
                            {
                                token.get("entryKey") or token.get("strongs")
                                for token in greek_tokens
                                if token.get("entryKey") or token.get("strongs")
                            }
                        ),
                    }
                )
            chapters_payload.append(
                {
                    "bookSlug": slug,
                    "chapterNumber": chapter["chapterNumber"],
                    "verses": verses_payload,
                }
            )
        book_payloads[slug] = {"book": book, "chapters": chapters_payload}

    final_lexicon: dict[str, dict[str, Any]] = {}
    lemma_index: dict[str, set[str]] = defaultdict(set)
    form_index: dict[str, dict[tuple[str, str], dict[str, Any]]] = defaultdict(dict)

    for entry_key, entry in lexicon_entries.items():
        if not entry.get("transliteration") and transliteration_candidates[entry_key]:
            entry["transliteration"] = transliteration_candidates[entry_key].most_common(1)[0][0]
        if not entry.get("shortDefinition") and gloss_candidates[entry_key]:
            entry["shortDefinition"] = gloss_candidates[entry_key].most_common(1)[0][0]

        gloss_fragments = []
        if entry.get("longDefinition"):
            gloss_fragments.extend(
                fragment
                for fragment in str(entry["longDefinition"]).split("\n")
                if normalize_space(fragment)
            )
        gloss_fragments.extend(
            gloss for gloss, _count in gloss_candidates[entry_key].most_common(12) if normalize_space(gloss)
        )
        unique_gloss_fragments: list[str] = []
        seen_fragments: set[str] = set()
        for fragment in gloss_fragments:
            cleaned = normalize_space(fragment)
            if not cleaned or cleaned in seen_fragments:
                continue
            seen_fragments.add(cleaned)
            unique_gloss_fragments.append(cleaned)

        forms = sort_forms(list(form_maps[entry_key].values()))
        finalized_entry = {
            "entryKey": entry_key,
            "lemma": entry["lemma"],
            **({"strongs": entry["strongs"]} if entry.get("strongs") else {}),
            "transliteration": entry.get("transliteration") or "",
            **({"pronunciation": entry["pronunciation"]} if entry.get("pronunciation") else {}),
            "shortDefinition": entry.get("shortDefinition") or "Greek lemma",
            **(
                {"longDefinition": "\n".join(unique_gloss_fragments[:12])}
                if unique_gloss_fragments
                and "\n".join(unique_gloss_fragments[:12]) != entry.get("shortDefinition")
                else {}
            ),
            "forms": forms,
            "testaments": sorted(testament_sets[entry_key]),
            "sources": sorted(source_sets[entry_key]),
        }
        final_lexicon[entry_key] = finalized_entry

        normalized_lemma = normalize_greek_lookup(finalized_entry["lemma"])
        if normalized_lemma:
            lemma_index[normalized_lemma].add(entry_key)

        if finalized_entry.get("strongs"):
            lemma_index[normalize_greek_lookup(finalized_entry["strongs"])].add(entry_key)

        for form in finalized_entry["forms"]:
            normalized_form = normalize_greek_form_lookup(form["form"])
            if not normalized_form:
                continue
            form_index[normalized_form][(entry_key, form["form"])] = {
                "entryKey": entry_key,
                **({"strongs": finalized_entry["strongs"]} if finalized_entry.get("strongs") else {}),
                "form": form["form"],
            }

    write_json(VERSION_DIR / "books.json", web_books)
    for slug, payload in book_payloads.items():
        write_json(VERSION_BOOKS_DIR / f"{slug}.json", payload)

    write_json(SEARCH_DIR / "greek.json", search_entries)
    write_json(GREEK_DATA_DIR / "lexicon.json", final_lexicon)
    write_json(
        GREEK_DATA_DIR / "lemma-index.json",
        {key: sorted(values) for key, values in sorted(lemma_index.items())},
    )
    write_json(
        GREEK_DATA_DIR / "form-index.json",
        {
            key: sorted(values.values(), key=lambda item: (item["entryKey"], item["form"]))
            for key, values in sorted(form_index.items())
        },
    )

    print("Generated Greek version, search index, and merged lexicon.")


if __name__ == "__main__":
    main()
