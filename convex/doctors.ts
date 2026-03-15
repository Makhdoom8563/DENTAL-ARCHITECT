import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("doctors").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("doctors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    clinic_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    specialization: v.optional(v.string()),
    image_url: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("doctors", {
      ...args,
      created_at: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("doctors"),
    name: v.string(),
    clinic_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    specialization: v.optional(v.string()),
    image_url: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("doctors") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const getPortalData = query({
  args: { doctor_id: v.id("doctors"), startDate: v.optional(v.string()), endDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const cases = await ctx.db
      .query("cases")
      .withIndex("by_doctor", (q) => q.eq("doctor_id", args.doctor_id))
      .collect();
    
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_doctor", (q) => q.eq("doctor_id", args.doctor_id))
      .collect();

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_doctor", (q) => q.eq("doctor_id", args.doctor_id))
      .collect();

    const total_invoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const total_paid = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      cases,
      payments,
      balance: {
        total_invoiced,
        total_paid,
        outstanding_balance: total_invoiced - total_paid,
      },
    };
  },
});
