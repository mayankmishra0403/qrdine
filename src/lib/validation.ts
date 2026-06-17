import { z } from "zod";

export const tableSchema = z.object({
  tableNumber: z.number().int().min(1, "Table number must be at least 1"),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const menuItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional(),
  price: z.number().positive("Price must be positive"),
  categoryId: z.string().min(1),
});

export const menuItemUpdateSchema = menuItemSchema.partial();

export const variantSchema = z.object({
  name: z.string().min(1).max(100),
  priceMod: z.number().min(0),
  itemId: z.string().min(1),
});

export const cartItemSchema = z.object({
  itemId: z.string().min(1),
  variantId: z.string().nullable().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().positive(),
});

export const placeOrderSchema = z.object({
  tableId: z.string().min(1),
  phone: z.string().regex(/^\d{6,15}$/, "Enter a valid phone number"),
  notes: z.string().max(500).optional(),
  items: z.array(cartItemSchema).min(1, "Order must have at least one item"),
});

export const restaurantUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  gstin: z.string().max(20).optional().or(z.literal("")),
  pan: z.string().max(20).optional().or(z.literal("")),
  currency: z.string().length(3).optional(),
  timezone: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  serviceCharge: z.number().min(0).max(100).optional(),
  logo: z.string().optional().or(z.literal("")),
  billFooter: z.string().max(500).optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
