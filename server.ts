import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || 'workspace.db';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

const dbDirectory = path.dirname(DB_PATH);
if (dbDirectory && dbDirectory !== '.') {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

// Initialize SQLite database
const db = new Database(DB_PATH, { verbose: console.log });

db.pragma('foreign_keys = ON');

function hashPassword(password: string, salt?: string): string {
  const passwordSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, passwordSalt, 100000, 64, 'sha512').toString('hex');
  return `${passwordSalt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, existingHash] = storedHash.split(':');
  if (!salt || !existingHash) return false;
  const computedHash = hashPassword(password, salt).split(':')[1];
  return crypto.timingSafeEqual(Buffer.from(existingHash, 'hex'), Buffer.from(computedHash, 'hex'));
}

function createToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * 1. Database Schema Setup
 * We create the Employees and Tasks tables as required by the university project.
 * 'Employees' stores staff details.
 * 'Tasks' stores work items assigned to employees via a foreign key.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    assigned_employee_id INTEGER,
    FOREIGN KEY (assigned_employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('Income', 'Expense')),
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT (date('now')),
    assigned_employee_id INTEGER,
    FOREIGN KEY (assigned_employee_id) REFERENCES employees(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Seed initial data if tables are empty
const employeeCount = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number };
if (employeeCount.count === 0) {
  const insertEmployee = db.prepare('INSERT INTO employees (name, role, department) VALUES (?, ?, ?)');
  insertEmployee.run('Jane Doe', 'Super Administrator', 'Management');
  insertEmployee.run('John Smith', 'Senior Developer', 'Engineering');
  insertEmployee.run('Alice Johnson', 'UI Designer', 'Design');

  const insertTask = db.prepare('INSERT INTO tasks (description, status, assigned_employee_id) VALUES (?, ?, ?)');
  insertTask.run('Review Q1 Management Report', 'Pending', 1);
  insertTask.run('Implement Dark Mode toggle', 'Completed', 2);
  insertTask.run('Update Design System documentation', 'Pending', 3);

  const insertTransaction = db.prepare('INSERT INTO transactions (type, amount, description, assigned_employee_id) VALUES (?, ?, ?, ?)');
  insertTransaction.run('Income', 5000, 'Project Milestone Payment', 1);
  insertTransaction.run('Income', 3200, 'Service Fee', 2);
  insertTransaction.run('Expense', 1200, 'Cloud Infrastructure', 2);
  insertTransaction.run('Expense', 450, 'Office Supplies', 3);
  insertTransaction.run('Income', 7500, 'Enterprise Contract', 1);
}

const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL) as { id: number } | undefined;
if (!adminExists) {
  const passwordHash = hashPassword(ADMIN_PASSWORD);
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run('Administrator', ADMIN_EMAIL, passwordHash, 'admin');
  console.log(`Created default admin user: ${ADMIN_EMAIL}`);
}

async function startServer() {
  const app = express();

  // Middleware to parse JSON bodies
  app.use(express.json());

  const requireAuth: express.RequestHandler = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.slice('Bearer '.length);
    const session = db.prepare(`
      SELECT sessions.user_id as userId, users.email as email, users.name as name, users.role as role
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token = ? AND datetime(sessions.expires_at) > datetime('now')
    `).get(token) as { userId: number; email: string; name: string; role: string } | undefined;

    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    (req as express.Request & { user?: typeof session }).user = session;
    next();
  };

  /**
   * 2. API Endpoints (CRUD operations)
   * 
   * COMMUNICATION EXPLAINED:
   * These endpoints are the "bridge" between the Frontend and the Database.
   * When the Frontend calls fetch('/api/employees'), Express receives the request,
   * queries the SQLite database using better-sqlite3, and sends the result back as JSON.
   */

  // --- Auth API ---
  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const user = db.prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ?')
      .get(email) as { id: number; name: string; email: string; role: string; password_hash: string } | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const token = createToken();
    const sessionExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24h
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
      .run(token, user.id, sessionExpiry);

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      expiresAt: sessionExpiry,
    });
  });

  // Quick access login for demos/assignments (no password required).
  app.post('/api/quick-login', (_req, res) => {
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?')
      .get(ADMIN_EMAIL) as { id: number; name: string; email: string; role: string } | undefined;

    if (!user) {
      res.status(500).json({ success: false, error: 'Default admin user not found' });
      return;
    }

    const token = createToken();
    const sessionExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24h
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
      .run(token, user.id, sessionExpiry);

    res.json({
      success: true,
      token,
      user,
      expiresAt: sessionExpiry,
    });
  });

  app.post('/api/logout', requireAuth, (req, res) => {
    const authHeader = req.headers.authorization!;
    const token = authHeader.slice('Bearer '.length);
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.status(204).send();
  });

  // --- Employees API ---

  // Get all employees
  app.get('/api/employees', requireAuth, (req, res) => {
    try {
      const employees = db.prepare('SELECT * FROM employees').all();
      res.json(employees);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Add new employee
  app.post('/api/employees', requireAuth, (req, res) => {
    const { name, role, department } = req.body;
    try {
      const info = db.prepare('INSERT INTO employees (name, role, department) VALUES (?, ?, ?)').run(name, role, department);
      res.status(201).json({ id: info.lastInsertRowid, name, role, department });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Edit employee
  app.put('/api/employees/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { name, role, department } = req.body;
    try {
      db.prepare('UPDATE employees SET name = ?, role = ?, department = ? WHERE id = ?').run(name, role, department, id);
      res.json({ id, name, role, department });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Delete employee
  app.delete('/api/employees/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM employees WHERE id = ?').run(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Tasks API ---

  // Get all tasks (including employee names)
  app.get('/api/tasks', requireAuth, (req, res) => {
    try {
      const tasks = db.prepare(`
        SELECT tasks.*, employees.name as employee_name 
        FROM tasks 
        LEFT JOIN employees ON tasks.assigned_employee_id = employees.id
      `).all();
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Add new task
  app.post('/api/tasks', requireAuth, (req, res) => {
    const { description, assigned_employee_id } = req.body;
    try {
      const info = db.prepare('INSERT INTO tasks (description, assigned_employee_id) VALUES (?, ?)').run(description, assigned_employee_id);
      res.status(201).json({ id: info.lastInsertRowid, description, status: 'Pending', assigned_employee_id });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Update task status
  app.patch('/api/tasks/:id/status', requireAuth, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, id);
      res.json({ id, status });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Financials API ---

  // Get all transactions
  app.get('/api/transactions', requireAuth, (req, res) => {
    try {
      const transactions = db.prepare(`
        SELECT transactions.*, employees.name as employee_name 
        FROM transactions 
        LEFT JOIN employees ON transactions.assigned_employee_id = employees.id
        ORDER BY date DESC
      `).all();
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Add new transaction
  app.post('/api/transactions', requireAuth, (req, res) => {
    const { type, amount, description, assigned_employee_id } = req.body as {
      type?: string;
      amount?: number;
      description?: string;
      assigned_employee_id?: number | null;
    };

    if (type !== 'Income' && type !== 'Expense') {
      res.status(400).json({ error: 'Invalid transaction type' });
      return;
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number' });
      return;
    }

    if (!description || !description.trim()) {
      res.status(400).json({ error: 'Description is required' });
      return;
    }

    try {
      const employeeId = assigned_employee_id ?? null;
      const info = db.prepare(`
        INSERT INTO transactions (type, amount, description, assigned_employee_id)
        VALUES (?, ?, ?, ?)
      `).run(type, amount, description.trim(), employeeId);

      const created = db.prepare(`
        SELECT transactions.*, employees.name as employee_name
        FROM transactions
        LEFT JOIN employees ON transactions.assigned_employee_id = employees.id
        WHERE transactions.id = ?
      `).get(info.lastInsertRowid);

      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Delete transaction
  app.delete('/api/transactions/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Get financial summary
  app.get('/api/financials/summary', requireAuth, (req, res) => {
    try {
      const summary = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END) as totalRevenue,
          SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as totalExpenses
        FROM transactions
      `).get() as { totalRevenue: number, totalExpenses: number };
      
      const netProfit = (summary.totalRevenue || 0) - (summary.totalExpenses || 0);
      res.json({
        totalRevenue: summary.totalRevenue || 0,
        totalExpenses: summary.totalExpenses || 0,
        netProfit: netProfit
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Vite middleware setup for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
