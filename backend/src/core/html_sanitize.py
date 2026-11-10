"""Saneado mínimo de HTML de firmas de correo (lista blanca, solo biblioteca estándar)."""
from typing import Optional
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

_ALLOWED_TAGS = {
    "a", "b", "strong", "i", "em", "u", "br", "p", "div", "span", "ul", "ol", "li",
    "img", "table", "tbody", "thead", "tr", "td", "th", "hr", "h1", "h2", "h3", "h4",
    "blockquote", "font", "sub", "sup",
}
_VOID_TAGS = {"br", "hr", "img"}
_DROP_CONTENT_TAGS = {"script", "style", "iframe", "object", "embed", "noscript", "template"}
_ALLOWED_ATTRS = {
    "a": {"href", "title", "style"},
    "img": {"src", "alt", "width", "height", "style"},
    "td": {"colspan", "rowspan", "style", "align", "valign"},
    "th": {"colspan", "rowspan", "style", "align", "valign"},
    "font": {"color", "size", "face"},
}
_GLOBAL_ATTRS = {"style", "align"}
_SAFE_SCHEMES = {"http", "https", "mailto", "tel"}


def _safe_url(value: str, allow_data_image: bool = False) -> bool:
    v = (value or "").strip()
    if allow_data_image and v.lower().startswith("data:image/") and "svg" not in v[:30].lower():
        return True
    scheme = urlparse(v).scheme.lower()
    return scheme in _SAFE_SCHEMES or scheme == ""


def _safe_style(value: str) -> bool:
    low = (value or "").lower().replace(" ", "")
    return not any(x in low for x in ("expression(", "javascript:", "url(", "@import", "behavior:"))


class _Cleaner(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in _DROP_CONTENT_TAGS:
            self._skip += 1
            return
        if self._skip or tag not in _ALLOWED_TAGS:
            return
        parts = []
        allowed = _ALLOWED_ATTRS.get(tag, set()) | _GLOBAL_ATTRS
        for name, val in attrs:
            name = (name or "").lower()
            val = val or ""
            if name not in allowed:
                continue
            if name == "style" and not _safe_style(val):
                continue
            if name == "href" and not _safe_url(val):
                continue
            if name == "src" and not _safe_url(val, allow_data_image=True):
                continue
            parts.append(f' {name}="{escape(val, quote=True)}"')
        if tag == "a":
            parts.append(' target="_blank" rel="noopener noreferrer"')
        self.out.append(f"<{tag}{''.join(parts)}>")

    def handle_startendtag(self, tag, attrs):
        if tag in _DROP_CONTENT_TAGS:
            return
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag in _DROP_CONTENT_TAGS:
            self._skip = max(0, self._skip - 1)
            return
        if self._skip or tag not in _ALLOWED_TAGS or tag in _VOID_TAGS:
            return
        self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if not self._skip:
            self.out.append(escape(data, quote=False))


def sanitize_signature_html(html: Optional[str]) -> str:
    cleaner = _Cleaner()
    cleaner.feed(html or "")
    cleaner.close()
    return "".join(cleaner.out).strip()
