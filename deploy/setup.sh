#!/bin/bash
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo "╔═══════════════════════════════════════════════════╗"
echo "║     🚀 Ritam Bharat POS — One-Click Deploy       ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

REPO_URL="https://github.com/mayankmishra0403/qrdine.git"
REPO_DIR="/opt/ritambharat-pos"

# ── 1. Install Docker ──
if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}[1/6] Installing Docker...${NC}"
  curl -fsSL https://get.docker.com | sh
  echo -e "${GREEN}  ✅ Docker installed${NC}"
  echo -e "${YELLOW}  ⚠️  Re-login or run: newgrp docker${NC}"
fi

# ── 2. Docker Compose ──
if ! docker compose version &>/dev/null; then
  echo -e "${YELLOW}[2/6] Installing Docker Compose...${NC}"
  apt-get update -qq && apt-get install -y -qq docker-compose-plugin 2>/dev/null || true
fi
echo -e "${GREEN}[2/6] Docker ready${NC}"

# ── 3. Clone Repo ──
echo -e "${YELLOW}[3/6] Setting up repository...${NC}"
if [ ! -d "$REPO_DIR" ]; then
  mkdir -p "$REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
else
  cd "$REPO_DIR" && git pull origin main 2>/dev/null || true
fi
cd "$REPO_DIR"
echo -e "${GREEN}  ✅ Repository ready at $REPO_DIR${NC}"

# ── 4. .env ──
echo -e "${YELLOW}[4/6] Configuring environment...${NC}"
mkdir -p docker
if [ ! -f docker/.env ]; then
  cat > docker/.env << EOF
DATABASE_URL="postgresql://qrdine:qrdine@postgres:5432/qrdine?schema=public"
REDIS_URL="redis://redis:6379"
AUTH_SECRET="$(openssl rand -hex 32)"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EVOLUTION_API_URL="http://evolution_api:8080"
EVOLUTION_API_KEY="$(openssl rand -hex 32)"
EVOLUTION_INSTANCE_NAME="ritam-bharat-pos"
EOF
  echo -e "${GREEN}  ✅ docker/.env created${NC}"
else
  echo -e "${GREEN}  ✅ docker/.env exists${NC}"
fi

# ── 5. Start Services ──
echo -e "${YELLOW}[5/6] Starting services (this takes 5-10 mins first time)...${NC}"
docker compose -f docker/docker-compose.yml up -d --build 2>&1 | tail -2
echo -e "${GREEN}  ✅ Services started${NC}"

# ── 6. Database ──
echo -e "${YELLOW}[6/6] Initializing database...${NC}"
echo "  Waiting for services to be ready..."
sleep 20

# Push schema using psql
docker compose -f docker/docker-compose.yml exec -T postgres sh -c 'psql -U qrdine -d qrdine' << 'SQL' 2>/dev/null || true
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "gstCategory" TEXT DEFAULT 'unregistered';
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "hsnCode" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "taxSlabId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "cgstAmount" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sgstAmount" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "igstAmount" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "amountInWords" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Order" ALTER COLUMN "tableId" DROP NOT NULL;
ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS shape TEXT DEFAULT 'circle';
ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "posX" INTEGER;
ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "posY" INTEGER;
ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "roomId" TEXT;
SQL

# Seed
docker compose -f docker/docker-compose.yml exec -T app sh -c '
  cat > /tmp/seed.mjs << "ENDSCRIPT"
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const p = new PrismaClient();
try {
  const existing = await p.restaurant.findFirst();
  if (existing) { console.log("ALREADY_SEEDED"); process.exit(0); }
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
    { name: "GST 5%", rate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5 },
    { name: "GST 12%", rate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12 },
    { name: "GST 18%", rate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, isDefault: true },
    { name: "GST 28%", rate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28 },
    { name: "No GST", rate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0 },
  ];
  for (const s of slabs) { await p.taxSlab.create({ data: { ...s, restaurantId: rest.id } }); }
  await p.whatsAppConfig.create({ data: { restaurantId: rest.id, isConnected: false } });
  console.log("SEEDED");
} finally { await p.\$disconnect(); }
ENDSCRIPT
  cd /tmp && node seed.mjs 2>/dev/null
' 2>/dev/null

echo -e "${GREEN}  ✅ Database ready${NC}"

# ── Done ──
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}✅ Ritam Bharat POS is LIVE!${NC}                ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "  🌐 http://${SERVER_IP}:3000"
echo "  🔐 admin@rb.com / Admin@2006 (PIN: 2006)"
echo ""
echo "  📋 Admin:       http://${SERVER_IP}:3000/admin"
echo "  🧑‍🍳 Kitchen:    http://${SERVER_IP}:3000/kitchen"
echo "  📱 Waiter App:  http://${SERVER_IP}:3000/waiter-app"
echo "  📦 Takeaway:    http://${SERVER_IP}:3000/admin/takeaway"
echo ""
echo "  💡 Point your domain A record → ${SERVER_IP}"
echo "  📖 Logs: docker compose -f $REPO_DIR/docker/docker-compose.yml logs -f"
echo ""
