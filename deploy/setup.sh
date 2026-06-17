#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "╔═══════════════════════════════════════════════════╗"
echo "║     🚀 Ritam Bharat POS — One-Click Deploy       ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Install Docker ──
if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}[1/6] Installing Docker...${NC}"
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo -e "${GREEN}  ✅ Docker installed${NC}"
else
  echo -e "${GREEN}[1/6] Docker already installed${NC}"
fi

# ── Step 2: Install Docker Compose ──
if ! docker compose version &>/dev/null; then
  echo -e "${YELLOW}[2/6] Installing Docker Compose...${NC}"
  sudo apt-get update -qq && sudo apt-get install -y -qq docker-compose-plugin
  echo -e "${GREEN}  ✅ Docker Compose installed${NC}"
else
  echo -e "${GREEN}[2/6] Docker Compose already installed${NC}"
fi

# ── Step 3: Clone / Pull Repo ──
REPO_DIR="/opt/ritambharat-pos"
if [ ! -d "$REPO_DIR" ]; then
  echo -e "${YELLOW}[3/6] Cloning repository...${NC}"
  sudo mkdir -p "$REPO_DIR"
  sudo git clone https://github.com/mayankmishra0403/ritambharat-os.git "$REPO_DIR"
  sudo chown -R "$USER:$USER" "$REPO_DIR"
  echo -e "${GREEN}  ✅ Repository cloned${NC}"
else
  echo -e "${YELLOW}[3/6] Updating repository...${NC}"
  cd "$REPO_DIR" && git pull origin main
  echo -e "${GREEN}  ✅ Repository updated${NC}"
fi

cd "$REPO_DIR"

# ── Step 4: Setup Environment ──
echo -e "${YELLOW}[4/6] Setting up environment...${NC}"
if [ ! -f docker/.env ]; then
  AUTH_SECRET=$(openssl rand -hex 32)
  API_KEY=$(openssl rand -hex 32)
  cat > docker/.env << EOF
DATABASE_URL="postgresql://qrdine:qrdine@postgres:5432/qrdine?schema=public"
REDIS_URL="redis://redis:6379"
AUTH_SECRET="${AUTH_SECRET}"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EVOLUTION_API_URL="http://evolution_api:8080"
EVOLUTION_API_KEY="${API_KEY}"
EVOLUTION_INSTANCE_NAME="ritam-bharat-pos"
EOF
  echo -e "${GREEN}  ✅ docker/.env created with secure keys${NC}"
else
  echo -e "${GREEN}  ✅ docker/.env already exists${NC}"
fi

# ── Step 5: Start Services ──
echo -e "${YELLOW}[5/6] Building and starting all services...${NC}"
docker compose -f docker/docker-compose.yml up -d --build 2>&1 | tail -3
echo -e "${GREEN}  ✅ Services started${NC}"

# ── Step 6: Initialize Database ──
echo -e "${YELLOW}[6/6] Initializing database...${NC}"
echo "  Waiting for database to be ready..."
sleep 15

# Push schema
docker compose -f docker/docker-compose.yml exec -T app \
  sh -c 'cd /tmp && PRISMA_SCHEMA_ENGINE_BINARY="/tmp/node_modules/@prisma/engines/schema-engine-linux-musl-arm64-openssl-3.0.x" DATABASE_URL="postgresql://qrdine:qrdine@postgres:5432/qrdine?schema=public" npx prisma db push --accept-data-loss --schema=/app/prisma/schema.prisma --skip-generate 2>/dev/null' || true

# Check if already seeded
SEEDED=$(docker compose -f docker/docker-compose.yml exec -T postgres sh -c 'psql -U qrdine -d qrdine -t -c "SELECT count(*) FROM \"User\";"' 2>/dev/null | tr -d ' ')
if [ "$SEEDED" != "0" ] && [ -n "$SEEDED" ]; then
  echo -e "${GREEN}  ✅ Database already seeded ($SEEDED users)${NC}"
else
  echo "  Seeding database..."
  docker compose -f docker/docker-compose.yml exec -T app sh -c '
    cat > /tmp/seed-quick.mjs << "ENDSCRIPT"
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const p = new PrismaClient();
try {
  const rest = await p.restaurant.create({
    data: { name: "Ritam Bharat", slug: "ritam-bharat", address: "Your Restaurant Address", phone: "+919999999999", currency: "INR", gstin: "22AAAAA0000A1Z5", pan: "AAAAA0000A" }
  });
  const hash = await bcrypt.hash("Admin@2006", 10);
  await p.user.createMany({ data: [
    { email: "admin@rb.com", passwordHash: hash, name: "Admin", role: "owner", pin: "2006", restaurantId: rest.id },
    { email: "cashier@rb.com", passwordHash: hash, name: "Cashier", role: "cashier", pin: "5678", restaurantId: rest.id },
    { email: "kitchen@rb.com", passwordHash: hash, name: "Kitchen Staff", role: "kitchen", pin: "9012", restaurantId: rest.id },
    { email: "waiter@rb.com", passwordHash: hash, name: "Waiter", role: "waiter", pin: "3456", restaurantId: rest.id },
  ]});
  for (let i = 1; i <= 5; i++) { await p.table.create({ data: { tableNumber: i, capacity: [2,4,4,6,2][i-1], restaurantId: rest.id } }); }
  const slabs = [
    { name: "GST 5%", rate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, isDefault: false },
    { name: "GST 12%", rate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12, isDefault: false },
    { name: "GST 18%", rate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, isDefault: true },
    { name: "GST 28%", rate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28, isDefault: false },
    { name: "No GST", rate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0, isDefault: false },
  ];
  for (const s of slabs) { await p.taxSlab.create({ data: { ...s, restaurantId: rest.id } }); }
  await p.whatsAppConfig.create({ data: { restaurantId: rest.id, isConnected: false } });
  console.log("SEEDED");
} finally { await p.\$disconnect(); }
ENDSCRIPT
    cd /tmp && node seed-quick.mjs 2>/dev/null
  '
  echo -e "${GREEN}  ✅ Database seeded${NC}"
fi

# ── Done ──
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}✅ Ritam Bharat POS is LIVE!${NC}                ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "  🌐 Direct IP:  http://${SERVER_IP}:3000"
echo "  🔐 Login:      admin@rb.com / Admin@2006 (PIN: 2006)"
echo ""
echo "  📋 Admin Panel:       http://${SERVER_IP}:3000/admin"
echo "  🧑‍🍳 Kitchen Display:  http://${SERVER_IP}:3000/kitchen"
echo "  📱 Waiter App:        http://${SERVER_IP}:3000/waiter-app"
echo "  📦 Takeaway:          http://${SERVER_IP}:3000/admin/takeaway"
echo ""
echo "  💡 To assign a domain:"
echo "     Point A record → ${SERVER_IP}"
echo "     Then update NEXT_PUBLIC_APP_URL in docker/.env"
echo ""
echo "  📖 Logs: docker compose -f docker/docker-compose.yml logs -f"
echo ""
