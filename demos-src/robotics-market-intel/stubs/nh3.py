"""Allowlist HTML sanitizer standing in for nh3.clean (same call shape)."""
from html import escape
from html.parser import HTMLParser
ALLOWED_TAGS = {"a","abbr","b","blockquote","br","code","dd","del","div","dl","dt","em","h1","h2","h3","h4","h5","h6","hr","i","img","area","map","li","ol","p","pre","s","span","strong","sub","sup","table","tbody","td","th","thead","tr","u","ul"}
ATTRS = {"a": {"href", "title"}, "th": {"align", "style"}, "td": {"align", "style"}, "code": {"class"}}
class _S(HTMLParser):
    def __init__(self, tags, schemes):
        super().__init__(convert_charrefs=True); self.out=[]; self.tags=tags; self.schemes=schemes
    def handle_starttag(self, tag, attrs):
        if tag not in self.tags: return
        keep=[]
        for k,v in attrs:
            if k not in ATTRS.get(tag,()) or v is None: continue
            if k=="href" and ":" in v.split("/")[0] and v.split(":",1)[0].lower() not in self.schemes: continue
            if k=="style" and not v.startswith("text-align"): continue
            keep.append(f' {k}="{escape(v)}"')
        if tag=="a": keep.append(' rel="noopener noreferrer"')
        self.out.append(f"<{tag}{''.join(keep)}>")
    def handle_endtag(self, tag):
        if tag in self.tags: self.out.append(f"</{tag}>")
    def handle_data(self, d): self.out.append(escape(d, quote=False))
def clean(html, tags=None, url_schemes=None, **_):
    s=_S(tags or ALLOWED_TAGS, url_schemes or {"http","https","mailto"}); s.feed(html); s.close(); return "".join(s.out)
