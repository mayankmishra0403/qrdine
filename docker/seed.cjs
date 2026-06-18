const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const existing = await p.restaurant.findFirst();
  if (existing) { console.log('Already seeded'); return; }
  const r = await p.restaurant.create({ data: { name: 'Ritam Bharat', slug: 'ritam-bharat', address: 'Your Restaurant Address', phone: '+919999999999', email: 'hello@ritambharat.software', currency: 'INR', gstin: '22AAAAA0000A1Z5', pan: 'AAAAA0000A', taxRate: 5, serviceCharge: 0, billFooter: 'Thank you! Visit again!', loyaltyEnabled: true, loyaltyEarnRate: 100, loyaltyRedeemRate: 100, loyaltyMinRedeem: 100 } });
  const hash = '$2b$10$9QQuqwAsDFit.1JC.nwXv.x9fSAhMq495k4GMt8XTgoVaTwvGeXDW';
  await p.user.createMany({ data: [
    { email: 'admin@rb.com', passwordHash: hash, name: 'Admin', role: 'owner', pin: '2006', restaurantId: r.id },
    { email: 'cashier@rb.com', passwordHash: hash, name: 'Cashier', role: 'cashier', pin: '5678', restaurantId: r.id },
    { email: 'kitchen@rb.com', passwordHash: hash, name: 'Kitchen Staff', role: 'kitchen', pin: '9012', restaurantId: r.id },
    { email: 'waiter@rb.com', passwordHash: hash, name: 'Waiter', role: 'waiter', pin: '3456', restaurantId: r.id }
  ] });
  for (let i = 1; i <= 5; i++) { await p.table.create({ data: { tableNumber: i, capacity: [2, 4, 4, 6, 2][i - 1], restaurantId: r.id } }); }
  const slabs = [
    { name: 'GST 5%', rate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5 },
    { name: 'GST 12%', rate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12 },
    { name: 'GST 18%', rate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, isDefault: true },
    { name: 'GST 28%', rate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28 },
    { name: 'No GST', rate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0 }
  ];
  for (const s of slabs) { await p.taxSlab.create({ data: { ...s, restaurantId: r.id } }); }
  await p.whatsAppConfig.create({ data: { restaurantId: r.id, isConnected: false } });
  console.log('SEEDED');
})().catch(e => { console.error(e.message); process.exit(1); }).finally(() => p.$disconnect());
