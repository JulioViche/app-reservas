#!/usr/bin/env bash
set -euo pipefail

TIMEOUT="${TIMEOUT:-60}"
RETRIES="${RETRIES:-30}"
DELAY="${DELAY:-2}"

if [ "$#" -eq 0 ]; then
  echo "Uso: $0 <url1> [url2 ...]"
  echo "Espera a que cada URL responda con HTTP 2xx/3xx."
  exit 1
fi

failed=0

for url in "$@"; do
  echo "⏳ Esperando $url (timeout ${TIMEOUT}s) ..."
  if curl --silent --show-error --fail \
       --retry "$RETRIES" \
       --retry-delay "$DELAY" \
       --retry-connrefused \
       --retry-all-errors \
       --max-time "$TIMEOUT" \
       -o /dev/null \
       "$url"; then
    echo "✅ $url listo"
  else
    echo "❌ $url no responde tras ${TIMEOUT}s"
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "❌ Uno o más servicios no están listos"
  exit 1
fi

echo "✅ Todos los servicios listos"
