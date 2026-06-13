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
import shutil
import uuid
from pathlib import Path


def host_file(local_path: str, *, dest_dir: str | None = None,
              base_url: str | None = None, uid: str | None = None) -> str:
    dest_dir = dest_dir or os.environ.get("HOST_DIR", "data/hosted")
    base_url = (base_url or os.environ.get("HOST_BASE_URL", "http://localhost:8000")).rstrip("/")
    uid = uid or uuid.uuid4().hex[:12]

    name = Path(local_path).name
    out_dir = Path(dest_dir) / uid
    out_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(local_path, out_dir / name)
    return f"{base_url}/{uid}/{name}"
