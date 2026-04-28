const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_change_me_in_prod';

app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'change_me_please',
  database: process.env.DB_NAME || 'appdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ── Auth Middleware ────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Kein Token angegeben' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Ungültiger oder abgelaufener Token' });
  }
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO app_users (username, password_hash) VALUES (?, ?)',
      [username, hash]
    );
    res.status(201).json({ message: 'Registrierung erfolgreich! Du kannst dich jetzt einloggen.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Benutzername bereits vergeben' });
    }
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
  }
  try {
    let [rows] = await pool.query(
      'SELECT * FROM app_users WHERE username = ?',
      [username]
    );
    let user = rows[0];
    let isNewUser = false;

    if (!user) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });
      }
      const hash = await bcrypt.hash(password, 12);
      const [result] = await pool.query(
        'INSERT INTO app_users (username, password_hash) VALUES (?, ?)',
        [username, hash]
      );
      user = { id: result.insertId, username, password_hash: hash };
      isNewUser = true;
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    // Log the attempt
    await pool.query(
      'INSERT INTO login_logs (user_id, username, success, ip_address) VALUES (?, ?, ?, ?)',
      [user.id, username, valid, ip]
    );

    if (!valid) {
      return res.status(401).json({ error: 'Falscher Benutzername oder Passwort' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      message: isNewUser ? `Konto erstellt! Willkommen, ${user.username}!` : `Willkommen zurück, ${user.username}!`,
      token,
      username: user.username
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ── ME (geschützter Endpoint) ─────────────────────────────────────────────────
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ username: req.user.username, id: req.user.id });
});

// ── LOGIN LOGS (geschützt) ────────────────────────────────────────────────────
app.get('/api/auth/logs', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT username, success, ip_address, logged_at FROM login_logs ORDER BY logged_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── BUY ───────────────────────────────────────────────────────────────────────
app.post('/api/buy/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [rows] = await connection.query(
        'SELECT stock FROM products WHERE id = ? FOR UPDATE',
        [productId]
      );
      if (rows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Product not found' });
      }
      const stock = rows[0].stock;
      if (stock <= 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Product out of stock' });
      }
      await connection.query('UPDATE products SET stock = stock - 1 WHERE id = ?', [productId]);
      await connection.commit();
      res.json({ message: 'Purchase successful', newStock: stock - 1 });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error during purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CHECKOUT ──────────────────────────────────────────────────────────────────
app.post('/api/checkout', async (req, res) => {
  const { cart } = req.body;
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Warenkorb ist leer' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      for (const item of cart) {
        const [rows] = await connection.query(
          'SELECT stock, name FROM products WHERE id = ? FOR UPDATE',
          [item.id]
        );
        if (rows.length === 0) {
          throw new Error(`Produkt mit ID ${item.id} nicht gefunden`);
        }
        if (rows[0].stock < item.quantity) {
          throw new Error(`Nicht genügend Bestand für ${rows[0].name}. (Verfügbar: ${rows[0].stock})`);
        }
      }

      for (const item of cart) {
        await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.id]
        );
      }

      await connection.commit();
      res.json({ message: 'Einkauf erfolgreich!' });
    } catch (err) {
      await connection.rollback();
      return res.status(400).json({ error: err.message });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Backend API listening at http://localhost:${port}`);
});
