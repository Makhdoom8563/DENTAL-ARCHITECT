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
  console.log("Starting migration to Convex URL:", convexUrl);
  const results = { doctors: 0, technicians: 0 };
  
  try {
    console.log("Testing connection with a query...");
    const test = await client.query(api.doctors.list);
    console.log("Connection successful, found", test.length, "doctors in Convex");
  } catch (e: any) {
    console.error("Connection test failed:", e.message);
    // Continue anyway to see if mutations work
  }

  // 1. Doctors
  const doctors = db.prepare("SELECT * FROM doctors").all() as any[];
  console.log(`Migrating ${doctors.length} doctors...`);
  for (const doc of doctors) {
    const response = await fetch(`${convexUrl}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "doctors:create",
        args: {
          name: doc.name,
          clinic_name: doc.clinic_name,
          phone: doc.phone,
          email: doc.email,
          address: doc.address,
          specialization: doc.specialization,
          image_url: doc.image_url,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to migrate doctor ${doc.name}: ${response.status} ${errorText}`);
      continue;
    }

    console.log(`Migrated doctor: ${doc.name}`);
    results.doctors++;
  }

  // 2. Technicians
  const technicians = db.prepare("SELECT * FROM technicians").all() as any[];
  console.log(`Migrating ${technicians.length} technicians...`);
  for (const tech of technicians) {
    const response = await fetch(`${convexUrl}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "technicians:create",
        args: {
          name: tech.name,
          specialization: tech.specialization,
          phone: tech.phone,
          status: tech.status,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to migrate technician ${tech.name}: ${response.status} ${errorText}`);
      continue;
    }

    console.log(`Migrated technician: ${tech.name}`);
    results.technicians++;
  }
  
  console.log(`Migration complete! Migrated ${results.doctors} doctors and ${results.technicians} technicians.`);
}

migrate().catch(console.error);
