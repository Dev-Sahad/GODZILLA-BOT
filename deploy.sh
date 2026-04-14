#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#   🦖 GODZILLA Bot — Railway Deploy Script
#   by Sxhd
#   Usage: bash deploy.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Banner ────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${CYAN}${BOLD}   🦖  GODZILLA Bot — Railway Auto Deploy       ${RESET}"
echo -e "${CYAN}${BOLD}   by Sxhd                                      ${RESET}"
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# ── Check Railway CLI ─────────────────────────────
echo -e "${YELLOW}[1/7] Checking Railway CLI...${RESET}"
if ! command -v railway &> /dev/null; then
  echo -e "${RED}❌ Railway CLI not found!${RESET}"
  echo -e "${YELLOW}Installing Railway CLI...${RESET}"
  npm install -g @railway/cli
  if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Installation failed. Run manually: npm install -g @railway/cli${RESET}"
    exit 1
  fi
fi
echo -e "${GREEN}✅ Railway CLI found: $(railway --version)${RESET}"

# ── Check Node.js ─────────────────────────────────
echo ""
echo -e "${YELLOW}[2/7] Checking Node.js...${RESET}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found! Install from nodejs.org${RESET}"
  exit 1
fi
NODE_VER=$(node --version)
echo -e "${GREEN}✅ Node.js: $NODE_VER${RESET}"

# ── Check .env file ───────────────────────────────
echo ""
echo -e "${YELLOW}[3/7] Reading .env file...${RESET}"
if [ ! -f ".env" ]; then
  echo -e "${RED}❌ .env file not found!${RESET}"
  echo -e "${YELLOW}Creating .env from .env.example...${RESET}"
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please fill in your .env file first, then run this script again.${RESET}"
    echo -e "${YELLOW}   Open .env and set: OWNER_NUMBER, ANTHROPIC_API_KEY, GODZILLA_SESSION${RESET}"
    exit 1
  else
    echo -e "${RED}❌ .env.example also missing. Something is wrong.${RESET}"
    exit 1
  fi
fi
echo -e "${GREEN}✅ .env file found${RESET}"

# ── Check GODZILLA_SESSION ────────────────────────
echo ""
echo -e "${YELLOW}[4/7] Checking session...${RESET}"
SESSION=$(grep "^GODZILLA_SESSION=" .env | cut -d'=' -f2-)

if [ -z "$SESSION" ] || [ "$SESSION" = "your_session_string" ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${RED}⚠️  GODZILLA_SESSION is empty!${RESET}"
  echo -e "${YELLOW}You need to generate a session first:${RESET}"
  echo ""
  echo -e "   ${BOLD}Step 1:${RESET} Run the bot locally:"
  echo -e "   ${CYAN}npm run bot${RESET}"
  echo ""
  echo -e "   ${BOLD}Step 2:${RESET} Scan the QR code with WhatsApp"
  echo ""
  echo -e "   ${BOLD}Step 3:${RESET} Export the session:"
  echo -e "   ${CYAN}npm run session${RESET}"
  echo ""
  echo -e "   ${BOLD}Step 4:${RESET} Copy the base64 string into .env:"
  echo -e "   ${CYAN}GODZILLA_SESSION=<paste here>${RESET}"
  echo ""
  echo -e "   ${BOLD}Step 5:${RESET} Run this script again:"
  echo -e "   ${CYAN}bash deploy.sh${RESET}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  exit 1
fi
echo -e "${GREEN}✅ Session found (${#SESSION} chars)${RESET}"

# ── Railway Login check ───────────────────────────
echo ""
echo -e "${YELLOW}[5/7] Checking Railway login...${RESET}"
railway whoami &> /dev/null
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}Not logged in. Opening browser for login...${RESET}"
  railway login
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Login failed. Try: railway login${RESET}"
    exit 1
  fi
fi
echo -e "${GREEN}✅ Logged in to Railway${RESET}"

# ── Init or link project ──────────────────────────
echo ""
echo -e "${YELLOW}[6/7] Setting up Railway project...${RESET}"

if [ ! -f ".railway" ] && [ ! -d ".railway" ]; then
  echo -e "${YELLOW}Initializing new Railway project...${RESET}"
  railway init --name godzilla-bot
else
  echo -e "${GREEN}✅ Railway project already linked${RESET}"
fi

# ── Push all env variables ────────────────────────
echo ""
echo -e "${YELLOW}Pushing environment variables to Railway...${RESET}"
echo ""

push_var() {
  local KEY=$1
  local VALUE=$2
  if [ -n "$VALUE" ] && [ "$VALUE" != "your_${KEY,,}_here" ]; then
    railway variables set "$KEY=$VALUE" --silent 2>/dev/null \
      && echo -e "   ${GREEN}✅ $KEY${RESET}" \
      || echo -e "   ${YELLOW}⚠️  $KEY (skipped)${RESET}"
  else
    echo -e "   ${YELLOW}⏭️  $KEY (empty, skipped)${RESET}"
  fi
}

# Read each variable from .env and push
while IFS='=' read -r KEY VALUE; do
  # Skip comments and empty lines
  [[ "$KEY" =~ ^#.*$ ]] && continue
  [[ -z "$KEY" ]] && continue
  # Trim whitespace
  KEY=$(echo "$KEY" | xargs)
  VALUE=$(echo "$VALUE" | xargs)
  push_var "$KEY" "$VALUE"
done < .env

echo ""
echo -e "${GREEN}✅ All variables pushed!${RESET}"

# ── Deploy ────────────────────────────────────────
echo ""
echo -e "${YELLOW}[7/7] Deploying GODZILLA to Railway...${RESET}"
echo ""
railway up --detach

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${GREEN}${BOLD}   🦖 GODZILLA is now LIVE on Railway! 24/7 ✅  ${RESET}"
  echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  echo -e "${CYAN}Useful commands:${RESET}"
  echo -e "   ${BOLD}railway logs${RESET}             — View live logs"
  echo -e "   ${BOLD}railway open${RESET}             — Open dashboard"
  echo -e "   ${BOLD}railway status${RESET}           — Check status"
  echo -e "   ${BOLD}railway up --detach${RESET}      — Redeploy after changes"
  echo -e "   ${BOLD}railway service restart${RESET}  — Restart bot"
  echo ""
else
  echo ""
  echo -e "${RED}❌ Deployment failed!${RESET}"
  echo -e "${YELLOW}Try manually: railway up${RESET}"
  echo -e "${YELLOW}Check logs:   railway logs${RESET}"
  exit 1
fi
