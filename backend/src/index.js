const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const port = 3000;

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

// ── ARTIKEL ──────────────────────────────────────────────────────────────────
app.get('/api/artikel', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM artikel ORDER BY artikel_id');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching artikel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CHECKOUT ──────────────────────────────────────────────────────────────────
app.post('/api/checkout', async (req, res) => {
  const { name, lieferadresse, cart } = req.body;
  
  if (!name || !lieferadresse) {
    return res.status(400).json({ error: 'Name und Lieferadresse sind erforderlich' });
  }

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Warenkorb ist leer' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // 1. Kunde anlegen oder updaten (Wir machen es hier einfach und legen einen an,
      // oder suchen nach dem Namen. Um Redundanz zu vermeiden, suchen wir nach dem Namen)
      let kundeId;
      const [existingKunden] = await connection.query(
        'SELECT kunde_id FROM kunden WHERE name = ? LIMIT 1',
        [name]
      );

      if (existingKunden.length > 0) {
        kundeId = existingKunden[0].kunde_id;
        // Optional: Lieferadresse updaten
        await connection.query(
          'UPDATE kunden SET lieferadresse = ? WHERE kunde_id = ?',
          [lieferadresse, kundeId]
        );
      } else {
        const [result] = await connection.query(
          'INSERT INTO kunden (name, lieferadresse) VALUES (?, ?)',
          [name, lieferadresse]
        );
        kundeId = result.insertId;
      }

      // 2. Bestellungen einfügen. Da es kein Mengen-Feld gibt, fügen wir für
      // jeden Artikel pro Menge eine eigene Zeile ein.
      for (const item of cart) {
        // Prüfen, ob Artikel existiert
        const [artikelRows] = await connection.query(
          'SELECT artikel_id FROM artikel WHERE artikel_id = ?',
          [item.id]
        );
        if (artikelRows.length === 0) {
          throw new Error(`Artikel mit ID ${item.id} nicht gefunden`);
        }

        const quantity = item.quantity || 1;
        for (let i = 0; i < quantity; i++) {
          await connection.query(
            'INSERT INTO bestellungen (fk_kunde_id, fk_artikel_id) VALUES (?, ?)',
            [kundeId, item.id]
          );
        }
      }

      await connection.commit();
      res.json({ message: 'Einkauf erfolgreich! Vielen Dank für deine Bestellung.' });
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
