"""`video` — generate a teaser clip from a prompt, via a swappable backend.

Backend chosen by VIDEO_BACKEND (default "fal_kling"):

  fal_kling — BASELINE (the chosen tool). fal.ai's Kling text-to-video, queue API
              (submit → poll → fetch result url → download). Kling on fal ≈ $0.07-0.08/sec
              (~$0.4-0.8 per teaser) — ~2-3x the SPEC's ~3¢/sec estimate, but the clip is
              per-BRAND + amortized, so trivial vs deal value.
                FAL_KEY (required)  FAL_VIDEO_MODEL  FAL_VIDEO_DURATION
              NOTE: confirm the exact Kling model slug/tier on fal.ai before the
              first paid run (v1.6 / v2.1 / v2.5 / v3 × standard|pro).

  minimax   — alt/fallback. MiniMax (Hailuo) async video API. This was only ever
              wired because MiniMax creds were already present for the CEO model —
              it is NOT the chosen video tool, kept as a cheap fallback only.
                MINIMAX_API_KEY  MINIMAX_BASE_URL  MINIMAX_VIDEO_MODEL

External effect: a paid generation API call. The connector adds nothing and
judges nothing — the prompt is written upstream.
"""

import os
import sys
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


# ---- fal.ai Kling backend (BASELINE — matches the SPEC's ~3¢/sec anchor) ---

FAL_QUEUE = "https://queue.fal.run"


def _fal_headers() -> dict:
    return {"Authorization": f"Key {os.environ['FAL_KEY']}",
            "Content-Type": "application/json"}


def fal_kling_generate(prompt: str, out_path: str, *, model: str | None = None,
                       duration: str | None = None,
                       interval: float = 10.0, timeout: float = 1200.0) -> str:
    """Generate a clip via fal.ai's Kling text-to-video (queue API). Honors
    VIDEO_DRY_RUN=1 (prints the request, no call). Pick the model TIER to match
    budget; confirm the exact slug on fal.ai before the first paid run."""
    model = model or os.environ.get("FAL_VIDEO_MODEL",
                                    "fal-ai/kling-video/v2.1/standard/text-to-video")
    duration = str(duration or os.environ.get("FAL_VIDEO_DURATION", "10"))
    submit_url = f"{FAL_QUEUE}/{model}"
    body = {"prompt": prompt, "duration": duration}

    if os.environ.get("VIDEO_DRY_RUN") == "1":
        print(f"[dry-run] POST {submit_url}  body={body}  (Authorization: Key ***)",
              file=sys.stderr)
        return out_path

    sub = requests.post(submit_url, json=body, headers=_fal_headers(), timeout=60)
    sub.raise_for_status()
    j = sub.json()
    rid = j.get("request_id", "")
    status_url = j.get("status_url") or f"{submit_url}/requests/{rid}/status"
    response_url = j.get("response_url") or f"{submit_url}/requests/{rid}"

    waited = 0.0
    while waited < timeout:
        s = requests.get(status_url, headers=_fal_headers(), timeout=30)
        s.raise_for_status()
        status = s.json().get("status")
        if status == "COMPLETED":
            break
        if status in ("FAILED", "ERROR"):
            raise RuntimeError(f"fal kling job failed: {s.json()}")
        time.sleep(interval)
        waited += interval
    else:
        raise TimeoutError(f"fal kling job not done after {timeout}s")

    res = requests.get(response_url, headers=_fal_headers(), timeout=30)
    res.raise_for_status()
    out = res.json()
    url = (out.get("video") or {}).get("url") or out.get("url")
    if not url:
        raise RuntimeError(f"fal kling: no video url in response: {out}")
    data = requests.get(url, timeout=180)
    data.raise_for_status()
    with open(out_path, "wb") as f:
        f.write(data.content)
    return out_path


# ---- dispatcher -----------------------------------------------------------

def generate(prompt: str, out_path: str, model: str | None = None) -> str:
    """Route to VIDEO_BACKEND (default fal_kling; minimax kept as fallback)."""
    model = model or None
    backend = os.environ.get("VIDEO_BACKEND", "fal_kling").lower()
    if backend in ("fal", "fal_kling", "kling"):
        return fal_kling_generate(prompt, out_path, model=model)
    if backend == "minimax":
        return download(poll(create_job(prompt, model)), out_path)
    raise RuntimeError(f"unknown VIDEO_BACKEND: {backend!r} (use fal_kling | minimax)")
