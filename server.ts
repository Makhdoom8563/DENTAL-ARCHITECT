import express from "express";
import session from "express-session";
import sqliteStoreFactory from "better-sqlite3-session-store";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("dental_architect.db");
const SqliteStore = sqliteStoreFactory(session);

// Initialize Database
db.exec(
  "CREATE TABLE IF NOT EXISTS doctors (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  name TEXT NOT NULL," +
  "  clinic_name TEXT," +
  "  phone TEXT," +
  "  email TEXT," +
  "  address TEXT," +
  "  specialization TEXT," +
  "  image_url TEXT," +
  "  notes TEXT," +
  "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
  ");" +
  "" +
  "CREATE TABLE IF NOT EXISTS technicians (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  name TEXT NOT NULL," +
  "  specialization TEXT," +
  "  phone TEXT," +
  "  status TEXT DEFAULT 'Active'," +
  "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
  ");" +
  "" +
  "CREATE TABLE IF NOT EXISTS users (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  username TEXT UNIQUE NOT NULL," +
  "  password TEXT NOT NULL," +
  "  role TEXT DEFAULT 'Staff'," +
  "  doctor_id INTEGER," +
  "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
  "  FOREIGN KEY (doctor_id) REFERENCES doctors(id)" +
  ");" +
  "" +
  "CREATE TABLE IF NOT EXISTS invoices (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  doctor_id INTEGER," +
  "  invoice_no INTEGER UNIQUE NOT NULL," +
  "  invoice_date DATE," +
  "  amount REAL DEFAULT 0," +
  "  status TEXT DEFAULT 'Unpaid'," +
  "  due_date DATE," +
  "  last_reminder_sent_at DATETIME," +
  "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
  "  FOREIGN KEY (doctor_id) REFERENCES doctors(id)" +
  ");" +
  "CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON invoices(invoice_no);" +
  "" +
  "CREATE TABLE IF NOT EXISTS cases (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  doctor_id INTEGER," +
  "  technician_id INTEGER," +
  "  patient_name TEXT NOT NULL," +
  "  case_type TEXT NOT NULL," +
  "  material TEXT," +
  "  shade TEXT," +
  "  selected_teeth TEXT," +
  "  priority TEXT DEFAULT 'Normal'," +
  "  status TEXT DEFAULT 'Pending'," +
  "  receiving_date DATE DEFAULT CURRENT_DATE," +
  "  due_date DATE," +
  "  delivery_date DATE," +
  "  cost REAL DEFAULT 0," +
  "  notes TEXT," +
  "  image_url TEXT," +
  "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
  "  FOREIGN KEY (doctor_id) REFERENCES doctors(id)," +
  "  FOREIGN KEY (technician_id) REFERENCES technicians(id)" +
  ");" +
  "" +
  "CREATE TABLE IF NOT EXISTS invoice_items (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  invoice_id INTEGER," +
  "  case_id INTEGER," +
  "  description TEXT," +
  "  amount REAL NOT NULL," +
  "  FOREIGN KEY (invoice_id) REFERENCES invoices(id)," +
  "  FOREIGN KEY (case_id) REFERENCES cases(id)" +
  ");" +
  "" +
  "CREATE TABLE IF NOT EXISTS payments (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  doctor_id INTEGER," +
  "  invoice_id INTEGER," +
  "  amount REAL NOT NULL," +
  "  payment_method TEXT," +
  "  reference_no TEXT," +
  "  payment_date DATE DEFAULT CURRENT_DATE," +
  "  notes TEXT," +
  "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
  "  FOREIGN KEY (doctor_id) REFERENCES doctors(id)," +
  "  FOREIGN KEY (invoice_id) REFERENCES invoices(id)" +
  ");" +
  "" +
  "CREATE TABLE IF NOT EXISTS expenses (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  category TEXT NOT NULL," +
  "  amount REAL NOT NULL," +
  "  description TEXT," +
  "  expense_date DATE DEFAULT CURRENT_DATE," +
  "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
  ");" +
  "" +
  "CREATE TABLE IF NOT EXISTS inventory (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  item_name TEXT NOT NULL," +
  "  category TEXT," +
  "  quantity REAL DEFAULT 0," +
  "  unit TEXT," +
  "  min_stock_level REAL DEFAULT 0," +
  "  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP" +
  ");" +
  "" +
  "CREATE TABLE IF NOT EXISTS case_history (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  case_id INTEGER," +
  "  status TEXT," +
  "  comment TEXT," +
  "  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
  "  FOREIGN KEY (case_id) REFERENCES cases(id)" +
  ");" +
  "" +
  "CREATE TABLE IF NOT EXISTS rate_list (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  case_type TEXT NOT NULL," +
  "  material TEXT NOT NULL," +
  "  price REAL NOT NULL," +
  "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
  ");" +
  "" +
  "CREATE TABLE IF NOT EXISTS shades (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  name TEXT UNIQUE NOT NULL," +
  "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
  ");" +
  "" +
  "CREATE TABLE IF NOT EXISTS settings (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  key TEXT UNIQUE NOT NULL," +
  "  value TEXT," +
  "  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
  ");" +
  "" +
  "CREATE TABLE IF NOT EXISTS case_tasks (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  case_id INTEGER," +
  "  task_name TEXT NOT NULL," +
  "  technician_id INTEGER," +
  "  status TEXT DEFAULT 'Pending'," +
  "  completed_at DATETIME," +
  "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
  "  FOREIGN KEY (case_id) REFERENCES cases(id)," +
  "  FOREIGN KEY (technician_id) REFERENCES technicians(id)" +
  ");" +
  "" +
  "CREATE INDEX IF NOT EXISTS idx_cases_doctor_id ON cases(doctor_id);" +
  "CREATE INDEX IF NOT EXISTS idx_payments_doctor_id ON payments(doctor_id);" +
  "CREATE INDEX IF NOT EXISTS idx_invoices_doctor_id ON invoices(doctor_id);" +
  "CREATE INDEX IF NOT EXISTS idx_users_doctor_id ON users(doctor_id);" +
  "" +
  "INSERT OR IGNORE INTO shades (name) VALUES ('A1'), ('A2'), ('A3'), ('A3.5'), ('A4'), ('B1'), ('B2'), ('B3'), ('B4'), ('C1'), ('C2'), ('C3'), ('C4'), ('D2'), ('D3'), ('D4'), ('BL1'), ('BL2'), ('BL3'), ('BL4');"
);

