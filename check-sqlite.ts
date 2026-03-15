import Database from "better-sqlite3";
const db = new Database("dental_architect.db");
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
for (const table of tables) {
    try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
        console.log(`${table}: ${count.count}`);
    } catch (e) {
        console.log(`${table}: table not found or error`);
    }
}
