"""Shared text normalization helpers."""
import unicodedata


def normalize(s: str) -> str:
    """Lowercase and strip diacritics via NFD decomposition."""
    nfd = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn").strip()
