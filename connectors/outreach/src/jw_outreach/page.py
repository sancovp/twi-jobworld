"""`page` -- render a per-brand landing page as a self-contained HTML string.

External effect: writes ONE .html file to disk (the path the caller specifies).
The file is then hosted via `jwout host` and served by `jwout serve`, exactly as
a teaser .mp4 would be. The caller is responsible for hosting; this module is
purely a deterministic renderer.

Design constraints:
- Pure stdlib. No external deps. No build step. No JS framework.
- Inline CSS only. One optional Google Font (Inter) loaded from the network; the
  page degrades to system-ui if the font request fails or the user is offline.
- Mobile-first (single column on narrow viewports; max-width: 760px desktop).
- B6 brand: navy (#0d2045) background, chartreuse (#c8f000) accent. Both are
  DEFAULT parameters -- another client overrides them.
- Copy rules from clients/b6/template.md: no em dashes, no en dashes, no emojis.
  This file does NOT enforce those rules in code (the LLM writes the concept and
  self-checks it); the renderer HTML-escapes all caller-supplied strings and emits
  them verbatim.
- Honesty: the page carries no branding claim about the prospect's involvement. The
  `honesty_note` field is the line the LLM supplies ("we mocked this up to show
  the idea; our artists do the real production"). It is optional but strongly
  recommended for the video-variant page.
- One CTA only: the `calendar_url` button. Nothing else -- no pricing, no deck link.
"""

import html as _html
from pathlib import Path


# ---------------------------------------------------------------------------
# Defaults (B6 brand identity)
# ---------------------------------------------------------------------------

_DEFAULT_BG = "#0d2045"          # navy
_DEFAULT_ACCENT = "#c8f000"      # chartreuse
_DEFAULT_BUTTON_FG = "#0d2045"   # navy text on the chartreuse button


# ---------------------------------------------------------------------------
# CSS
# ---------------------------------------------------------------------------

def _css(bg: str, accent: str, button_fg: str) -> str:
    return (
        "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');"
        ":root{"
        f"--bg:{bg};--card:#fff;--ink:#1a1a2e;"
        f"--accent:{accent};--button-fg:{button_fg};"
        "--dim:#5a6a8a;--border:#e2e8f0;"
        "}"
        "*{box-sizing:border-box;margin:0;padding:0}"
        "html,body{background:var(--bg);min-height:100vh;"
        "font-family:'Inter',ui-sans-serif,system-ui,sans-serif;"
        "color:var(--ink);-webkit-font-smoothing:antialiased}"
        "a{color:var(--accent);text-decoration:none}"
        ".page{max-width:760px;margin:0 auto;padding:40px 20px 80px}"
        ".logo-bar{display:flex;align-items:center;margin-bottom:48px}"
        ".logo-name{font-size:15px;font-weight:700;color:#fff;letter-spacing:.04em;text-transform:uppercase}"
        ".hero-label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;"
        "color:var(--accent);margin-bottom:12px}"
        ".hero-headline{font-size:clamp(22px,5vw,36px);font-weight:700;color:#fff;line-height:1.22;"
        "margin-bottom:32px}"
        ".card{background:var(--card);border-radius:16px;padding:32px;margin-bottom:24px}"
        ".card-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;"
        "color:var(--dim);margin-bottom:14px}"
        ".concept{font-size:16px;line-height:1.7;color:#1a1a2e;white-space:pre-wrap}"
        ".video-wrap{position:relative;width:100%;border-radius:12px;overflow:hidden;"
        "background:#000;margin-bottom:24px}"
        "video{width:100%;display:block;max-height:420px;object-fit:contain}"
        ".honesty{font-size:13px;color:var(--dim);font-style:italic;margin-top:12px;line-height:1.5}"
        ".cta-section{text-align:center;padding:16px 0 8px}"
        ".cta-sub{font-size:14px;color:#ccd6f0;margin-bottom:20px;line-height:1.6}"
        ".cta-btn{display:inline-block;background:var(--accent);color:var(--button-fg);"
        "font-size:16px;font-weight:700;padding:16px 40px;border-radius:10px;border:none;"
        "cursor:pointer;letter-spacing:.01em;text-decoration:none;"
        "transition:opacity .15s ease;white-space:nowrap}"
        ".cta-btn:hover{opacity:.88}"
        ".sig{text-align:center;margin-top:40px;color:#8090b0;font-size:13px;line-height:1.7}"
        ".sig strong{color:#ccd6f0;font-weight:600}"
        "@media(max-width:480px){"
        ".card{padding:20px}"
        ".cta-btn{width:100%;text-align:center;padding:18px 20px}"
        "}"
    )


# ---------------------------------------------------------------------------
# HTML helpers
# ---------------------------------------------------------------------------

def _e(s: str) -> str:
    """HTML-escape a caller-supplied string."""
    return _html.escape(str(s), quote=True)