// Insert or update default admin with hashed password
const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get() as any;
const defaultPassword = 'admin123';
if (!adminUser) {
  const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'Admin')").run('admin', hashedPassword);
} else if (!adminUser.password.startsWith('$2a$') && !adminUser.password.startsWith('$2b$')) {
  // If password is not hashed, hash it
  const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
  db.prepare("UPDATE users SET password = ? WHERE username = 'admin'").run(hashedPassword);
}

// Migration: Ensure specialization column exists
const runMigrations = () => {
  try {
    // Doctors migrations
    const doctorsInfo = db.prepare("PRAGMA table_info(doctors)").all() as any[];
    if (doctorsInfo.length > 0) {
      const doctorCols = [
        { name: 'specialization', type: 'TEXT' },
        { name: 'image_url', type: 'TEXT' },
        { name: 'notes', type: 'TEXT' }
      ];
      for (const col of doctorCols) {
        if (!doctorsInfo.some(c => c.name === col.name)) {
          try {
            db.exec("ALTER TABLE doctors ADD COLUMN " + col.name + " " + col.type);
            console.log("Added " + col.name + " column to doctors table");
          } catch (e) {
            console.error("Failed to add " + col.name + " to doctors:", e);
          }
        }
      }
    }

    // Cases migrations
    const casesInfo = db.prepare("PRAGMA table_info(cases)").all() as any[];
    if (casesInfo.length > 0) {
      const columnsToAdd = [
        { name: 'technician_id', type: 'INTEGER' },
        { name: 'priority', type: "TEXT DEFAULT 'Normal'" },
        { name: 'receiving_date', type: "DATE DEFAULT CURRENT_DATE" },
        { name: 'delivery_date', type: 'DATE' },
        { name: 'cost', type: 'REAL DEFAULT 0' },
        { name: 'selected_teeth', type: 'TEXT' },
        { name: 'image_url', type: 'TEXT' },
        { name: 'preparation_type', type: 'TEXT' }
      ];

      for (const col of columnsToAdd) {
        if (!casesInfo.some(c => c.name === col.name)) {
          try {
            db.exec("ALTER TABLE cases ADD COLUMN " + col.name + " " + col.type);
            console.log("Added " + col.name + " column to cases table");
          } catch (e) {
            console.error("Failed to add " + col.name + " to cases:", e);
          }
        }
      }
    }

    // Users migrations
    const usersInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
    if (usersInfo.length > 0) {
      if (!usersInfo.some(c => c.name === 'doctor_id')) {
        db.exec("ALTER TABLE users ADD COLUMN doctor_id INTEGER");
        console.log("Added doctor_id column to users table");
      }
      if (!usersInfo.some(c => c.name === 'token')) {
        db.exec("ALTER TABLE users ADD COLUMN token TEXT");
        console.log("Added token column to users table");
      }
    }

    // Invoices migrations
    const invoicesInfo = db.prepare("PRAGMA table_info(invoices)").all() as any[];
    if (invoicesInfo.length > 0) {
      if (!invoicesInfo.some(c => c.name === 'last_reminder_sent_at')) {
        db.exec("ALTER TABLE invoices ADD COLUMN last_reminder_sent_at DATETIME");
        console.log("Added last_reminder_sent_at column to invoices table");
      }
    }

    // Payments migrations
    const paymentsInfo = db.prepare("PRAGMA table_info(payments)").all() as any[];
    if (paymentsInfo.length > 0) {
      if (!paymentsInfo.some(c => c.name === 'invoice_id')) {
        db.exec("ALTER TABLE payments ADD COLUMN invoice_id INTEGER");
        console.log("Added invoice_id column to payments table");
      }
    }
  } catch (err) {
    console.error("Migration check failed:", err);
  }
};

runMigrations();

