import { getPool, setCors } from './_db.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email dan kata sandi wajib diisi' });

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, nama, email, role, status FROM users WHERE email = ? AND password = ? LIMIT 1',
      [email, password]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Email atau kata sandi salah' });
    if (rows[0].status === 'Nonaktif') return res.status(403).json({ error: 'Akun nonaktif' });

    res.status(200).json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal terhubung ke database' });
  }
}
