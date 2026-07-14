#!/usr/bin/env bash
set -euo pipefail

TIMEOUT="${TIMEOUT:-60}"
RETRIES="${RETRIES:-30}"
DELAY="${DELAY:-2}"

if [ "$#" -eq 0 ]; then
  echo "Uso: $0 <url1> [url2 ...]"
  echo "Espera a que TODAS las URLs respondan con HTTP 2xx/3xx (en paralelo)."
  exit 1
fi

pids=()
results_dir=$(mktemp -d)
trap 'rm -rf "$results_dir"' EXIT

for url in "$@"; do
  (
    if curl --silent --show-error --fail \
         --retry "$RETRIES" \
         --retry-delay "$DELAY" \
         --retry-connrefused \
         --retry-all-errors \
         --max-time "$TIMEOUT" \
         -o /dev/null \
         "$url"; then
      echo "ok" > "$results_dir/$url"
      echo "✅ $url listo"
    else
      echo "fail" > "$results_dir/$url"
      echo "❌ $url no responde tras ${TIMEOUT}s"
    fi
  ) &
  pids+=($!)
done

for pid in "${pids[@]}"; do
  wait "$pid" || true
done

failed=0
for url in "$@"; do
  if [ ! -f "$results_dir/$url" ] || [ "$(cat "$results_dir/$url")" = "fail" ]; then
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "❌ Uno o más servicios no están listos"
  exit 1
fi

echo "✅ Todos los servicios listos"