const seedDatabase = () => {
  try {
    // Check if doctors table is empty
    const doctorsCount = db.prepare("SELECT COUNT(*) as count FROM doctors").get() as { count: number };
    if (doctorsCount.count === 0) {
      console.log("Seeding database with Pakistan sample data...");

      // 1. Seed Doctors
      const insertDoctor = db.prepare("INSERT INTO doctors (name, clinic_name, phone, email, address, specialization) VALUES (?, ?, ?, ?, ?, ?)");
      const doc1 = insertDoctor.run("Dr. Ahmed Khan", "Al-Shifa Dental Clinic", "0300-1234567", "ahmed.khan@example.pk", "Gulberg III, Lahore", "Prosthodontist");
      const doc2 = insertDoctor.run("Dr. Fatima Ali", "Karachi Smiles", "0333-9876543", "fatima.ali@example.pk", "Clifton, Karachi", "Orthodontist");
      const doc3 = insertDoctor.run("Dr. Usman Tariq", "Islamabad Dental Care", "0345-5556667", "usman.tariq@example.pk", "F-8 Markaz, Islamabad", "General Dentist");

      // 2. Seed Technicians
      const insertTech = db.prepare("INSERT INTO technicians (name, phone, specialization) VALUES (?, ?, ?)");
      const tech1 = insertTech.run("Muhammad Bilal", "0321-1112223", "Ceramics");
      const tech2 = insertTech.run("Zainab Bibi", "0311-4445556", "CAD/CAM");
      const tech3 = insertTech.run("Ali Hassan", "0301-7778889", "Metalwork");

      // 3. Seed Rate List
      const insertRate = db.prepare("INSERT INTO rate_list (case_type, material, price) VALUES (?, ?, ?)");
      insertRate.run("Crown", "Zirconia", 12000);
      insertRate.run("Crown", "PFM", 6000);
      insertRate.run("Bridge", "Zirconia", 35000);
      insertRate.run("Bridge", "PFM", 18000);
      insertRate.run("Veneer", "E-Max", 15000);
      insertRate.run("Denture", "Acrylic", 25000);

      // 4. Seed Cases
      const insertCase = db.prepare("INSERT INTO cases (doctor_id, technician_id, patient_name, case_type, material, shade, priority, status, receiving_date, due_date, cost, selected_teeth, preparation_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const case1 = insertCase.run(doc1.lastInsertRowid, tech1.lastInsertRowid, "Omar Farooq", "Crown", "Zirconia", "A2", "Normal", "In Progress", today.toISOString().split('T')[0], nextWeek.toISOString().split('T')[0], 12000, "11,12", "Shoulder");
      const case2 = insertCase.run(doc2.lastInsertRowid, tech2.lastInsertRowid, "Ayesha Siddiqa", "Veneer", "E-Max", "B1", "High", "Pending", today.toISOString().split('T')[0], nextWeek.toISOString().split('T')[0], 15000, "21,22", "Chamfer");
      const case3 = insertCase.run(doc3.lastInsertRowid, tech3.lastInsertRowid, "Hassan Raza", "Bridge", "PFM", "A3", "Urgent", "Trial", today.toISOString().split('T')[0], nextWeek.toISOString().split('T')[0], 18000, "35,36,37", "Knife Edge");

      // 5. Seed Case Tasks
      const insertTask = db.prepare("INSERT INTO case_tasks (case_id, task_name, technician_id, status) VALUES (?, ?, ?, ?)");
      insertTask.run(case1.lastInsertRowid, "Waxing", tech1.lastInsertRowid, "Completed");
      insertTask.run(case1.lastInsertRowid, "Casting", tech1.lastInsertRowid, "In Progress");
      insertTask.run(case2.lastInsertRowid, "Scanning", tech2.lastInsertRowid, "Pending");

      // 6. Seed Invoices
      const insertInvoice = db.prepare("INSERT INTO invoices (doctor_id, invoice_date, due_date, amount, status) VALUES (?, ?, ?, ?, ?)");
      const inv1 = insertInvoice.run(doc1.lastInsertRowid, today.toISOString().split('T')[0], nextWeek.toISOString().split('T')[0], 12000, "Unpaid");
      
      const insertInvoiceItem = db.prepare("INSERT INTO invoice_items (invoice_id, case_id, amount) VALUES (?, ?, ?)");
      insertInvoiceItem.run(inv1.lastInsertRowid, case1.lastInsertRowid, 12000);

      // 7. Seed Payments
      const insertPayment = db.prepare("INSERT INTO payments (doctor_id, amount, payment_date, payment_method, reference_no) VALUES (?, ?, ?, ?, ?)");
      insertPayment.run(doc1.lastInsertRowid, 5000, today.toISOString().split('T')[0], "Bank Transfer", "Meezan-12345");

      // 8. Seed Expenses
      const insertExpense = db.prepare("INSERT INTO expenses (category, amount, expense_date, description) VALUES (?, ?, ?, ?)");
      insertExpense.run("Materials", 45000, today.toISOString().split('T')[0], "Zirconia blocks from Dental Supply Co. Lahore");
      insertExpense.run("Utilities", 15000, today.toISOString().split('T')[0], "LESCO Electricity Bill");

      // 9. Seed Inventory
      const insertInventory = db.prepare("INSERT INTO inventory (item_name, category, quantity, unit, min_threshold, cost_per_unit) VALUES (?, ?, ?, ?, ?, ?)");
      insertInventory.run("Zirconia Blanks", "Materials", 20, "pcs", 5, 2500);
      insertInventory.run("Dental Plaster", "Materials", 50, "kg", 10, 150);
      insertInventory.run("Polishing Paste", "Consumables", 15, "tubes", 3, 800);

      console.log("Database seeded successfully.");
    }
  } catch (err) {
    console.error("Seeding failed:", err);
  }
};

seedDatabase();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '50mb' }));

  // Session configuration
  app.use(session({
    store: new SqliteStore({
      client: db, 
      expired: {
        clear: true,
        intervalMs: 900000 //ms = 15min
      }
    }),
    secret: process.env.SESSION_SECRET || 'dental-architect-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Middleware to check authentication
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const user = db.prepare("SELECT * FROM users WHERE token = ?").get(token) as any;
      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        (req as any).user = userWithoutPassword;
        return next();
      }
    }
    
    if ((req.session as any).user) {
      (req as any).user = (req.session as any).user;
      return next();
    }
    
    res.status(401).json({ error: "Not authenticated" });
  };

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      user = db.prepare("SELECT * FROM users WHERE token = ?").get(token) as any;
    } else if ((req.session as any).user) {
      user = (req.session as any).user;
    }
    
    if (user && user.role === 'Admin') {
      (req as any).user = user;
      return next();
    }
    
    res.status(403).json({ error: "Admin access required" });
  };

  const requireManager = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      user = db.prepare("SELECT * FROM users WHERE token = ?").get(token) as any;
    } else if ((req.session as any).user) {
      user = (req.session as any).user;
    }
    
    if (user && ['Admin', 'Manager'].includes(user.role)) {
      (req as any).user = user;
      return next();
    }
    
    res.status(403).json({ error: "Manager access required" });
  };

  // Migration for existing database
try {
  db.exec("ALTER TABLE invoices ADD COLUMN invoice_date DATE;");
} catch (e) {}

try {
  db.exec("CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON invoices(invoice_no);");
} catch (e) {}

try {
  db.exec("ALTER TABLE payments ADD COLUMN payment_method TEXT;");
} catch (e) {}

