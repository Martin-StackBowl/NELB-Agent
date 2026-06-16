"""Shared text helpers for building human-readable citation previews."""

import re

# Common Windows-1252-decoded-as-UTF-8 mojibake sequences -> correct character.
_MOJIBAKE = {
    "â€”": "—",
    "â€“": "–",
    "â€™": "'",
    "â€˜": "'",
    "â€œ": '"',
    "â€\x9d": '"',
    "â€": '"',
    "â€¦": "…",
    "â€¢": "•",
    "Â ": " ",
    "Â": "",
}


def _fix_encoding(text: str) -> str:
    """Repair text that was UTF-8 but got decoded as Windows-1252 (mojibake)."""
    if "Ã" in text or "â€" in text or "Â" in text:
        # The cleanest repair: re-encode as latin-1 then decode as utf-8.
        try:
            return text.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    # Fall back to targeted replacements.
    for bad, good in _MOJIBAKE.items():
        text = text.replace(bad, good)
    return text


def _strip_markdown(text: str) -> str:
    """Reduce markdown to plain, readable prose for a compact preview."""
    # Bold / italic markers
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    # Inline code backticks
    text = text.replace("`", "")
    # Markdown links [text](url) -> text
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    return text


def make_snippet(content: str, max_len: int = 280, drop_title: str = "") -> str:
    """Build a clean preview snippet from a retrieved KB document.

    Repairs mojibake, strips markdown noise (headings, bold, rules, tables),
    and collapses whitespace so the frontend hover card shows readable prose.
    When ``drop_title`` is given, a leading line equal to the title is removed
    so the preview shows the actual referenced text rather than the title.
    """
    if not content:
        return ""

    content = _fix_encoding(content)
    cleaned: list[str] = []

    for line in content.strip().split("\n"):
        s = line.strip()
        if not s:
            continue
        # Skip Azure raw citation lines like "1|Title|source"
        if re.match(r"^\d+\|.*\|.*$", s):
            continue
        # Skip horizontal rules (---, ***, ___, ===)
        if re.match(r"^[-*_=]{3,}$", s):
            continue
        # Skip markdown table separator rows like |---|:--:|
        if re.match(r"^\|?[\s:\-|]+\|[\s:\-|]+$", s):
            continue
        # Drop leading markdown heading markers but keep the text
        s = re.sub(r"^#{1,6}\s+", "", s)
        # Flatten table rows: turn pipes into separators
        if "|" in s:
            cells = [c.strip() for c in s.split("|") if c.strip()]
            s = ", ".join(cells)
        s = _strip_markdown(s).strip()
        if not s:
            continue
        # Skip a line that is just the document title (avoid repeating it)
        if drop_title and s.lower() == drop_title.strip().lower():
            continue
        cleaned.append(s)

    snippet = " ".join(cleaned).strip()
    snippet = re.sub(r"\s{2,}", " ", snippet)
    if len(snippet) > max_len:
        snippet = snippet[:max_len].rsplit(" ", 1)[0] + "…"
    return snippet
