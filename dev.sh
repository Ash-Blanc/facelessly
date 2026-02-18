#!/usr/bin/env bash
# ─── Faceless Video Factory — dev launcher ───
# Kills any existing servers on :3000 and :8000, then starts both.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
DIM='\033[2m'
RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}⚡ Faceless Video Factory — Dev Mode${RESET}\n"

# ─── Kill existing processes ──────────────────
kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "${RED}✖ Killing processes on port $port${RESET} ${DIM}(PIDs: $pids)${RESET}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 0.5
  else
    echo -e "${DIM}  Port $port is free${RESET}"
  fi
}

echo -e "${DIM}Checking ports...${RESET}"
kill_port 3000
kill_port 8000
echo ""

# ─── Start Backend ────────────────────────────
echo -e "${GREEN}▶ Starting Backend${RESET} ${DIM}(http://localhost:8000)${RESET}"
cd "$ROOT_DIR/BE"
uv run -m src.faceless.main &
BE_PID=$!

# ─── Start Frontend ───────────────────────────
echo -e "${GREEN}▶ Starting Frontend${RESET} ${DIM}(http://localhost:3000)${RESET}"
cd "$ROOT_DIR/FE"
bun dev &
FE_PID=$!

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}  Frontend${RESET}  → http://localhost:3000"
echo -e "${GREEN}  Backend ${RESET}  → http://localhost:8000"
echo -e "${GREEN}  API Docs${RESET}  → http://localhost:8000/docs"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${DIM}  Press Ctrl+C to stop both servers${RESET}"
echo ""

# ─── Trap Ctrl+C to kill both ─────────────────
cleanup() {
  echo -e "\n${RED}Shutting down...${RESET}"
  kill $BE_PID $FE_PID 2>/dev/null || true
  wait $BE_PID $FE_PID 2>/dev/null || true
  echo -e "${DIM}Done.${RESET}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for either to exit
wait -n $BE_PID $FE_PID 2>/dev/null || true
cleanup