// API Routes
  app.get("/api/ping", (req, res) => {
    res.json({ pong: true, time: new Date().toISOString() });
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
      
      if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
          const crypto = require('crypto');
          const token = crypto.randomBytes(32).toString('hex');
          
          db.prepare("UPDATE users SET token = ? WHERE id = ?").run(token, user.id);
          
          const { password: _, ...userWithoutPassword } = user;
          userWithoutPassword.token = token;
          
          (req.session as any).userId = user.id;
          (req.session as any).user = userWithoutPassword;
          
          return res.json(userWithoutPassword);
        }
      }
      res.status(401).json({ error: "Invalid credentials" });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      db.prepare("UPDATE users SET token = NULL WHERE token = ?").run(token);
    }
    
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Could not log out" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const user = db.prepare("SELECT * FROM users WHERE token = ?").get(token) as any;
      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      }
    }
    
    if ((req.session as any).user) {
      res.json((req.session as any).user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.post("/api/users/doctor", requireAdmin, (req, res) => {
    const { username, password, doctor_id } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const info = db.prepare("INSERT INTO users (username, password, role, doctor_id) VALUES (?, ?, 'Doctor', ?)")
        .run(username, hashedPassword, doctor_id);
      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.get("/api/doctors/:id/user", requireAdmin, (req, res) => {
    const user = db.prepare("SELECT id, username, role FROM users WHERE doctor_id = ?").get(req.params.id);
    res.json(user || null);
  });

  app.get("/api/doctors", requireAuth, (req, res) => {
    const doctors = db.prepare(
      "SELECT doctors.*, " +
      "(SELECT username FROM users WHERE users.doctor_id = doctors.id LIMIT 1) as portal_username " +
      "FROM doctors " +
      "ORDER BY name ASC"
    ).all();
    res.json(doctors);
  });

  app.get("/api/doctors/:id", requireAuth, (req, res) => {
    try {
      const doctor = db.prepare(
        "SELECT doctors.*, " +
        "(SELECT username FROM users WHERE users.doctor_id = doctors.id LIMIT 1) as portal_username " +
        "FROM doctors " +
        "WHERE id = ?"
      ).get(req.params.id);
      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      res.json(doctor);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/doctors", requireAuth, (req, res) => {
    try {
      const { name, clinic_name, phone, email, address, specialization, image_url, notes, portal_username, portal_password } = req.body;
      
      const insertDoctor = db.transaction(() => {
        const info = db.prepare(
          "INSERT INTO doctors (name, clinic_name, phone, email, address, specialization, image_url, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(name, clinic_name, phone, email, address, specialization, image_url, notes);
        
        const doctorId = info.lastInsertRowid;
        
        if (portal_username && portal_password) {
          const hashedPassword = bcrypt.hashSync(portal_password, 10);
          db.prepare(
            "INSERT INTO users (username, password, role, doctor_id) VALUES (?, ?, 'Doctor', ?)"
          ).run(portal_username, hashedPassword, doctorId);
        }
        
        return doctorId;
      });
      
      const id = insertDoctor();
      res.json({ id });
    } catch (error: any) {
      console.error("Error adding doctor:", error);
      res.status(500).json({ error: error.message || "Failed to add doctor" });
    }
  });

  app.put("/api/doctors/:id", requireAuth, (req, res) => {
    try {
      const { name, clinic_name, phone, email, address, specialization, image_url, notes, portal_username, portal_password } = req.body;
      const doctorId = req.params.id;
      
      const updateDoctor = db.transaction(() => {
        db.prepare(
          "UPDATE doctors " +
          "SET name = ?, clinic_name = ?, phone = ?, email = ?, address = ?, specialization = ?, image_url = ?, notes = ? " +
          "WHERE id = ?"
        ).run(name, clinic_name, phone, email, address, specialization, image_url, notes, doctorId);
        
        if (portal_username) {
          const existingUser = db.prepare("SELECT id FROM users WHERE doctor_id = ?").get(doctorId) as any;
          if (existingUser) {
            if (portal_password) {
              const hashedPassword = bcrypt.hashSync(portal_password, 10);
              db.prepare("UPDATE users SET username = ?, password = ? WHERE doctor_id = ?").run(portal_username, hashedPassword, doctorId);
            } else {
              db.prepare("UPDATE users SET username = ? WHERE doctor_id = ?").run(portal_username, doctorId);
            }
          } else if (portal_password) {
            const hashedPassword = bcrypt.hashSync(portal_password, 10);
            db.prepare(
              "INSERT INTO users (username, password, role, doctor_id) VALUES (?, ?, 'Doctor', ?)"
            ).run(portal_username, hashedPassword, doctorId);
          }
        }
      });
      
      updateDoctor();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating doctor:", error);
      res.status(500).json({ error: error.message || "Failed to update doctor" });
    }
  });

  app.delete("/api/doctors/:id", requireAdmin, (req, res) => {
    // Check if doctor has cases
    const casesCount = db.prepare("SELECT COUNT(*) as count FROM cases WHERE doctor_id = ?").get(req.params.id) as { count: number };
    if (casesCount.count > 0) {
      return res.status(400).json({ error: "Cannot delete doctor with existing cases" });
    }
    db.prepare("DELETE FROM doctors WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/cases", requireAuth, (req, res) => {
    const { doctor_id, uninvoiced } = req.query;
    let query = `
      SELECT cases.*, doctors.name as doctor_name, technicians.name as technician_name 
      FROM cases 
      LEFT JOIN doctors ON cases.doctor_id = doctors.id 
      LEFT JOIN technicians ON cases.technician_id = technicians.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (doctor_id) {
      query += " AND cases.doctor_id = ?";
      params.push(doctor_id);
    }

    if (uninvoiced === 'true') {
      query += " AND cases.id NOT IN (SELECT case_id FROM invoice_items WHERE case_id IS NOT NULL)";
      // Also only completed/delivered cases are usually invoiced
      query += " AND cases.status IN ('Completed', 'Delivered')";
    }

    query += " ORDER BY cases.created_at DESC";
    
    const cases = db.prepare(query).all(...params);
    res.json(cases);
  });

  app.get("/api/cases/:id", requireAuth, (req, res) => {
    const dentalCase = db.prepare(
      "SELECT cases.*, doctors.name as doctor_name, technicians.name as technician_name " +
      "FROM cases " +
      "LEFT JOIN doctors ON cases.doctor_id = doctors.id " +
      "LEFT JOIN technicians ON cases.technician_id = technicians.id " +
      "WHERE cases.id = ?"
    ).get(req.params.id);
    res.json(dentalCase);
  });

  app.post("/api/cases", requireAuth, (req, res) => {
    const { 
      doctor_id, technician_id, patient_name, case_type, material, 
      shade, selected_teeth, priority, due_date, receiving_date, 
      delivery_date, cost, notes, image_url, preparation_type 
    } = req.body;
    
    const info = db.prepare(`
      INSERT INTO cases (
        doctor_id, technician_id, patient_name, case_type, material, 
        shade, selected_teeth, priority, due_date, receiving_date, 
        delivery_date, cost, notes, image_url, preparation_type
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      doctor_id, technician_id, patient_name, case_type, material, 
      shade, selected_teeth, priority, due_date, receiving_date, 
      delivery_date, cost, notes, image_url, preparation_type
    );
    
    // Add initial history
    db.prepare("INSERT INTO case_history (case_id, status, comment) VALUES (?, ?, ?)")
      .run(info.lastInsertRowid, 'Pending', 'Case created');
      
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/cases/:id", requireAuth, (req, res) => {
    const { 
      status, technician_id, patient_name, case_type, material, 
      shade, selected_teeth, priority, due_date, receiving_date, 
      delivery_date, cost, notes, image_url, preparation_type, comment 
    } = req.body;
    const id = req.params.id;

    try {
      db.prepare(
        "UPDATE cases " +
        "SET status = COALESCE(?, status), " +
        "technician_id = COALESCE(?, technician_id), " +
        "patient_name = COALESCE(?, patient_name), " +
        "case_type = COALESCE(?, case_type), " +
        "material = COALESCE(?, material), " +
        "shade = COALESCE(?, shade), " +
        "selected_teeth = COALESCE(?, selected_teeth), " +
        "priority = COALESCE(?, priority), " +
        "due_date = COALESCE(?, due_date), " +
        "receiving_date = COALESCE(?, receiving_date), " +
        "delivery_date = COALESCE(?, delivery_date), " +
        "cost = COALESCE(?, cost), " +
        "notes = COALESCE(?, notes), " +
        "image_url = COALESCE(?, image_url), " +
        "preparation_type = COALESCE(?, preparation_type) " +
        "WHERE id = ?"
      ).run(
        status, technician_id, patient_name, case_type, material, 
        shade, selected_teeth, priority, due_date, receiving_date, 
        delivery_date, cost, notes, image_url, preparation_type,
        id
      );

      if (status) {
        db.prepare("INSERT INTO case_history (case_id, status, comment) VALUES (?, ?, ?)")
          .run(id, status, comment || `Status updated to ${status}`);
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update case" });
    }
  });

  app.get("/api/cases/:id/history", requireAuth, (req, res) => {
    const history = db.prepare("SELECT * FROM case_history WHERE case_id = ? ORDER BY updated_at DESC").all(req.params.id);
    res.json(history);
  });

  // Technician Endpoints
  app.get("/api/technicians", requireAuth, (req, res) => {
    const technicians = db.prepare("SELECT * FROM technicians ORDER BY name ASC").all();
    res.json(technicians);
  });

  app.post("/api/technicians", requireAuth, (req, res) => {
    const { name, specialization, phone, status } = req.body;
    const info = db.prepare(
      "INSERT INTO technicians (name, specialization, phone, status) VALUES (?, ?, ?, ?)"
    ).run(name, specialization, phone, status || 'Active');
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/technicians/:id", requireAuth, (req, res) => {
    const { name, specialization, phone, status } = req.body;
    try {
      db.prepare(
        "UPDATE technicians SET name = ?, specialization = ?, phone = ?, status = ? WHERE id = ?"
      ).run(name, specialization, phone, status, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update technician" });
    }
  });

  app.delete("/api/technicians/:id", requireAdmin, (req, res) => {
    try {
      // Check if technician has assigned cases
      const casesCount = db.prepare("SELECT COUNT(*) as count FROM cases WHERE technician_id = ?").get(req.params.id) as { count: number };
      if (casesCount.count > 0) {
        return res.status(400).json({ error: "Cannot delete technician with assigned cases. Please reassign cases first." });
      }
      db.prepare("DELETE FROM technicians WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete technician" });
    }
  });

  // Financial Endpoints
  app.get("/api/payments", requireAuth, (req, res) => {
    const payments = db.prepare(
      "SELECT payments.*, doctors.name as doctor_name, invoices.invoice_no " +
      "FROM payments " +
      "LEFT JOIN doctors ON payments.doctor_id = doctors.id " +
      "LEFT JOIN invoices ON payments.invoice_id = invoices.id " +
      "ORDER BY payment_date DESC"
    ).all();
    res.json(payments);
  });

  app.post("/api/payments", requireAuth, (req, res) => {
    const { doctor_id, invoice_id, amount, payment_method, reference_no, payment_date, notes } = req.body;
    
    try {
      const result = db.transaction(() => {
        const info = db.prepare(`
          INSERT INTO payments (doctor_id, invoice_id, amount, payment_method, reference_no, payment_date, notes) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(doctor_id, invoice_id, amount, payment_method, reference_no, payment_date, notes);

        if (invoice_id) {
          // Update invoice status
          const invoice = db.prepare(`
            SELECT 
              (SELECT SUM(amount) FROM invoice_items WHERE invoice_id = ?) as total_amount,
              (SELECT SUM(amount) FROM payments WHERE invoice_id = ?) as total_paid
          `).get(invoice_id, invoice_id) as any;

          let newStatus = 'Unpaid';
          if (invoice.total_paid >= invoice.total_amount) {
            newStatus = 'Paid';
          } else if (invoice.total_paid > 0) {
            newStatus = 'Partial';
          }

          db.prepare("UPDATE invoices SET status = ? WHERE id = ?").run(newStatus, invoice_id);
        }

        return { id: info.lastInsertRowid };
      })();
      
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to record payment" });
    }
  });

  app.get("/api/invoices/:id/payments", requireAuth, (req, res) => {
    const payments = db.prepare("SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC").all(req.params.id);
    res.json(payments);
  });

  app.get("/api/expenses", requireManager, (req, res) => {
    const expenses = db.prepare("SELECT * FROM expenses ORDER BY expense_date DESC").all();
    res.json(expenses);
  });

  app.post("/api/expenses", (req, res) => {
    const { category, amount, description, expense_date } = req.body;
    const info = db.prepare(`
      INSERT INTO expenses (category, amount, description, expense_date) 
      VALUES (?, ?, ?, ?)
    `).run(category, amount, description, expense_date);
    res.json({ id: info.lastInsertRowid });
  });

  // Inventory Endpoints
  app.get("/api/inventory", (req, res) => {
    const items = db.prepare("SELECT * FROM inventory ORDER BY item_name ASC").all();
    res.json(items);
  });

  app.post("/api/inventory", (req, res) => {
    const { item_name, category, quantity, unit, min_stock_level } = req.body;
    const info = db.prepare(`
      INSERT INTO inventory (item_name, category, quantity, unit, min_stock_level) 
      VALUES (?, ?, ?, ?, ?)
    `).run(item_name, category, quantity, unit, min_stock_level);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/inventory/:id", (req, res) => {
    const { item_name, category, quantity, unit, min_stock_level } = req.body;
    try {
      if (item_name !== undefined) {
        db.prepare(`
          UPDATE inventory 
          SET item_name = ?, category = ?, quantity = ?, unit = ?, min_stock_level = ?, last_updated = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(item_name, category, quantity, unit, min_stock_level, req.params.id);
      } else {
        db.prepare("UPDATE inventory SET quantity = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?")
          .run(quantity, req.params.id);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update inventory" });
    }
  });

  // Enhanced Report Endpoints
  app.get("/api/doctors/:id/payments", (req, res) => {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT payments.*, invoices.invoice_no 
      FROM payments 
      LEFT JOIN invoices ON payments.invoice_id = invoices.id 
      WHERE payments.doctor_id = ?
    `;
    const params: any[] = [req.params.id];
    
    if (startDate) {
      query += " AND payments.payment_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND payments.payment_date <= ?";
      params.push(endDate);
    }
    
    query += " ORDER BY payments.payment_date DESC";
    const payments = db.prepare(query).all(...params);
    res.json(payments);
  });

  app.get("/api/doctors/:id/balance", (req, res) => {
    const totalInvoiced = db.prepare("SELECT SUM(amount) as total FROM invoices WHERE doctor_id = ?").get(req.params.id) as { total: number };
    const totalPaid = db.prepare("SELECT SUM(amount) as total FROM payments WHERE doctor_id = ?").get(req.params.id) as { total: number };
    
    res.json({
      total_invoiced: totalInvoiced.total || 0,
      total_paid: totalPaid.total || 0,
      outstanding_balance: (totalInvoiced.total || 0) - (totalPaid.total || 0)
    });
  });

  app.get("/api/doctors/:id/portal-data", requireAuth, (req, res) => {
    const doctorId = req.params.id;
    const user = (req as any).user;

    // Doctors can only see their own data, Admins can see everything
    if (user.role === 'Doctor' && String(user.doctor_id) !== String(doctorId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { startDate, endDate } = req.query;

    const cases = db.prepare(
      "SELECT cases.*, doctors.name as doctor_name " +
      "FROM cases " +
      "LEFT JOIN doctors ON cases.doctor_id = doctors.id " +
      "WHERE cases.doctor_id = ? " +
      "ORDER BY created_at DESC"
    ).all(doctorId);

    let paymentQuery = "SELECT * FROM payments WHERE doctor_id = ?";
    const paymentParams: any[] = [doctorId];
    if (startDate) {
      paymentQuery += " AND payment_date >= ?";
      paymentParams.push(startDate);
    }
    if (endDate) {
      paymentQuery += " AND payment_date <= ?";
      paymentParams.push(endDate);
    }
    paymentQuery += " ORDER BY payment_date DESC";
    const payments = db.prepare(paymentQuery).all(...paymentParams);

    const totalInvoiced = db.prepare("SELECT SUM(amount) as total FROM invoices WHERE doctor_id = ?").get(doctorId) as { total: number };
    const totalPaid = db.prepare("SELECT SUM(amount) as total FROM payments WHERE doctor_id = ?").get(doctorId) as { total: number };

    res.json({
      cases,
      payments,
      balance: {
        total_invoiced: totalInvoiced.total || 0,
        total_paid: totalPaid.total || 0,
        outstanding_balance: (totalInvoiced.total || 0) - (totalPaid.total || 0)
      }
    });
  });

  app.get("/api/reports/financial-summary", (req, res) => {
    const revenue = db.prepare("SELECT SUM(cost) as total FROM cases WHERE status != 'Returned'").get() as { total: number };
    const payments = db.prepare("SELECT SUM(amount) as total FROM payments").get() as { total: number };
    const expenses = db.prepare("SELECT SUM(amount) as total FROM expenses").get() as { total: number };
    
    res.json({
      total_revenue: revenue.total || 0,
      total_payments: payments.total || 0,
      total_expenses: expenses.total || 0,
      net_profit: (revenue.total || 0) - (expenses.total || 0)
    });
  });

  app.put("/api/invoices/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE invoices SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/doctors/:id/cases", (req, res) => {
    const uninvoiced = req.query.uninvoiced === 'true';
    let query = `
      SELECT cases.*, doctors.name as doctor_name 
      FROM cases 
      LEFT JOIN doctors ON cases.doctor_id = doctors.id 
      WHERE cases.doctor_id = ?
    `;
    
    if (uninvoiced) {
      query += ` AND cases.id NOT IN (SELECT case_id FROM invoice_items WHERE case_id IS NOT NULL)`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const cases = db.prepare(query).all(req.params.id);
    res.json(cases);
  });

  app.get("/api/reports/technician-stats", requireAuth, (req, res) => {
    const stats = db.prepare(`
      SELECT 
        technicians.id, 
        technicians.name, 
        technicians.specialization,
        COUNT(cases.id) as total_cases,
        SUM(CASE WHEN cases.status IN ('Completed', 'Delivered') THEN 1 ELSE 0 END) as completed_cases,
        SUM(CASE WHEN cases.status NOT IN ('Completed', 'Delivered') THEN 1 ELSE 0 END) as active_cases
      FROM technicians
      LEFT JOIN cases ON technicians.id = cases.technician_id
      GROUP BY technicians.id
      ORDER BY total_cases DESC
    `).all();
    res.json(stats);
  });

  app.get("/api/reports/doctor-stats", (req, res) => {
    const stats = db.prepare(
      "SELECT " +
      "doctors.id, " +
      "doctors.name, " +
      "doctors.clinic_name, " +
      "COUNT(cases.id) as total_cases, " +
      "SUM(CASE WHEN cases.status = 'Completed' OR cases.status = 'Delivered' THEN 1 ELSE 0 END) as completed_cases, " +
      "SUM(CASE WHEN cases.status = 'Pending' OR cases.status = 'In Progress' OR cases.status = 'Trial' THEN 1 ELSE 0 END) as active_cases " +
      "FROM doctors " +
      "LEFT JOIN cases ON doctors.id = cases.doctor_id " +
      "GROUP BY doctors.id " +
      "ORDER BY total_cases DESC"
    ).all();
    res.json(stats);
  });

  app.get("/api/reports/doctor-ledger/:id", (req, res) => {
    const doctorId = req.params.id;
    const cases = db.prepare(`
      SELECT 
        COUNT(*) as total_cases,
        SUM(CASE WHEN status = 'Pending' OR status = 'In Progress' THEN 1 ELSE 0 END) as pending_cases,
        SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as delivered_cases,
        SUM(cost) as total_bill
      FROM cases 
      WHERE doctor_id = ?
    `).get(doctorId) as any;

    const payments = db.prepare("SELECT SUM(amount) as total FROM payments WHERE doctor_id = ?").get(doctorId) as { total: number };

    res.json({
      ...cases,
      total_paid: payments.total || 0,
      outstanding_balance: (cases.total_bill || 0) - (payments.total || 0)
    });
  });

  app.get("/api/reports/daily-stats", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM cases
      WHERE created_at >= date('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();
    res.json(stats);
  });

  app.get("/api/reports/type-stats", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        case_type,
        COUNT(*) as count
      FROM cases
      GROUP BY case_type
      ORDER BY count DESC
    `).all();
    res.json(stats);
  });

  // Settings, Users, Rate List, Shades Endpoints
  app.get("/api/users", requireAdmin, (req, res) => {
    const users = db.prepare(`
      SELECT users.id, users.username, users.role, users.created_at, users.doctor_id, doctors.name as doctor_name 
      FROM users 
      LEFT JOIN doctors ON users.doctor_id = doctors.id
    `).all();
    res.json(users);
  });

  app.post("/api/users", requireAdmin, (req, res) => {
    const { username, password, role } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const info = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, hashedPassword, role);
      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/rate-list", requireAuth, (req, res) => {
    const rates = db.prepare("SELECT * FROM rate_list ORDER BY case_type ASC").all();
    res.json(rates);
  });

  app.post("/api/rate-list", requireManager, (req, res) => {
    const { case_type, material, price } = req.body;
    const info = db.prepare("INSERT INTO rate_list (case_type, material, price) VALUES (?, ?, ?)").run(case_type, material, price);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/rate-list/:id", requireManager, (req, res) => {
    db.prepare("DELETE FROM rate_list WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/shades", requireAuth, (req, res) => {
    const shades = db.prepare("SELECT * FROM shades ORDER BY name ASC").all();
    res.json(shades);
  });

  app.post("/api/shades", requireManager, (req, res) => {
    const { name } = req.body;
    try {
      const info = db.prepare("INSERT INTO shades (name) VALUES (?)").run(name);
      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      res.status(400).json({ error: "Shade already exists" });
    }
  });

  app.delete("/api/shades/:id", requireManager, (req, res) => {
    db.prepare("DELETE FROM shades WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/settings", requireAuth, (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", requireAdmin, (req, res) => {
    const settings = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    const transaction = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        stmt.run(key, String(value));
      }
    });
    transaction(settings);
    res.json({ success: true });
  });

  app.get("/api/backup", requireAdmin, (req, res) => {
    const tables = ['doctors', 'technicians', 'cases', 'payments', 'expenses', 'inventory', 'case_history', 'users', 'rate_list', 'shades', 'settings', 'invoices', 'invoice_items', 'case_tasks'];
    const backup: any = {};
    for (const table of tables) {
      backup[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }
    res.json(backup);
  });

  app.post("/api/restore", requireAdmin, (req, res) => {
    const backup = req.body;
    try {
      const transaction = db.transaction((data) => {
        for (const [table, rows] of Object.entries(data)) {
          db.prepare(`DELETE FROM ${table}`).run();
          if (Array.isArray(rows) && rows.length > 0) {
            const columns = Object.keys(rows[0]);
            const placeholders = columns.map(() => '?').join(',');
            const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`);
            for (const row of rows as any[]) {
              stmt.run(Object.values(row));
            }
          }
        }
      });
      transaction(backup);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Restore failed" });
    }
  });

  // Invoices Endpoints
  app.get("/api/invoices", requireAuth, (req, res) => {
    const { status, doctor_id, startDate, endDate, invoice_no, sortBy, sortOrder } = req.query;
    let query = `
      SELECT 
        invoices.*, 
        doctors.name as doctor_name,
        doctors.email as doctor_email,
        doctors.phone as doctor_phone,
        (SELECT SUM(amount) FROM invoice_items WHERE invoice_id = invoices.id) as calculated_amount,
        (SELECT SUM(amount) FROM payments WHERE invoice_id = invoices.id) as total_paid
      FROM invoices 
      LEFT JOIN doctors ON invoices.doctor_id = doctors.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'All') {
      query += " AND invoices.status = ?";
      params.push(status);
    }
    if (doctor_id && doctor_id !== 'All') {
      query += " AND invoices.doctor_id = ?";
      params.push(doctor_id);
    }
    if (startDate) {
      query += " AND DATE(invoices.invoice_date) >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND DATE(invoices.invoice_date) <= ?";
      params.push(endDate);
    }
    if (invoice_no) {
      query += " AND invoices.invoice_no LIKE ?";
      params.push(`%${invoice_no}%`);
    }

    const validSortFields = ['invoice_date', 'invoice_no', 'amount', 'due_date', 'created_at'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY invoices.${sortField} ${order}`;
    
    const invoices = db.prepare(query).all(...params);
    // Use calculated_amount if available, otherwise fallback to amount column
    const processedInvoices = invoices.map((inv: any) => ({
      ...inv,
      amount: inv.calculated_amount !== null ? inv.calculated_amount : inv.amount,
      total_paid: inv.total_paid || 0
    }));
    res.json(processedInvoices);
  });

  app.get("/api/invoices/:id", requireAuth, (req, res) => {
    const invoice = db.prepare(`
      SELECT 
        invoices.*, 
        doctors.name as doctor_name, 
        doctors.clinic_name, 
        doctors.address, 
        doctors.phone,
        (SELECT SUM(amount) FROM invoice_items WHERE invoice_id = invoices.id) as calculated_amount
      FROM invoices 
      LEFT JOIN doctors ON invoices.doctor_id = doctors.id 
      WHERE invoices.id = ?
    `).get(req.params.id) as any;
    
    if (invoice) {
      const items = db.prepare(`
        SELECT invoice_items.*, cases.patient_name, cases.case_type
        FROM invoice_items 
        LEFT JOIN cases ON invoice_items.case_id = cases.id
        WHERE invoice_id = ?
      `).all(req.params.id);
      
      res.json({ 
        ...invoice, 
        amount: invoice.calculated_amount !== null ? invoice.calculated_amount : invoice.amount,
        items 
      });
    } else {
      res.status(404).json({ error: "Invoice not found" });
    }
  });

  app.post("/api/invoices", requireManager, (req, res) => {
    const { doctor_id, invoice_date, due_date, items } = req.body;
    
    try {
      const result = db.transaction(() => {
        // Get next invoice number
        const nextNo = (db.prepare("SELECT COALESCE(MAX(invoice_no), 0) + 1 as nextNo FROM invoices").get() as any).nextNo;
        
        // Calculate total amount from items
        const amount = items.reduce((acc: number, item: any) => acc + (item.amount || 0), 0);

        const info = db.prepare(`
          INSERT INTO invoices (doctor_id, invoice_no, invoice_date, amount, due_date) 
          VALUES (?, ?, ?, ?, ?)
        `).run(doctor_id, nextNo, invoice_date, amount, due_date);
        
        const invoice_id = info.lastInsertRowid;
        
        const stmt = db.prepare(`
          INSERT INTO invoice_items (invoice_id, case_id, description, amount) 
          VALUES (?, ?, ?, ?)
        `);
        
        for (const item of items) {
          stmt.run(invoice_id, item.case_id, item.description, item.amount);
        }
        
        return { id: invoice_id, invoice_no: nextNo };
      })();
      
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.put("/api/invoices/:id/status", requireManager, (req, res) => {
    const { status } = req.body;
    try {
      db.prepare("UPDATE invoices SET status = ? WHERE id = ?").run(status, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.post("/api/invoices/bulk-status", requireManager, (req, res) => {
    const { ids, status } = req.body;
    try {
      const transaction = db.transaction((ids, status) => {
        const stmt = db.prepare("UPDATE invoices SET status = ? WHERE id = ?");
        for (const id of ids) {
          stmt.run(status, id);
        }
      });
      transaction(ids, status);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Bulk status update failed" });
    }
  });

  app.post("/api/invoices/bulk-remind", requireManager, (req, res) => {
    const { ids } = req.body;
    try {
      const transaction = db.transaction((ids) => {
        const stmt = db.prepare("UPDATE invoices SET last_reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ?");
        for (const id of ids) {
          stmt.run(id);
        }
      });
      transaction(ids);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Bulk remind failed" });
    }
  });

  // Case Tasks Endpoints
  app.get("/api/cases/:id/tasks", (req, res) => {
    const tasks = db.prepare(`
      SELECT case_tasks.*, technicians.name as technician_name 
      FROM case_tasks 
      LEFT JOIN technicians ON case_tasks.technician_id = technicians.id 
      WHERE case_id = ?
      ORDER BY created_at ASC
    `).all(req.params.id);
    res.json(tasks);
  });

  app.post("/api/cases/:id/tasks", (req, res) => {
    const { task_name, technician_id } = req.body;
    const info = db.prepare(`
      INSERT INTO case_tasks (case_id, task_name, technician_id) 
      VALUES (?, ?, ?)
    `).run(req.params.id, task_name, technician_id);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/tasks/:id", (req, res) => {
    const { status } = req.body;
    const completed_at = status === 'Completed' ? new Date().toISOString() : null;
    db.prepare("UPDATE case_tasks SET status = ?, completed_at = ? WHERE id = ?")
      .run(status, completed_at, req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
  });
}

startServer();
