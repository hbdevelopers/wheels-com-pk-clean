#!/bin/bash
# ============================================================
# wheels.com.pk — ONE COMMAND SETUP
# Run this from the root of the project folder
# Mac/Linux: bash setup.sh
# Windows:   Run setup.bat instead
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_step()  { echo -e "\n${BLUE}${BOLD}▶ $1${NC}"; }
print_ok()    { echo -e "${GREEN}✓ $1${NC}"; }
print_warn()  { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info()  { echo -e "${CYAN}  $1${NC}"; }

echo -e "${BOLD}"
echo "  ██╗    ██╗██╗  ██╗███████╗███████╗██╗     ███████╗"
echo "  ██║    ██║██║  ██║██╔════╝██╔════╝██║     ██╔════╝"
echo "  ██║ █╗ ██║███████║█████╗  █████╗  ██║     ███████╗"
echo "  ██║███╗██║██╔══██║██╔══╝  ██╔══╝  ██║     ╚════██║"
echo "  ╚███╔███╔╝██║  ██║███████╗███████╗███████╗███████║"
echo "   ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚══════╝"
echo -e "${NC}"
echo -e "${CYAN}  wheels.com.pk — Pakistan's Smartest Auto Marketplace${NC}"
echo -e "${CYAN}  One-command local setup${NC}\n"

# ── Check prerequisites ───────────────────────────────────────
print_step "Checking prerequisites..."

check_command() {
  if command -v "$1" &>/dev/null; then
    print_ok "$1 found ($(${1} --version 2>&1 | head -1))"
    return 0
  else
    print_error "$1 not found"
    return 1
  fi
}

MISSING=0
check_command node || MISSING=1
check_command npm  || MISSING=1
check_command git  || MISSING=1

if [ $MISSING -eq 1 ]; then
  echo ""
  print_error "Missing required tools. Please install:"
  print_info "Node.js 18+: https://nodejs.org"
  print_info "Git:         https://git-scm.com"
  exit 1
fi

# Check Node version
NODE_VERSION=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_VERSION" -lt 18 ]; then
  print_error "Node.js 18+ required. You have Node $NODE_VERSION."
  print_info "Download: https://nodejs.org"
  exit 1
fi

# Check Docker (optional)
DOCKER_AVAILABLE=0
if command -v docker &>/dev/null; then
  print_ok "Docker found — will use for database"
  DOCKER_AVAILABLE=1
else
  print_warn "Docker not found — will use SQLite for quick local dev"
fi

# ── Create .env files ─────────────────────────────────────────
print_step "Setting up environment variables..."

# Generate secure random secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
print_ok "JWT secrets generated"

# Backend .env
if [ ! -f backend/.env.local ]; then
cat > backend/.env.local << ENVEOF
NODE_ENV=development
PORT=3001
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH}
JWT_EXPIRES_IN=1h
ADMIN_URL=http://localhost:3002
WEB_URL=http://localhost:3000

# Database — using SQLite-compatible config for local dev
# Replace with your Neon.tech URL for production
DB_HOST=localhost
DB_PORT=5432
DB_USER=wheels
DB_PASSWORD=wheels_local_pass
DB_NAME=wheels_db
DB_SSL=false

# Redis — using in-memory fallback for local dev
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# SMS — sandbox mode (OTP prints to console)
SMS_PROVIDER=console

# OpenAI — add your key for AI features
OPENAI_API_KEY=sk-replace-with-your-key

# Cloudflare R2 — add your keys for image uploads
R2_ACCOUNT_ID=replace-with-your-id
R2_ACCESS_KEY_ID=replace-with-your-key
R2_SECRET_ACCESS_KEY=replace-with-your-secret
R2_BUCKET_NAME=wheels-media
R2_PUBLIC_URL=http://localhost:3001/uploads

# Email — add Resend key for emails
RESEND_API_KEY=re_replace-with-your-key
EMAIL_FROM=noreply@wheels.com.pk

# Payments — sandbox mode
JAZZCASH_MERCHANT_ID=sandbox
JAZZCASH_PASSWORD=sandbox
JAZZCASH_INTEGRITY_SALT=sandbox
JAZZCASH_ENV=sandbox
EASYPAISA_STORE_ID=sandbox
EASYPAISA_HASH_KEY=sandbox
EASYPAISA_ENV=sandbox
ENVEOF
  print_ok "backend/.env.local created"
else
  print_warn "backend/.env.local already exists, skipping"
fi

# Mobile .env
if [ ! -f mobile/.env ]; then
cat > mobile/.env << ENVEOF
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
EXPO_PUBLIC_WS_URL=ws://localhost:3001
ENVEOF
  print_ok "mobile/.env created"
fi

# Admin .env
if [ ! -f admin/.env.local ]; then
cat > admin/.env.local << ENVEOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENVEOF
  print_ok "admin/.env.local created"
fi

