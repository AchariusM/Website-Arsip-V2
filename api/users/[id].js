import { getPool, setCors } from '../_db.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { id } = req.query;
  const pool = getPool();

  try {
    if (req.method === 'PUT') {
      const { nama, email, role, status } = req.body;
      if (!nama || !email) return res.status(400).json({ error: 'Nama dan email wajib diisi' });

      const [dupe] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (dupe.length > 0) return res.status(409).json({ error: 'Email sudah digunakan' });

      await pool.query('UPDATE users SET nama = ?, email = ?, role = ?, status = ? WHERE id = ?', [nama, email, role, status, id]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
      if (rows[0] && rows[0].role === 'Admin') return res.status(403).json({ error: 'Akun Admin tidak dapat dihapus' });
      await pool.query('DELETE FROM users WHERE id = ?', [id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal terhubung ke database' });
  }
}