def _video_block(video_url: str, honesty_note: str) -> str:
    """Return the video embed block if video_url is an mp4 URL; empty string otherwise."""
    if not video_url:
        return ""
    url_e = _e(video_url)
    block = (
        f"<div class='video-wrap'>"
        f"<video controls preload='metadata' playsinline>"
        f"<source src='{url_e}' type='video/mp4'>"
        f"Your browser does not support the video element."
        f"</video>"
        f"</div>"
    )
    if honesty_note:
        block += f"<p class='honesty'>{_e(honesty_note)}</p>"
    return block


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def render(
    *,
    brand: str,
    concept: str,
    calendar_url: str,
    video_url: str = "",
    headline: str = "",
    honesty_note: str = "",
    studio_name: str = "B6 Studios",
    cta_label: str = "Book 15 minutes with Mason and Weston",
    cta_sub: str = "If this lands, grab fifteen minutes with us and we will build the rest with you.",
    from_name: str = "Mason Collins",
    from_title: str = "President, B6 Studios",
    from_email: str = "mason@b6studios.com",
    from_phone: str = "415.717.5037",
    bg_color: str = _DEFAULT_BG,
    accent_color: str = _DEFAULT_ACCENT,
    button_fg_color: str = _DEFAULT_BUTTON_FG,
) -> str:
    """Return a complete, self-contained HTML page string.

    Parameters
    ----------
    brand:
        The brand name. Used in the headline and page title.
    concept:
        The show-concept sketch written by the LLM upstream. 1-3 short paragraphs.
        Plain text; newlines are preserved via ``white-space: pre-wrap``. HTML-escaped.
    calendar_url:
        The booking link for the CTA button (the ONLY CTA on the page).
    video_url:
        The hosted teaser URL. If this ends in .mp4 (or is otherwise a video) it is
        embedded as ``<video controls>``. Empty = text-only page (no video block).
    headline:
        Optional custom headline. Defaults to "What a [[brand]] show looks like."
    honesty_note:
        The line clarifying the teaser is an AI mockup. Shown below the video.
        Strongly recommended when video_url is set. Empty = omit.
    studio_name:
        The studio's name, shown in the logo bar and the page-title suffix. B6 default;
        another client overrides it.
    cta_label:
        The text on the single CTA button. B6 default; another client overrides it.
    cta_sub:
        The line shown just above the CTA button. B6 default; another client overrides it.
    from_name / from_title / from_email / from_phone:
        The sender signature rendered at the bottom of the page. B6 defaults.
    bg_color / accent_color / button_fg_color:
        Brand colors. Defaults are B6 navy + chartreuse. Another client overrides.
    """
    if not brand:
        raise ValueError("brand is required")
    if not concept:
        raise ValueError("concept is required")
    if not calendar_url:
        raise ValueError("calendar_url is required")

    effective_headline = headline or f"What a {brand} show looks like."
    css = _css(bg_color, accent_color, button_fg_color)
    video_html = _video_block(video_url, honesty_note)

    # concept block: always present
    concept_block = (
        f"<div class='card'>"
        f"<div class='card-label'>The concept</div>"
        f"<div class='concept'>{_e(concept)}</div>"
        f"</div>"
    )

    # If there is a video, show it after the concept card
    if video_html:
        media_section = video_html
    else:
        media_section = ""

    sig_block = ""
    if from_name:
        sig_parts = [f"<strong>{_e(from_name)}</strong>"]
        if from_title:
            sig_parts.append(_e(from_title))
        if from_email:
            sig_parts.append(f"<a href='mailto:{_e(from_email)}'>{_e(from_email)}</a>")
        if from_phone:
            sig_parts.append(_e(from_phone))
        sig_block = f"<div class='sig'>{'<br>'.join(sig_parts)}</div>"

    html = (
        "<!doctype html>"
        "<html lang='en'>"
        "<head>"
        "<meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        f"<title>{_e(brand)} - {_e(studio_name)}</title>"
        f"<style>{css}</style>"
        "</head>"
        "<body>"
        "<div class='page'>"
        "<div class='logo-bar'>"
        f"<span class='logo-name'>{_e(studio_name)}</span>"
        "</div>"
        "<div class='hero-label'>A show concept</div>"
        f"<h1 class='hero-headline'>{_e(effective_headline)}</h1>"
        + concept_block
        + media_section
        + "<div class='card cta-section'>"
        f"<p class='cta-sub'>{_e(cta_sub)}</p>"
        f"<a class='cta-btn' href='{_e(calendar_url)}' rel='noopener'>{_e(cta_label)}</a>"
        "</div>"
        + sig_block
        + "</div>"
        "</body>"
        "</html>"
    )
    return html


def write_page(out_path: str, **kwargs) -> str:
    """Render and write the page to ``out_path``. Returns the resolved path string."""
    html = render(**kwargs)
    p = Path(out_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(html, encoding="utf-8")
    return str(p.resolve())
