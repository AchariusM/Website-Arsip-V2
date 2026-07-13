import { getPool, setCors } from '../_db.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { id } = req.query;
  const pool = getPool();

  try {
    if (req.method === 'PUT') {
      const { judul, deskripsi, kategori, tanggal } = req.body;
      if (!judul || !kategori) return res.status(400).json({ error: 'Judul dan kategori wajib diisi' });
      await pool.query(
        'UPDATE documents SET judul = ?, deskripsi = ?, kategori = ?, tanggal = ? WHERE id = ?',
        [judul, deskripsi || null, kategori, tanggal, id]
      );
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      await pool.query('DELETE FROM documents WHERE id = ?', [id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal terhubung ke database' });
  }
}
