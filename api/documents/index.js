import { getPool, setCors } from '../_db.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const pool = getPool();

  try {
    if (req.method === 'GET') {
      const [rows] = await pool.query('SELECT * FROM documents ORDER BY created_at DESC, id DESC');
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { judul, deskripsi, kategori, tanggal, uploaded_by, file_name, file_url, file_type, file_size } = req.body;
      if (!judul || !kategori || !tanggal) {
        return res.status(400).json({ error: 'Judul, kategori, dan tanggal wajib diisi' });
      }
      const [result] = await pool.query(
        `INSERT INTO documents (judul, deskripsi, kategori, tanggal, uploaded_by, file_name, file_url, file_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [judul, deskripsi || null, kategori, tanggal, uploaded_by || null, file_name || null, file_url || null, file_type || null, file_size || null]
      );
      return res.status(201).json({ id: result.insertId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal terhubung ke database' });
  }
}
