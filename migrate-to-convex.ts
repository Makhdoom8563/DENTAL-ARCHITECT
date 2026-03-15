import Database from "better-sqlite3";
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import dotenv from "dotenv";

import fs from "fs";

dotenv.config();

let convexUrl = process.env.VITE_CONVEX_URL;
if (!convexUrl && fs.existsSync(".convex_url")) {
  convexUrl = fs.readFileSync(".convex_url", "utf-8").trim();
}

if (convexUrl && convexUrl.endsWith("/")) {
  convexUrl = convexUrl.slice(0, -1);
}

if (!convexUrl) {
  console.error("VITE_CONVEX_URL is not set and .convex_url file not found");
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);
const db = new Database("dental_architect.db");

async function migrate() {
  console.log("Starting comprehensive migration to Convex URL:", convexUrl);
  
  const idMap: Record<string, Record<number, string>> = {
    doctors: {},
    technicians: {},
    cases: {},
    invoices: {},
    users: {},
  };

  const tables = [
    "doctors",
    "technicians",
    "shades",
    "rate_list",
    "expenses",
    "inventory",
    "settings",
    "users",
    "cases",
    "invoices",
    "invoice_items",
    "payments",
    "case_history",
    "case_tasks",
  ];

  const callMutation = async (path: string, args: any) => {
    const response = await fetch(`${convexUrl}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, args })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to call mutation ${path}: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.value;
  };

  try {
    // 1. Independent Tables
    const independentTables = ["doctors", "technicians", "shades", "rate_list", "expenses", "inventory", "settings"];
    for (const table of independentTables) {
      const rows = db.prepare(`SELECT * FROM ${table}`).all() as any[];
      console.log(`Migrating ${rows.length} rows from ${table}...`);
      for (const row of rows) {
        const { id, ...data } = row;
        // Convert timestamps if necessary
        if (data.created_at && typeof data.created_at === 'string') {
          data.created_at = new Date(data.created_at).getTime();
        }
        if (data.updated_at && typeof data.updated_at === 'string') {
          data.updated_at = new Date(data.updated_at).getTime();
        }
        if (data.last_updated && typeof data.last_updated === 'string') {
          data.last_updated = new Date(data.last_updated).getTime();
        }

        const convexId = await callMutation("migration:insertRow", { table, data });
        if (id) idMap[table] = { ...idMap[table], [id]: convexId };
      }
    }

    // 2. Users (depends on doctors)
    const users = db.prepare("SELECT * FROM users").all() as any[];
    console.log(`Migrating ${users.length} users...`);
    for (const user of users) {
      const { id, ...data } = user;
      if (data.doctor_id) data.doctor_id = idMap.doctors[data.doctor_id];
      if (data.created_at) data.created_at = new Date(data.created_at).getTime();
      
      const convexId = await callMutation("migration:insertRow", { table: "users", data });
      idMap.users[id] = convexId;
    }

    // 3. Cases (depends on doctors, technicians)
    const cases = db.prepare("SELECT * FROM cases").all() as any[];
    console.log(`Migrating ${cases.length} cases...`);
    for (const c of cases) {
      const { id, ...data } = c;
      data.doctor_id = idMap.doctors[data.doctor_id];
      if (data.technician_id) data.technician_id = idMap.technicians[data.technician_id];
      if (data.created_at) data.created_at = new Date(data.created_at).getTime();
      
      const convexId = await callMutation("migration:insertRow", { table: "cases", data });
      idMap.cases[id] = convexId;
    }

    // 4. Invoices (depends on doctors)
    const invoices = db.prepare("SELECT * FROM invoices").all() as any[];
    console.log(`Migrating ${invoices.length} invoices...`);
    for (const inv of invoices) {
      const { id, ...data } = inv;
      data.doctor_id = idMap.doctors[data.doctor_id];
      if (data.created_at) data.created_at = new Date(data.created_at).getTime();
      if (data.last_reminder_sent_at) data.last_reminder_sent_at = new Date(data.last_reminder_sent_at).getTime();

      const convexId = await callMutation("migration:insertRow", { table: "invoices", data });
      idMap.invoices[id] = convexId;
    }

    // 5. Invoice Items (depends on invoices, cases)
    const invoiceItems = db.prepare("SELECT * FROM invoice_items").all() as any[];
    console.log(`Migrating ${invoiceItems.length} invoice items...`);
    for (const item of invoiceItems) {
      const { id, ...data } = item;
      data.invoice_id = idMap.invoices[data.invoice_id];
      if (data.case_id) data.case_id = idMap.cases[data.case_id];
      await callMutation("migration:insertRow", { table: "invoice_items", data });
    }

    // 6. Payments (depends on doctors, invoices)
    const payments = db.prepare("SELECT * FROM payments").all() as any[];
    console.log(`Migrating ${payments.length} payments...`);
    for (const p of payments) {
      const { id, ...data } = p;
      data.doctor_id = idMap.doctors[data.doctor_id];
      if (data.invoice_id) data.invoice_id = idMap.invoices[data.invoice_id];
      if (data.created_at) data.created_at = new Date(data.created_at).getTime();
      await callMutation("migration:insertRow", { table: "payments", data });
    }

    // 7. Case History (depends on cases)
    const caseHistory = db.prepare("SELECT * FROM case_history").all() as any[];
    console.log(`Migrating ${caseHistory.length} case history entries...`);
    for (const h of caseHistory) {
      const { id, ...data } = h;
      data.case_id = idMap.cases[data.case_id];
      if (data.updated_at) data.updated_at = new Date(data.updated_at).getTime();
      await callMutation("migration:insertRow", { table: "case_history", data });
    }

    // 8. Case Tasks (depends on cases, technicians)
    const caseTasks = db.prepare("SELECT * FROM case_tasks").all() as any[];
    console.log(`Migrating ${caseTasks.length} case tasks...`);
    for (const t of caseTasks) {
      const { id, ...data } = t;
      data.case_id = idMap.cases[data.case_id];
      if (data.technician_id) data.technician_id = idMap.technicians[data.technician_id];
      if (data.created_at) data.created_at = new Date(data.created_at).getTime();
      if (data.completed_at) data.completed_at = new Date(data.completed_at).getTime();
      await callMutation("migration:insertRow", { table: "case_tasks", data });
    }

    console.log("Migration complete!");
  } catch (e: any) {
    console.error("Migration failed:", e.message);
  }
}

migrate().catch(console.error);
