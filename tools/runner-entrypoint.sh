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
require_tool jq
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

ensure_dirmngr() {
  if command -v dirmngr >/dev/null 2>&1; then
    log "dirmngr already available"
    return 0
  fi
  log "Installing dirmngr (needed for SonarQube GPG verification)..."
  sudo mkdir -p /var/lib/apt/lists/partial && sudo apt-get update -qq && sudo apt-get install -y -qq dirmngr 2>&1 | tail -3
  if command -v dirmngr >/dev/null 2>&1; then
    log "dirmngr installed"
  else
    log "WARNING: could not install dirmngr - SonarQube scan may fail"
  fi
}

ensure_docker_compose_plugin
ensure_dirmngr

if [ -z "${GITHUB_TOKEN:-}" ]; then
  log "ERROR: GITHUB_TOKEN (PAT) is required"
  exit 1
fi

if [ -z "$REPO_PATH" ]; then
  log "ERROR: RUNNER_REPO or GITHUB_REPOSITORY must be set"
  exit 1
fi

sudo mkdir -p /home/runner/_work/_tool /home/runner/_work/_temp 2>/dev/null && sudo chmod 777 /home/runner/_work/_tool /home/runner/_work/_temp || true
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
}

if [ -f .runner ]; then
  log "Existing runner config found, attempting to reuse..."
else
  register
fi

trap 'log "Caught signal - stopping run.sh (NOT deregistering)"; kill -TERM $RUNNER_PID 2>/dev/null || true; exit 0' TERM INT

while true; do
  log "Starting runner process..."
  /home/runner/run.sh &
  RUNNER_PID=$!
  wait $RUNNER_PID
  EXIT_CODE=$?
  log "Runner exited with code $EXIT_CODE. Restarting in 5s (preserving registration)..."
  sleep 5
done
