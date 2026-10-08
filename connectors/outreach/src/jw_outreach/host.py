"""`host` — place an asset at a unique URL.

External effect: copies a file into a served location under a fresh unique
path and returns the public URL. The unique path is what makes per-recipient
view tracking possible: when the serving layer logs a GET on that path, that is
a `view` event (recorded via `track`).

Local-served mode (default): writes under HOST_DIR, returns HOST_BASE_URL/<uid>/<name>.
Point HOST_DIR at the docroot of whatever static server fronts your domain.
    HOST_DIR        (default data/hosted)
    HOST_BASE_URL   (default http://localhost:8000)

Object-storage and CDN backends are future modes; this is the real, runnable one.
"""

import os
import re
import shutil
import uuid
from pathlib import Path
from urllib.parse import quote


def host_file(local_path: str, *, dest_dir: str | None = None,
              base_url: str | None = None, uid: str | None = None) -> str:
    dest_dir = dest_dir or os.environ.get("HOST_DIR", "data/hosted")
    base_url = (base_url or os.environ.get("HOST_BASE_URL", "http://localhost:8000")).rstrip("/")
    if uid:
        # normalize a custom uid to what serve's _UID_RE view-tracks
        # (lowercase alnum/dash, >=4, starts alnum) — a mismatched uid used to
        # host fine but silently never record views.
        uid = re.sub(r"[^0-9a-z-]", "-", uid.lower())
        if len(uid) < 4 or not re.match(r"^[0-9a-z]", uid):
            raise ValueError(f"uid must be >=4 chars of [a-z0-9-] starting alnum: {uid!r}")
    else:
        uid = uuid.uuid4().hex[:12]

    name = Path(local_path).name
    out_dir = Path(dest_dir) / uid
    out_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(local_path, out_dir / name)
    # percent-encode the filename: serve URL-decodes on the way in, and a raw
    # space/non-ASCII in an emailed URL breaks at the mail client anyway.
    return f"{base_url}/{uid}/{quote(name)}"
