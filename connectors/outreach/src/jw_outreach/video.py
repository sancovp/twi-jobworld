"""`video` — generate a clip from a prompt via an external model.

External effect: a paid generation API call (create job, poll, download file).
Implemented against the MiniMax video API because the project already has
MINIMAX creds; the base URL and model are env-configurable so another provider
slots in without touching callers.

I have NOT verified MiniMax's exact video endpoint paths / field names against
their current docs — the request/poll/retrieve shape below follows their
documented async-job pattern, but confirm endpoint names before the first paid
generation (same caution Apollo gets in source.py).
    MINIMAX_API_KEY   (required)
    MINIMAX_BASE_URL  (default https://api.minimax.io)
    MINIMAX_VIDEO_MODEL (default MiniMax-Hailuo-02)
"""

import os
import time

import requests


def _base() -> str:
    return os.environ.get("MINIMAX_BASE_URL", "https://api.minimax.io").rstrip("/")


def _headers() -> dict:
    return {"Authorization": f"Bearer {os.environ['MINIMAX_API_KEY']}",
            "Content-Type": "application/json"}


def create_job(prompt: str, model: str | None = None) -> str:
    model = model or os.environ.get("MINIMAX_VIDEO_MODEL", "MiniMax-Hailuo-02")
    body = {
        "model": model,
        "prompt": prompt,
        # Hailuo-02 supports 6 or 10s; a ~9s teaser → 10. Env-overridable.
        "duration": int(os.environ.get("MINIMAX_VIDEO_DURATION", "6")),
        "resolution": os.environ.get("MINIMAX_VIDEO_RESOLUTION", "1080P"),
    }
    resp = requests.post(f"{_base()}/v1/video_generation",
                         json=body, headers=_headers(), timeout=60)
    resp.raise_for_status()
    j = resp.json()
    _check_base_resp(j, "create")
    task_id = j.get("task_id")
    if not task_id:
        raise RuntimeError(f"minimax create returned no task_id: {j}")
    return task_id


def _check_base_resp(j: dict, where: str) -> None:
    """MiniMax returns HTTP 200 with base_resp.status_code != 0 for auth /
    credit / rate-limit / content errors. Surface those plainly instead of
    KeyError-ing on the missing task_id/status."""
    br = j.get("base_resp") or {}
    code = br.get("status_code", 0)
    if code:
        raise RuntimeError(f"minimax {where} failed: {code} {br.get('status_msg', '')}")


def poll(task_id: str, *, interval: float = 10.0, timeout: float = 1200.0) -> str:
    """Poll until the job is done; return the file_id."""
    waited = 0.0
    while waited < timeout:
        resp = requests.get(f"{_base()}/v1/query/video_generation",
                            params={"task_id": task_id}, headers=_headers(), timeout=30)
        resp.raise_for_status()
        body = resp.json()
        _check_base_resp(body, "poll")
        status = body.get("status")
        if status == "Success":
            return body["file_id"]
        if status in ("Fail", "Unknown"):
            raise RuntimeError(f"video job {task_id} ended: {status}")
        time.sleep(interval)
        waited += interval
    raise TimeoutError(f"video job {task_id} not done after {timeout}s")


def download(file_id: str, out_path: str) -> str:
    meta = requests.get(f"{_base()}/v1/files/retrieve",
                        params={"file_id": file_id}, headers=_headers(), timeout=30)
    meta.raise_for_status()
    url = meta.json()["file"]["download_url"]
    data = requests.get(url, timeout=120)
    data.raise_for_status()
    with open(out_path, "wb") as f:
        f.write(data.content)
    return out_path


def generate(prompt: str, out_path: str, model: str | None = None) -> str:
    return download(poll(create_job(prompt, model)), out_path)
