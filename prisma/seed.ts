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
    },
  });

  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@demobistro.com" },
    update: {},
    create: {
      email: "admin@demobistro.com",
      passwordHash,
      name: "Admin",
      role: "admin",
      restaurantId: restaurant.id,
    },
  });

  const tables = [
    { tableNumber: 1 },
    { tableNumber: 2 },
    { tableNumber: 3 },
    { tableNumber: 4 },
    { tableNumber: 5 },
  ];

  for (const table of tables) {
    await prisma.table.upsert({
      where: { restaurantId_tableNumber: { restaurantId: restaurant.id, tableNumber: table.tableNumber } },
      update: {},
      create: { ...table, restaurantId: restaurant.id },
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

  const burger = await prisma.menuItem.create({
    data: {
      name: "Classic Burger",
      description: "Beef patty with lettuce, tomato, and special sauce",
      price: 299,
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

  const pasta = await prisma.menuItem.create({
    data: {
      name: "Pasta Carbonara",
      description: "Creamy pasta with bacon and parmesan",
      price: 349,
      categoryId: mainCourse.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Grilled Chicken Salad",
      description: "Fresh greens with grilled chicken and vinaigrette",
      price: 249,
      categoryId: mainCourse.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Soda",
      description: "Choose from Coke, Sprite, Fanta",
      price: 49,
      categoryId: beverages.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Iced Tea",
      description: "Fresh brewed iced tea",
      price: 69,
      categoryId: beverages.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Coffee",
      description: "Fresh brewed coffee",
      price: 79,
      categoryId: beverages.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Tiramisu",
      description: "Classic Italian dessert",
      price: 199,
      categoryId: desserts.id,
      restaurantId: restaurant.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Cheesecake",
      description: "New York style cheesecake",
      price: 179,
      categoryId: desserts.id,
      restaurantId: restaurant.id,
    },
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
