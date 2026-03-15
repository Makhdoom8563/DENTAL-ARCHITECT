import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("inventory").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    item_name: v.string(),
    category: v.optional(v.string()),
    quantity: v.number(),
    unit: v.optional(v.string()),
    min_stock_level: v.number(),
    cost_per_unit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("inventory", {
      ...args,
      last_updated: Date.now(),
    });
  },
});

export const updateQuantity = mutation({
  args: { id: v.id("inventory"), quantity: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { 
      quantity: args.quantity,
      last_updated: Date.now()
    });
  },
});