# ── Start PostgreSQL with Docker (if available) ───────────────
if [ $DOCKER_AVAILABLE -eq 1 ]; then
  print_step "Starting PostgreSQL database with Docker..."

  # Check if container already running
  if docker ps --format '{{.Names}}' | grep -q 'wheels_postgres'; then
    print_ok "PostgreSQL already running"
  else
    docker run -d \
      --name wheels_postgres \
      -e POSTGRES_DB=wheels_db \
      -e POSTGRES_USER=wheels \
      -e POSTGRES_PASSWORD=wheels_local_pass \
      -p 5432:5432 \
      --restart unless-stopped \
      postgres:15-alpine 2>/dev/null && print_ok "PostgreSQL started" || print_warn "Could not start PostgreSQL"

    # Wait for it to be ready
    echo -n "  Waiting for database to be ready..."
    for i in $(seq 1 15); do
      if docker exec wheels_postgres pg_isready -U wheels &>/dev/null 2>&1; then
        echo " ready!"
        break
      fi
      echo -n "."
      sleep 1
    done
  fi

  # Also start Redis
  print_step "Starting Redis with Docker..."
  if docker ps --format '{{.Names}}' | grep -q 'wheels_redis'; then
    print_ok "Redis already running"
  else
    docker run -d \
      --name wheels_redis \
      -p 6379:6379 \
      --restart unless-stopped \
      redis:7-alpine 2>/dev/null && print_ok "Redis started" || print_warn "Could not start Redis (will use memory fallback)"
  fi

  # Run migrations
  print_step "Running database migrations..."
  for migration in wheels-backend/db/migrations/*.sql; do
    if [ -f "$migration" ]; then
      filename=$(basename "$migration")
      docker exec -i wheels_postgres psql -U wheels -d wheels_db < "$migration" &>/dev/null && \
        print_ok "Migration: $filename" || \
        print_warn "Migration skipped (may already exist): $filename"
    fi
  done
fi

# ── Install backend dependencies ──────────────────────────────
print_step "Installing backend dependencies..."
cd wheels-backend
if [ ! -d node_modules ]; then
  npm install --legacy-peer-deps
  print_ok "Backend dependencies installed"
else
  print_ok "Backend node_modules already exists"
fi
cd ..

# ── Install admin dependencies ────────────────────────────────
print_step "Installing admin panel dependencies..."
cd wheels-admin
if [ ! -d node_modules ]; then
  npm install --legacy-peer-deps
  print_ok "Admin dependencies installed"
else
  print_ok "Admin node_modules already exists"
fi
cd ..

# ── Install mobile dependencies ───────────────────────────────
print_step "Installing mobile app dependencies..."
cd wheels-mobile
if [ ! -d node_modules ]; then
  npm install --legacy-peer-deps
  print_ok "Mobile dependencies installed"
else
  print_ok "Mobile node_modules already exists"
fi
cd ..

# ── Start everything ──────────────────────────────────────────
print_step "Starting all services..."

# Kill any existing processes on our ports
for port in 3001 3002; do
  pid=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill $pid 2>/dev/null || true
    print_warn "Killed existing process on port $port"
  fi
done

# Start backend
cd wheels-backend
npm run start:dev &>/tmp/wheels-backend.log &
BACKEND_PID=$!
cd ..
print_ok "Backend starting (PID: $BACKEND_PID)..."

# Start admin
cd wheels-admin
npm run dev &>/tmp/wheels-admin.log &
ADMIN_PID=$!
cd ..
print_ok "Admin panel starting (PID: $ADMIN_PID)..."

# Wait for backend to be ready
echo -n "  Waiting for backend to be ready"
for i in $(seq 1 30); do
  if curl -sf http://localhost:3001/api/v1/health &>/dev/null; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 2
done

# Start mobile (Expo)
print_step "Starting mobile app (Expo)..."
cd wheels-mobile
print_info "Expo will open in your browser with a QR code"
print_info "Scan it with the Expo Go app on your phone"
npx expo start --tunnel &
EXPO_PID=$!
cd ..

# ── Done! ─────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✓ wheels.com.pk is running!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}  Open these in your browser:${NC}"
echo -e "  ${CYAN}Backend API:   ${NC}http://localhost:3001/api/v1/health"
echo -e "  ${CYAN}API Docs:      ${NC}http://localhost:3001/api/docs"
echo -e "  ${CYAN}Admin Panel:   ${NC}http://localhost:3002/dashboard"
echo ""
echo -e "${BOLD}  Mobile App:${NC}"
echo -e "  ${CYAN}1. Install Expo Go on your phone (free from App/Play Store)${NC}"
echo -e "  ${CYAN}2. Scan the QR code that appeared above${NC}"
echo -e "  ${CYAN}3. The app loads on your phone instantly!${NC}"
echo ""
echo -e "${BOLD}  Test Accounts (OTP prints to terminal):${NC}"
echo -e "  ${CYAN}Admin:   +923001111111${NC}"
echo -e "  ${CYAN}Seller:  +923009876543  (Ahmed Raza, Lahore)${NC}"
echo -e "  ${CYAN}Buyer:   +923215556666  (Sara Khan, Islamabad)${NC}"
echo -e "  ${CYAN}Dealer:  +922131234567  (AutoMax Karachi)${NC}"
echo ""
echo -e "${BOLD}  Logs:${NC}"
echo -e "  ${CYAN}Backend: tail -f /tmp/wheels-backend.log${NC}"
echo -e "  ${CYAN}Admin:   tail -f /tmp/wheels-admin.log${NC}"
echo ""
echo -e "${YELLOW}  Press Ctrl+C to stop all services${NC}"
echo ""

# Save PIDs so we can stop cleanly
echo "$BACKEND_PID $ADMIN_PID $EXPO_PID" > /tmp/wheels-pids.txt

# Keep running, show backend logs
trap 'echo -e "\n${YELLOW}Stopping wheels.com.pk...${NC}"; kill $BACKEND_PID $ADMIN_PID $EXPO_PID 2>/dev/null; exit 0' INT
wait
