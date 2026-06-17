<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Phase 0 Complete — Setup Instructions

## After cloning / pulling, run:

```bash
npm install                           # Installs ioredis + all deps
npx prisma migrate dev --name init    # Creates all tables (or --name phase0)
npx prisma db seed                    # Seeds demo data
npm run dev                           # Start dev server
```

## Docker (full stack with Evolution API + Redis):

```bash
docker compose -f docker/docker-compose.yml up -d
```

## Environment Variables (.env):

```
DATABASE_URL="postgresql://qrdine:qrdine@localhost:5432/qrdine"
REDIS_URL="redis://localhost:6379"
AUTH_SECRET="generate-with-openssl-random-32"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="your-evolution-api-key"
EVOLUTION_INSTANCE_NAME="ritam-bharat-pos"
```

## WhatsApp Setup (Pairing Code Only):

1. Go to Admin > WhatsApp
2. Enter phone number with country code (e.g., 919876543210)
3. Click "Get Login Code"
4. Open WhatsApp on phone → Settings → Linked Devices → Link a Device
5. Enter the displayed code

## Demo Credentials (from seed):

| Role     | Email              | Password    | PIN  |
|----------|--------------------|-------------|------|
| Owner    | admin@rb.com       | Admin@2006  | 2006 |
| Cashier  | cashier@rb.com     | Admin@2006  | 5678 |
| Kitchen  | kitchen@rb.com     | Admin@2006  | 9012 |
| Waiter   | waiter@rb.com      | Admin@2006  | 3456 |

## New Modules Available (DB ready):

- **POS**: Payments, Invoices, POS Sessions tables ready
- **Menu**: Add-on groups and options ready
- **Inventory**: Items, recipes, stock movements, suppliers, purchase orders ready
- **Table**: Capacity, status tracking, merging ready
- **User**: PIN login, role-based access, active/inactive ready
