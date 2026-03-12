import Database from 'better-sqlite3';

const db = new Database('dental_architect.db');
try {
  const info = db.prepare(
    "INSERT INTO doctors (name, clinic_name, phone, email, address, specialization, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run("Test Doctor", "Test Clinic", "123", "test@test.com", "Test Addr", "Test Spec", "");
  console.log("Success:", info.lastInsertRowid);
} catch (e) {
  console.error("Error:", e);
}
