import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  doctors: defineTable({
    name: v.string(),
    clinic_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    specialization: v.optional(v.string()),
    image_url: v.optional(v.string()),
    notes: v.optional(v.string()),
    created_at: v.number(), // timestamp
  }).index("by_name", ["name"]),

  technicians: defineTable({
    name: v.string(),
    specialization: v.optional(v.string()),
    phone: v.optional(v.string()),
    status: v.string(), // "Active", "Inactive"
    created_at: v.number(),
  }),

  users: defineTable({
    username: v.string(),
    password: v.string(), // hashed
    role: v.string(), // "Admin", "Staff", "Doctor"
    doctor_id: v.optional(v.id("doctors")),
    token: v.optional(v.string()),
    created_at: v.number(),
  }).index("by_username", ["username"]),

  invoices: defineTable({
    doctor_id: v.id("doctors"),
    invoice_no: v.number(),
    invoice_date: v.string(),
    amount: v.number(),
    status: v.string(), // "Unpaid", "Paid", "Partial"
    due_date: v.optional(v.string()),
    last_reminder_sent_at: v.optional(v.number()),
    created_at: v.number(),
  }).index("by_doctor", ["doctor_id"])
    .index("by_invoice_no", ["invoice_no"]),

  cases: defineTable({
    doctor_id: v.id("doctors"),
    technician_id: v.optional(v.id("technicians")),
    patient_name: v.string(),
    case_type: v.string(),
    material: v.optional(v.string()),
    shade: v.optional(v.string()),
    selected_teeth: v.optional(v.string()),
    priority: v.string(), // "Normal", "High", "Urgent"
    status: v.string(), // "Pending", "In Progress", "Completed", etc.
    receiving_date: v.string(),
    due_date: v.optional(v.string()),
    delivery_date: v.optional(v.string()),
    cost: v.number(),
    notes: v.optional(v.string()),
    image_url: v.optional(v.string()),
    preparation_type: v.optional(v.string()),
    is_invoiced: v.optional(v.boolean()),
    created_at: v.number(),
  }).index("by_doctor", ["doctor_id"]).index("by_status", ["status"]),

  invoice_items: defineTable({
    invoice_id: v.id("invoices"),
    case_id: v.optional(v.id("cases")),
    description: v.string(),
    amount: v.number(),
  }).index("by_invoice", ["invoice_id"]),

  payments: defineTable({
    doctor_id: v.id("doctors"),
    invoice_id: v.optional(v.id("invoices")),
    amount: v.number(),
    payment_method: v.string(),
    reference_no: v.optional(v.string()),
    payment_date: v.string(),
    notes: v.optional(v.string()),
    created_at: v.number(),
  }).index("by_doctor", ["doctor_id"]),

  expenses: defineTable({
    category: v.string(),
    amount: v.number(),
    description: v.optional(v.string()),
    expense_date: v.string(),
    created_at: v.number(),
  }),

  inventory: defineTable({
    item_name: v.string(),
    category: v.optional(v.string()),
    quantity: v.number(),
    unit: v.optional(v.string()),
    min_stock_level: v.number(),
    cost_per_unit: v.optional(v.number()),
    last_updated: v.number(),
  }),

  case_history: defineTable({
    case_id: v.id("cases"),
    status: v.string(),
    comment: v.optional(v.string()),
    updated_at: v.number(),
  }).index("by_case", ["case_id"]),

  rate_list: defineTable({
    case_type: v.string(),
    material: v.string(),
    price: v.number(),
    created_at: v.number(),
  }),

  shades: defineTable({
    name: v.string(),
    created_at: v.number(),
  }).index("by_name", ["name"]),

  settings: defineTable({
    key: v.string(),
    value: v.optional(v.string()),
    updated_at: v.number(),
  }).index("by_key", ["key"]),

  case_tasks: defineTable({
    case_id: v.id("cases"),
    task_name: v.string(),
    technician_id: v.optional(v.id("technicians")),
    status: v.string(), // "Pending", "Completed"
    completed_at: v.optional(v.number()),
    created_at: v.number(),
  }).index("by_case", ["case_id"]),
});
