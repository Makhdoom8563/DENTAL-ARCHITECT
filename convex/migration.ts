import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const insertRow = mutation({
  args: {
    table: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert(args.table as any, args.data);
  },
});

export const clearTable = mutation({
  args: {
    table: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query(args.table as any).collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
  },
});
