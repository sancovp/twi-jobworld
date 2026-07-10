# JobWorld instance — buyer runbook

You bought a self-operating outreach instance. This box runs it 24/7 and
**auto-updates itself** from the vendor. You do not manage the agents — you watch
the readouts and escalate to the vendor if something breaks.

## What you got
- **The instance** — sources leads, writes copy, sends via your Instantly, tracks
  the funnel. It runs on YOUR Claude Max login and YOUR Instantly account.
- **Auto-update** — the vendor pushes improvements; your box pulls them within the
  hour, campaign state intact.

## One-time setup

1. **Docker** — install Docker Engine + compose v2 on this box
   (a small always-on Linux VPS; the vendor can supply one).
2. **Registry login** — the image is private. With the pull token the vendor gave you:
   ```bash
   echo "<GHCR_PULL_TOKEN>" | docker login ghcr.io -u <your-gh-username> --password-stdin
   ```
3. **Config**
   ```bash
   cp env.example .env               # set INSTANCE_NAME, JW_CLIENT, HOST_BASE_URL
   cp secrets.env.example secrets.env # paste your Instantly / (fal) keys
   ```
   `HOST_BASE_URL` = a domain or public IP pointing at THIS box on port 8000
   (the tracked links + the legal unsubscribe endpoint live there — it must never
   sleep; that's why it's a VPS, not a laptop).
4. **Claude Max login** (once): the instance uses your Claude subscription.
   ```bash
   docker compose --env-file .env run --rm instance claude login   # incognito window, your Max account
   ```
5. **Go**
   ```bash
   ./install.sh
   ```

## Running it
- **It self-operates.** Positive replies land in your Slack channel and Instantly
  Unibox for a human to answer; the instance only sends.
- **Operator dashboards** (loopback — tunnel in over SSH):
  ```bash
  ssh -L 8501:localhost:8501 -L 8787:localhost:8787 <box>
  # http://localhost:8787  ->  funnel / contacts / replies / gates
  # http://localhost:8501  ->  JobWorld dashboard
  ```
- **Health of the public link server:** `curl http://<box>:8000/health` -> `ok`.

## Updates
- **Automatic** — nothing to do; watchtower pulls new images hourly.
- **Now:** `./update.sh`. **Pause auto-update:** `docker rm -f <INSTANCE_NAME>-updater`.

## When something's wrong
Contact the vendor. Grab logs first: `docker logs <INSTANCE_NAME> --tail 100`.
You are not expected to debug the agents — that's the maintenance subscription.
