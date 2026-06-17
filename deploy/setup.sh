#!/bin/bash
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

DOMAIN="pos.ritambharat.software"
REPO_URL="https://github.com/mayankmishra0403/qrdine.git"
REPO_DIR="/opt/ritambharat-pos"

echo "╔═══════════════════════════════════════════════════╗"
echo "║     🚀 Ritam Bharat POS — Deploy                  ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# ── 1. Docker ──
if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}[1/5] Installing Docker...${NC}"
  curl -fsSL https://get.docker.com | sh
fi
echo -e "${GREEN}[1/5] Docker ready${NC}"

# ── 2. Repo ──
echo -e "${YELLOW}[2/5] Setting up repository...${NC}"
if [ -d "$REPO_DIR" ]; then rm -rf "$REPO_DIR"; fi
git clone --depth 1 "$REPO_URL" "$REPO_DIR"
cd "$REPO_DIR"
echo -e "${GREEN}[2/5] Repository ready${NC}"

# ── 3. .env ──
echo -e "${YELLOW}[3/5] Creating environment...${NC}"
mkdir -p "$REPO_DIR/docker"
cat > "$REPO_DIR/docker/.env" << EOF
DATABASE_URL="postgresql://qrdine:qrdine@postgres:5432/qrdine?schema=public"
REDIS_URL="redis://redis:6379"
AUTH_SECRET="$(openssl rand -hex 32)"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
NEXT_PUBLIC_APP_URL="http://${DOMAIN}"
EVOLUTION_API_URL="http://evolution_api:8080"
EVOLUTION_API_KEY="$(openssl rand -hex 32)"
EVOLUTION_INSTANCE_NAME="ritam-bharat-pos"
TUNNEL_URL="https://${DOMAIN}"
EOF
echo -e "${GREEN}[3/5] Environment created${NC}"

# ── 4. Start Services ──
echo -e "${YELLOW}[4/5] Starting services...${NC}"
cd "$REPO_DIR" && docker compose -f docker/docker-compose.yml up -d --build 2>&1 | tail -1
echo -e "${GREEN}[4/5] Services started${NC}"

# ── 5. Nginx Reverse Proxy ──
echo -e "${YELLOW}[5/5] Setting up Nginx for ${DOMAIN}...${NC}"
sudo apt-get install -y -qq nginx 2>/dev/null || true

sudo tee /etc/nginx/sites-enabled/ritam-bharat > /dev/null << 'NGINX'
server {
    listen 80;
    server_name pos.ritambharat.software;
    client_max_body_size 50m;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
echo -e "${GREEN}[5/5] Nginx configured${NC}"

# ── Database Init ──
echo "Waiting for database..."; sleep 20
cd "$REPO_DIR"
docker compose -f docker/docker-compose.yml exec -T postgres sh -c 'psql -U qrdine -d qrdine' << 'SQL' 2>/dev/null || true
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "billFooter" TEXT DEFAULT 'Thank you! Visit again!';
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
SQL

docker compose -f docker/docker-compose.yml exec -T app sh -c '
  cat > /tmp/seed.mjs << "ENDSCRIPT"
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const p = new PrismaClient();
try {
  const existing = await p.restaurant.findFirst();
  if (existing) { console.log("ALREADY_SEEDED"); process.exit(0); }
  const rest = await p.restaurant.create({
    data: { name: "Ritam Bharat", slug: "ritam-bharat", address: "Your Restaurant Address", phone: "+919999999999", email: "hello@ritambharat.software", currency: "INR", gstin: "22AAAAA0000A1Z5", pan: "AAAAA0000A" }
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

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}✅ Ritam Bharat POS is LIVE!${NC}                  ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "  🌐 http://${DOMAIN}"
echo "  🔐 admin@rb.com / Admin@2006 (PIN: 2006)"
echo ""
echo "  📋 Admin:       http://${DOMAIN}/admin"
echo "  🧑‍🍳 Kitchen:    http://${DOMAIN}/kitchen"
echo "  📱 Waiter App:  http://${DOMAIN}/waiter-app"
echo "  📦 Takeaway:    http://${DOMAIN}/admin/takeaway"
echo ""
