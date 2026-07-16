#!/usr/bin/env bash
set -e

GITHUB_API="https://api.github.com"
REPO_PATH=$(echo "${RUNNER_REPO:-${GITHUB_REPOSITORY:-}}" | sed 's|https://github.com/||; s|/$||')
RUNNER_NAME="${RUNNER_NAME:-app-reservas-runner}"
RUNNER_LABELS_CSV="${RUNNER_LABELS:-self-hosted,app-reservas}"
RUNNER_STATE_DIR="/home/runner/_state"
RUNNER_WORKDIR="${RUNNER_WORKDIR:-/_work}"

log() { echo "[runner-entrypoint] $*"; }

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "ERROR: required tool '$1' not found in image"
    exit 1
  fi
}

require_tool curl
require_tool /home/runner/config.sh
require_tool /home/runner/run.sh

ensure_docker_compose_plugin() {
  local plugin_path="/home/runner/.docker/cli-plugins/docker-compose"
  if docker compose version >/dev/null 2>&1; then
    log "docker compose plugin already available"
    return 0
  fi
  log "Installing docker compose plugin..."
  mkdir -p "$(dirname "$plugin_path")"
  curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o "$plugin_path"
  chmod +x "$plugin_path"
  docker compose version >/dev/null 2>&1 \
    && log "docker compose plugin installed" \
    || { log "ERROR: failed to install docker compose plugin"; exit 1; }
}

ensure_packages() {
  local pkgs=()
  command -v dirmngr >/dev/null 2>&1 || pkgs+=(dirmngr)
  command -v jq >/dev/null 2>&1 || pkgs+=(jq)
  command -v node >/dev/null 2>&1 || pkgs+=(nodejs)
  command -v npm >/dev/null 2>&1 || pkgs+=(npm)
  [ ${#pkgs[@]} -eq 0 ] && { log "All packages already available"; return 0; }
  log "Installing packages: ${pkgs[*]}..."
  sudo mkdir -p /var/lib/apt/lists/partial && sudo apt-get update -qq && sudo apt-get install -y -qq "${pkgs[@]}" 2>&1 | tail -3
}

ensure_docker_compose_plugin
ensure_packages
require_tool jq

if [ -z "${GITHUB_TOKEN:-}" ]; then
  log "ERROR: GITHUB_TOKEN (PAT) is required"
  exit 1
fi

if [ -z "$REPO_PATH" ]; then
  log "ERROR: RUNNER_REPO or GITHUB_REPOSITORY must be set"
  exit 1
fi

sudo chmod 777 /home/runner/_work 2>/dev/null || true
cd "$RUNNER_STATE_DIR"

register() {
  log "Requesting fresh registration token for $REPO_PATH ..."
  TOKEN_JSON=$(curl -sS -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "${GITHUB_API}/repos/${REPO_PATH}/actions/runners/registration-token")
  RUNNER_TOKEN=$(echo "$TOKEN_JSON" | jq -r .token)
  if [ -z "$RUNNER_TOKEN" ] || [ "$RUNNER_TOKEN" = "null" ]; then
    log "ERROR: could not get registration token. Response: $TOKEN_JSON"
    exit 1
  fi
  log "Configuring runner '$RUNNER_NAME' with labels: $RUNNER_LABELS_CSV"
  /home/runner/config.sh \
    --unattended \
    --replace \
    --url "https://github.com/${REPO_PATH}" \
    --token "$RUNNER_TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$RUNNER_LABELS_CSV" \
    --work "$RUNNER_WORKDIR"
  cp /home/runner/.runner /home/runner/.credentials "$RUNNER_STATE_DIR/" 2>/dev/null || true
  ln -sf /home/runner/.runner "$RUNNER_STATE_DIR/.runner" 2>/dev/null || true
  ln -sf /home/runner/.credentials "$RUNNER_STATE_DIR/.credentials" 2>/dev/null || true
}

if [ -f .runner ] && [ -f /home/runner/.runner ]; then
  log "Existing runner config found, attempting to reuse..."
else
  log "Cleaning any stale runner config before fresh registration..."
  /home/runner/config.sh remove 2>/dev/null || true
  rm -f .runner .credentials /home/runner/.runner /home/runner/.credentials \
       /home/runner/_state/.runner /home/runner/_state/.credentials 2>/dev/null || true
  register
fi

trap 'log "Caught signal - stopping run.sh (NOT deregistering)"; kill -TERM $RUNNER_PID 2>/dev/null || true' TERM INT

while true; do
  log "Starting runner process..."
  /home/runner/run.sh &
  RUNNER_PID=$!
  wait $RUNNER_PID || true
  EXIT_CODE=$?
  log "Runner exited with code $EXIT_CODE. Restarting in 5s (preserving registration)..."
  sleep 5
done
