import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const invoices = await ctx.db.query("invoices").order("desc").collect();
    return await Promise.all(
      invoices.map(async (inv) => {
        const doctor = await ctx.db.get(inv.doctor_id);
        return {
          ...inv,
          doctor_name: doctor?.name || "Unknown",
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (!invoice) return null;

    const doctor = await ctx.db.get(invoice.doctor_id);
    const items = await ctx.db
      .query("invoice_items")
      .withIndex("by_invoice", (q) => q.eq("invoice_id", args.id))
      .collect();

    const payments = await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("invoice_id"), args.id))
      .collect();

    const total_paid = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      ...invoice,
      doctor_name: doctor?.name || "Unknown",
      clinic_name: doctor?.clinic_name || "",
      address: doctor?.address || "",
      phone: doctor?.phone || "",
      items,
      total_paid,
    };
  },
});

export const create = mutation({
  args: {
    doctor_id: v.id("doctors"),
    invoice_date: v.string(),
    total_amount: v.number(),
    due_date: v.optional(v.string()),
    items: v.array(v.object({
      case_id: v.optional(v.id("cases")),
      description: v.string(),
      amount: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Generate invoice number
    const lastInvoice = await ctx.db.query("invoices").order("desc").first();
    const invoice_no = (lastInvoice?.invoice_no || 1000) + 1;

    const invoiceId = await ctx.db.insert("invoices", {
      doctor_id: args.doctor_id,
      invoice_no,
      invoice_date: args.invoice_date,
      amount: args.total_amount,
      status: "Unpaid",
      due_date: args.due_date,
      created_at: Date.now(),
    });

    for (const item of args.items) {
      await ctx.db.insert("invoice_items", {
        invoice_id: invoiceId,
        case_id: item.case_id,
        description: item.description,
        amount: item.amount,
      });

      if (item.case_id) {
        await ctx.db.patch(item.case_id, { is_invoiced: true });
      }
    }

    return invoiceId;
  },
});

export const createItem = mutation({
  args: {
    invoice_id: v.id("invoices"),
    case_id: v.optional(v.id("cases")),
    description: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const itemId = await ctx.db.insert("invoice_items", {
      invoice_id: args.invoice_id,
      case_id: args.case_id,
      description: args.description,
      amount: args.amount,
    });

    if (args.case_id) {
      await ctx.db.patch(args.case_id, { is_invoiced: true });
    }

    return itemId;
  },
});

export const updateStatus = mutation({
  args: { id: v.id("invoices"), status: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const bulkStatus = mutation({
  args: { ids: v.array(v.id("invoices")), status: v.string() },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.patch(id, { status: args.status });
    }
  },
});

export const bulkRemind = mutation({
  args: { ids: v.array(v.id("invoices")) },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.ids) {
      await ctx.db.patch(id, { last_reminder_sent_at: now });
    }
  },
});

export const getByDoctor = query({
  args: { doctor_id: v.id("doctors"), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let invoices = await ctx.db
      .query("invoices")
      .withIndex("by_doctor", (q) => q.eq("doctor_id", args.doctor_id))
      .order("desc")
      .collect();
      
    if (args.status) {
      invoices = invoices.filter(inv => inv.status === args.status);
    }
    
    return invoices;
  },
});
