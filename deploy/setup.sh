#!/bin/bash
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

DOMAIN="pos.ritambharat.software"
REPO_URL="https://github.com/mayankmishra0403/qrdine.git"
REPO_DIR="/opt/ritambharat-pos"

echo "╔═══════════════════════════════════════════════════╗"
echo "║     🚀 Ritam Bharat POS — Deploy                 ║"
echo "╚═══════════════════════════════════════════════════╝"

# ── 1. Docker ──
if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}[1/5] Installing Docker...${NC}"
  curl -fsSL https://get.docker.com | sh
fi
echo -e "${GREEN}[1/5] Docker ready${NC}"

# ── 2. Repo ──
echo -e "${YELLOW}[2/5] Setting up repository...${NC}"
if [ -d "$REPO_DIR" ]; then cd /tmp && rm -rf "$REPO_DIR"; fi
git clone --depth 1 "$REPO_URL" "$REPO_DIR"
cd "$REPO_DIR"
echo -e "${GREEN}[2/5] Repository ready${NC}"

# ── 3. .env ──
echo -e "${YELLOW}[3/5] Creating environment...${NC}"
ENV_CONTENT=$(cat << EOF
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
)
echo "$ENV_CONTENT" > "$REPO_DIR/.env"
echo "$ENV_CONTENT" > "$REPO_DIR/docker/.env"
echo -e "${GREEN}[3/5] Environment created${NC}"

# ── 4. Build & Start Services ──
echo -e "${YELLOW}[4/5] Building and starting services...${NC}"
cd "$REPO_DIR"
docker compose -f docker/docker-compose.yml up -d --build 2>&1 | tail -5

# Wait for postgres
echo "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if docker compose -f docker/docker-compose.yml exec -T postgres pg_isready -U qrdine &>/dev/null; then
    echo "PostgreSQL ready"
    break
  fi
  sleep 2
done

# Wait for app container to start
echo "Waiting for app container..."
sleep 10
for i in $(seq 1 30); do
  if docker compose -f docker/docker-compose.yml ps app --format json 2>/dev/null | grep -q '"State":"running"'; then
    echo "App container ready"
    break
  fi
  sleep 2
done

# Wait for app to be fully ready (db push + server start)
echo "Waiting for app health check..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q 200; then
    echo "App ready"
    break
  fi
  sleep 4
done

