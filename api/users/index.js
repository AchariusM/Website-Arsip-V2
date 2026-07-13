import { getPool, setCors } from '../_db.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const pool = getPool();

  try {
    if (req.method === 'GET') {
      const [rows] = await pool.query('SELECT id, nama, email, role, status, created_at FROM users ORDER BY id ASC');
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { nama, email, password, role, status } = req.body;
      if (!nama || !email || !password) return res.status(400).json({ error: 'Nama, email, dan kata sandi wajib diisi' });

      const [dupe] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (dupe.length > 0) return res.status(409).json({ error: 'Email sudah terdaftar' });

      const [result] = await pool.query(
        'INSERT INTO users (nama, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
        [nama, email, password, role || 'Pengurus', status || 'Aktif']
      );
      return res.status(201).json({ id: result.insertId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal terhubung ke database' });
  }
}
