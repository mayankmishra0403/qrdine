import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo-bistro" },
    update: {},
    create: {
      name: "Demo Bistro",
      slug: "demo-bistro",
      address: "123, MG Road",
      phone: "+919999999999",
      currency: "INR",
      taxRate: 5,
      serviceCharge: 0,
      gstin: "22AAAAA0000A1Z5",
      pan: "AAAAA0000A",
    },
  });

  const gstSlabs = [
    { name: "GST 5%", rate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, isDefault: false },
    { name: "GST 12%", rate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12, isDefault: false },
    { name: "GST 18%", rate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, isDefault: true },
    { name: "GST 28%", rate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28, isDefault: false },
    { name: "No GST", rate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0, isDefault: false },
  ];

  for (const slab of gstSlabs) {
    await prisma.taxSlab.create({ data: { ...slab, restaurantId: restaurant.id } });
  }

  const passwordHash = await bcrypt.hash("Admin@2006", 10);

  await prisma.user.upsert({
    where: { email: "admin@rb.com" },
    update: {},
    create: {
      email: "admin@rb.com",
      passwordHash,
      name: "Admin",
      role: "owner",
      pin: "2006",
      restaurantId: restaurant.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@rb.com" },
    update: {},
    create: {
      email: "cashier@rb.com",
      passwordHash,
      name: "Cashier",
      role: "cashier",
      pin: "5678",
      restaurantId: restaurant.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "kitchen@rb.com" },
    update: {},
    create: {
      email: "kitchen@rb.com",
      passwordHash,
      name: "Kitchen Staff",
      role: "kitchen",
      pin: "9012",
      restaurantId: restaurant.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "waiter@rb.com" },
    update: {},
    create: {
      email: "waiter@rb.com",
      passwordHash,
      name: "Waiter",
      role: "waiter",
      pin: "3456",
      restaurantId: restaurant.id,
    },
  });

  const tables = [
    { tableNumber: 1, capacity: 2 },
    { tableNumber: 2, capacity: 4 },
    { tableNumber: 3, capacity: 4 },
    { tableNumber: 4, capacity: 6 },
    { tableNumber: 5, capacity: 2 },
  ];

  for (const table of tables) {
    await prisma.table.upsert({
      where: {
        restaurantId_tableNumber: {
          restaurantId: restaurant.id,
          tableNumber: table.tableNumber,
        },
      },
      update: { capacity: table.capacity },
      create: {
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        restaurantId: restaurant.id,
      },
    });
  }

  const mainCourse = await prisma.menuCategory.create({
    data: {
      name: "Main Course",
      sortOrder: 1,
      restaurantId: restaurant.id,
    },
  });

  const beverages = await prisma.menuCategory.create({
    data: {
      name: "Beverages",
      sortOrder: 2,
      restaurantId: restaurant.id,
    },
  });

  const desserts = await prisma.menuCategory.create({
    data: {
      name: "Desserts",
      sortOrder: 3,
      restaurantId: restaurant.id,
    },
  });

  const starters = await prisma.menuCategory.create({
    data: {
      name: "Starters",
      sortOrder: 0,
      restaurantId: restaurant.id,
    },
  });

  const burger = await prisma.menuItem.create({
    data: {
      name: "Classic Burger",
      description: "Beef patty with lettuce, tomato, and special sauce",
      price: 299,
      cost: 150,
      prepTimeMins: 12,
      categoryId: mainCourse.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.menuItemVariant.createMany({
    data: [
      { name: "Single", priceMod: 0, itemId: burger.id },
      { name: "Double", priceMod: 100, itemId: burger.id },
    ],
  });

  const burgerAddonGroup = await prisma.addonGroup.create({
    data: {
      name: "Extra Toppings",
      required: false,
      maxSelect: 2,
      itemId: burger.id,
    },
  });

  await prisma.addonOption.createMany({
    data: [
      { name: "Extra Cheese", priceMod: 30, groupId: burgerAddonGroup.id },
      { name: "Bacon", priceMod: 50, groupId: burgerAddonGroup.id },
      { name: "Jalapeños", priceMod: 20, groupId: burgerAddonGroup.id },
    ],
  });

  const pasta = await prisma.menuItem.create({
    data: {
      name: "Pasta Carbonara",
      description: "Creamy pasta with bacon and parmesan",
      price: 349,
      cost: 180,
      prepTimeMins: 15,
      categoryId: mainCourse.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Grilled Chicken Salad",
      description: "Fresh greens with grilled chicken and vinaigrette",
      price: 249,
      cost: 120,
      prepTimeMins: 10,
      categoryId: mainCourse.id,
      restaurantId: restaurant.id,
    },
  });

  const fries = await prisma.menuItem.create({
    data: {
      name: "French Fries",
      description: "Crispy golden fries with dip",
      price: 149,
      cost: 40,
      prepTimeMins: 8,
      categoryId: starters.id,
      restaurantId: restaurant.id,
    },
  });

  const friesAddonGroup = await prisma.addonGroup.create({
    data: {
      name: "Dip Choice",
      required: true,
      maxSelect: 1,
      itemId: fries.id,
    },
  });

  await prisma.addonOption.createMany({
    data: [
      { name: "Ketchup", priceMod: 0, groupId: friesAddonGroup.id },
      { name: "Mayo", priceMod: 0, groupId: friesAddonGroup.id },
      { name: "Cheese Dip", priceMod: 20, groupId: friesAddonGroup.id },
    ],
  });

  await prisma.menuItem.create({
    data: {
      name: "Soda",
      description: "Choose from Coke, Sprite, Fanta",
      price: 49,
      cost: 15,
      categoryId: beverages.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Iced Tea",
      description: "Fresh brewed iced tea",
      price: 69,
      cost: 10,
      categoryId: beverages.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Coffee",
      description: "Fresh brewed coffee",
      price: 79,
      cost: 15,
      categoryId: beverages.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Tiramisu",
      description: "Classic Italian dessert",
      price: 199,
      cost: 80,
      prepTimeMins: 5,
      categoryId: desserts.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Cheesecake",
      description: "New York style cheesecake",
      price: 179,
      cost: 70,
      prepTimeMins: 3,
      categoryId: desserts.id,
      restaurantId: restaurant.id,
    },
  });

  const chickenSupplier = await prisma.supplier.create({
    data: {
      name: "Fresh Meats Co.",
      contactPerson: "Rajesh",
      phone: "+919876543210",
      email: "rajesh@freshmeats.com",
      restaurantId: restaurant.id,
    },
  });

  const vegSupplier = await prisma.supplier.create({
    data: {
      name: "Green Valley Farms",
      contactPerson: "Priya",
      phone: "+919876543211",
      restaurantId: restaurant.id,
    },
  });

  const chickenItem = await prisma.inventoryItem.create({
    data: {
      name: "Chicken Breast",
      sku: "CHK-001",
      category: "meat",
      unit: "kg",
      stockQty: 10,
      minStockQty: 2,
      costPrice: 250,
      supplierId: chickenSupplier.id,
      restaurantId: restaurant.id,
    },
  });

  const creamItem = await prisma.inventoryItem.create({
    data: {
      name: "Cooking Cream",
      sku: "CRM-001",
      category: "dairy",
      unit: "l",
      stockQty: 5,
      minStockQty: 1,
      costPrice: 180,
      supplierId: vegSupplier.id,
      restaurantId: restaurant.id,
    },
  });

  const pastaItem = await prisma.inventoryItem.create({
    data: {
      name: "Pasta",
      sku: "PAS-001",
      category: "dry",
      unit: "kg",
      stockQty: 8,
      minStockQty: 2,
      costPrice: 80,
      supplierId: vegSupplier.id,
      restaurantId: restaurant.id,
    },
  });

  const cheeseItem = await prisma.inventoryItem.create({
    data: {
      name: "Cheddar Cheese",
      sku: "CHS-001",
      category: "dairy",
      unit: "kg",
      stockQty: 3,
      minStockQty: 0.5,
      costPrice: 400,
      supplierId: vegSupplier.id,
      restaurantId: restaurant.id,
    },
  });

  const potatoItem = await prisma.inventoryItem.create({
    data: {
      name: "Potatoes",
      sku: "POT-001",
      category: "produce",
      unit: "kg",
      stockQty: 15,
      minStockQty: 3,
      costPrice: 30,
      supplierId: vegSupplier.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.recipeItem.createMany({
    data: [
      { menuItemId: pasta.id, inventoryItemId: pastaItem.id, quantity: 0.2, unit: "kg" },
      { menuItemId: pasta.id, inventoryItemId: creamItem.id, quantity: 0.1, unit: "l" },
      { menuItemId: pasta.id, inventoryItemId: cheeseItem.id, quantity: 0.05, unit: "kg" },
      { menuItemId: fries.id, inventoryItemId: potatoItem.id, quantity: 0.3, unit: "kg" },
    ],
  });

  await prisma.whatsAppConfig.upsert({
    where: { restaurantId: restaurant.id },
    update: {},
    create: {
      restaurantId: restaurant.id,
      isConnected: false,
    },
  });

  console.log("Seed completed successfully");
  console.log("Login credentials:");
  console.log("  Owner:   admin@rb.com / Admin@2006 (PIN: 2006)");
  console.log("  Cashier: cashier@rb.com / Admin@2006 (PIN: 5678)");
  console.log("  Kitchen: kitchen@rb.com / Admin@2006 (PIN: 9012)");
  console.log("  Waiter:  waiter@rb.com / Admin@2006 (PIN: 3456)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