# ── Seed Database ──
echo "Seeding database..."
docker compose -f docker/docker-compose.yml exec -T app node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const existing = await p.restaurant.findFirst();
  if (existing) { console.log('Already seeded'); return; }
  const rest = await p.restaurant.create({
    data: { name: 'Ritam Bharat', slug: 'ritam-bharat', address: 'Your Restaurant Address', phone: '+919999999999', email: 'hello@ritambharat.software', currency: 'INR', gstin: '22AAAAA0000A1Z5', pan: 'AAAAA0000A', taxRate: 5, serviceCharge: 0, billFooter: 'Thank you! Visit again!', loyaltyEnabled: true, loyaltyEarnRate: 100, loyaltyRedeemRate: 100, loyaltyMinRedeem: 100 }
  });
  await p.user.createMany({ data: [
    { email: 'admin@rb.com', passwordHash: '\$2b\$10\$9QQuqwAsDFit.1JC.nwXv.x9fSAhMq495k4GMt8XTgoVaTwvGeXDW', name: 'Admin', role: 'owner', pin: '2006', restaurantId: rest.id },
    { email: 'cashier@rb.com', passwordHash: '\$2b\$10\$9QQuqwAsDFit.1JC.nwXv.x9fSAhMq495k4GMt8XTgoVaTwvGeXDW', name: 'Cashier', role: 'cashier', pin: '5678', restaurantId: rest.id },
    { email: 'kitchen@rb.com', passwordHash: '\$2b\$10\$9QQuqwAsDFit.1JC.nwXv.x9fSAhMq495k4GMt8XTgoVaTwvGeXDW', name: 'Kitchen Staff', role: 'kitchen', pin: '9012', restaurantId: rest.id },
    { email: 'waiter@rb.com', passwordHash: '\$2b\$10\$9QQuqwAsDFit.1JC.nwXv.x9fSAhMq495k4GMt8XTgoVaTwvGeXDW', name: 'Waiter', role: 'waiter', pin: '3456', restaurantId: rest.id }
  ]});
  for (let i = 1; i <= 5; i++) { await p.table.create({ data: { tableNumber: i, capacity: [2,4,4,6,2][i-1], restaurantId: rest.id } }); }
  const slabs = [
    { name: 'GST 5%', rate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5 },
    { name: 'GST 12%', rate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12 },
    { name: 'GST 18%', rate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, isDefault: true },
    { name: 'GST 28%', rate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28 },
    { name: 'No GST', rate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0 }
  ];
  for (const s of slabs) { await p.taxSlab.create({ data: { ...s, restaurantId: rest.id } }); }
  await p.whatsAppConfig.create({ data: { restaurantId: rest.id, isConnected: false } });
  console.log('SEEDED');
  const { MenuCategory, MenuItem, InventoryItem, Supplier, RecipeItem } = p;
  const mc = await MenuCategory.create({ data: { name: 'Main Course', sortOrder: 1, restaurantId: rest.id } });
  const bev = await MenuCategory.create({ data: { name: 'Beverages', sortOrder: 2, restaurantId: rest.id } });
  const des = await MenuCategory.create({ data: { name: 'Desserts', sortOrder: 3, restaurantId: rest.id } });
  const st = await MenuCategory.create({ data: { name: 'Starters', sortOrder: 0, restaurantId: rest.id } });
  const burger = await MenuItem.create({ data: { name: 'Classic Burger', description: 'Beef patty with lettuce, tomato, and special sauce', price: 299, cost: 150, prepTimeMins: 12, categoryId: mc.id, restaurantId: rest.id } });
  const pasta = await MenuItem.create({ data: { name: 'Pasta Carbonara', description: 'Creamy pasta with bacon and parmesan', price: 349, cost: 180, prepTimeMins: 15, categoryId: mc.id, restaurantId: rest.id } });
  await MenuItem.create({ data: { name: 'Grilled Chicken Salad', description: 'Fresh greens with grilled chicken and vinaigrette', price: 249, cost: 120, prepTimeMins: 10, categoryId: mc.id, restaurantId: rest.id } });
  const fries = await MenuItem.create({ data: { name: 'French Fries', description: 'Crispy golden fries with dip', price: 149, cost: 40, prepTimeMins: 8, categoryId: st.id, restaurantId: rest.id } });
  await MenuItem.create({ data: { name: 'Soda', description: 'Choose from Coke, Sprite, Fanta', price: 49, cost: 15, categoryId: bev.id, restaurantId: rest.id } });
  await MenuItem.create({ data: { name: 'Iced Tea', description: 'Fresh brewed iced tea', price: 69, cost: 10, categoryId: bev.id, restaurantId: rest.id } });
  await MenuItem.create({ data: { name: 'Coffee', description: 'Fresh brewed coffee', price: 79, cost: 15, categoryId: bev.id, restaurantId: rest.id } });
  await MenuItem.create({ data: { name: 'Tiramisu', description: 'Classic Italian dessert', price: 199, cost: 80, prepTimeMins: 5, categoryId: des.id, restaurantId: rest.id } });
  await MenuItem.create({ data: { name: 'Cheesecake', description: 'New York style cheesecake', price: 179, cost: 70, prepTimeMins: 3, categoryId: des.id, restaurantId: rest.id } });
  const sup1 = await Supplier.create({ data: { name: 'Fresh Meats Co.', contactPerson: 'Rajesh', phone: '+919876543210', email: 'rajesh@freshmeats.com', restaurantId: rest.id } });
  const sup2 = await Supplier.create({ data: { name: 'Green Valley Farms', contactPerson: 'Priya', phone: '+919876543211', restaurantId: rest.id } });
  const chk = await InventoryItem.create({ data: { name: 'Chicken Breast', sku: 'CHK-001', category: 'meat', unit: 'kg', stockQty: 10, minStockQty: 2, costPrice: 250, supplierId: sup1.id, restaurantId: rest.id } });
  const cream = await InventoryItem.create({ data: { name: 'Cooking Cream', sku: 'CRM-001', category: 'dairy', unit: 'l', stockQty: 5, minStockQty: 1, costPrice: 180, supplierId: sup2.id, restaurantId: rest.id } });
  const pastaItem = await InventoryItem.create({ data: { name: 'Pasta', sku: 'PAS-001', category: 'dry', unit: 'kg', stockQty: 8, minStockQty: 2, costPrice: 80, supplierId: sup2.id, restaurantId: rest.id } });
  const cheese = await InventoryItem.create({ data: { name: 'Cheddar Cheese', sku: 'CHS-001', category: 'dairy', unit: 'kg', stockQty: 3, minStockQty: 0.5, costPrice: 400, supplierId: sup2.id, restaurantId: rest.id } });
  const potato = await InventoryItem.create({ data: { name: 'Potatoes', sku: 'POT-001', category: 'produce', unit: 'kg', stockQty: 15, minStockQty: 3, costPrice: 30, supplierId: sup2.id, restaurantId: rest.id } });
  await RecipeItem.createMany({ data: [
    { menuItemId: pasta.id, inventoryItemId: pastaItem.id, quantity: 0.2, unit: 'kg' },
    { menuItemId: pasta.id, inventoryItemId: cream.id, quantity: 0.1, unit: 'l' },
    { menuItemId: pasta.id, inventoryItemId: cheese.id, quantity: 0.05, unit: 'kg' },
    { menuItemId: fries.id, inventoryItemId: potato.id, quantity: 0.3, unit: 'kg' }
  ]});
  console.log('Demo data created');
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(0); });
" 2>&1

echo -e "${GREEN}[4/5] Services started${NC}"

# ── 5. Nginx Reverse Proxy ──
echo -e "${YELLOW}[5/5] Setting up Nginx for ${DOMAIN}...${NC}"
sudo apt-get update -qq && sudo apt-get install -y -qq curl nginx certbot python3-certbot-nginx 2>/dev/null || true

# Wait for app to actually respond
echo "Waiting for app to be ready..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q 200; then
    echo "App ready"
    break
  fi
  sleep 3
done

sudo tee /etc/nginx/sites-enabled/ritam-bharat > /dev/null << 'NGINX'
server {
    listen 80 default_server;
    server_name pos.ritambharat.software _;
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

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}
NGINX
sudo rm -f /etc/nginx/sites-enabled/default
sudo mkdir -p /var/www/html
sudo nginx -t && sudo systemctl restart nginx

# Try Let's Encrypt SSL (skip if DNS not pointed)
echo "Trying Let's Encrypt SSL..."
if sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email "admin@${DOMAIN}" --redirect 2>/dev/null; then
  echo "SSL obtained! Configuring auto-renewal..."
  (sudo crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
else
  echo "SSL skipped (point DNS ${DOMAIN} → $(curl -s http://checkip.amazonaws.com) to enable)"
fi

echo -e "${GREEN}[5/5] Nginx configured${NC}"

# ── Done ──
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}✅ Ritam Bharat POS is LIVE!${NC}                 ║"
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