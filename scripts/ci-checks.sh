#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${backend_pid:-}" ]]; then
    kill "${backend_pid}" >/dev/null 2>&1 || true
  fi
}

wait_for_backend() {
  local attempt

  for attempt in {1..20}; do
    if curl --silent --fail http://127.0.0.1:4000/api/health >/dev/null; then
      return 0
    fi
    sleep 1
  done

  echo "Backend health endpoint did not become ready in time."
  return 1
}

trap cleanup EXIT

npm run lint
npm run backend:db:migrate

node backend/server.js >/tmp/payvaylt-backend.log 2>&1 &
backend_pid=$!

wait_for_backend

echo "CI checks passed."
